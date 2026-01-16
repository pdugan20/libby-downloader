import * as path from 'path';
import { promises as fs } from 'fs';
import { BrowserManager } from '../browser/manager';
import { LibbyAuth } from '../auth/libby-auth';
import { LibbyAPI } from '../downloader/libby-api';
import { ChapterDownloader } from '../downloader/chapter-downloader';
import { FFmpegProcessor } from '../processor/ffmpeg-processor';
import { MetadataEmbedder } from '../metadata/embedder';
import { RateLimiter } from '../utils/rate-limiter';
import { logger } from '../utils/logger';
import { ensureDir, sanitizeFilename } from '../utils/fs';
import { LibbyBook, LibbyChapter, DownloadProgress } from '../types';
import { AuthenticationError, FFmpegError, ExtractionError, wrapError, ErrorCode } from './errors';
import { getStateManager, DownloadState } from './state-manager';

export interface DownloadOptions {
  bookId: string;
  outputDir: string;
  mode: 'safe' | 'balanced' | 'aggressive';
  merge: boolean;
  metadata: boolean;
  headless: boolean;
  resume?: boolean;
  onProgress?: (progress: DownloadProgress) => void;
}

export interface DownloadResult {
  success: boolean;
  book: LibbyBook;
  chapters: LibbyChapter[];
  outputPath: string;
  downloadedFiles: string[];
  error?: Error;
}

/**
 * Orchestrates the complete audiobook download process
 *
 * This class manages the end-to-end flow:
 * 1. Authentication validation
 * 2. Book metadata extraction
 * 3. Chapter download with rate limiting
 * 4. Audio processing (merge, chapters, metadata)
 *
 * Can be used programmatically or via CLI
 */
export class DownloadOrchestrator {
  private browserManager: BrowserManager;
  private auth: LibbyAuth;
  private api: LibbyAPI;
  private downloader: ChapterDownloader;
  private processor: FFmpegProcessor;
  private embedder: MetadataEmbedder;
  private rateLimiter: RateLimiter;

  constructor(
    browserManager: BrowserManager,
    auth: LibbyAuth,
    api: LibbyAPI,
    downloader: ChapterDownloader,
    processor: FFmpegProcessor,
    embedder: MetadataEmbedder,
    rateLimiter: RateLimiter
  ) {
    this.browserManager = browserManager;
    this.auth = auth;
    this.api = api;
    this.downloader = downloader;
    this.processor = processor;
    this.embedder = embedder;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Download a complete audiobook
   */
  async downloadBook(options: DownloadOptions): Promise<DownloadResult> {
    const { bookId, outputDir, merge, metadata: embedMetadata, resume, onProgress } = options;
    const stateManager = getStateManager();

    try {
      // Check for existing state if resume is requested
      if (resume) {
        const existingState = await stateManager.loadState(bookId);
        if (existingState) {
          logger.info(
            `Resuming download: ${existingState.downloadedChapters.length}/${existingState.totalChapters} chapters complete`
          );
        }
      }

      // Show risk warning
      this.rateLimiter.showRiskWarning();

      // Validate authentication
      await this.validateAuthentication();

      // Validate FFmpeg if merging is requested
      if (merge) {
        await this.validateFFmpeg();
      }

      // Extract book metadata
      const bookMetadata = await this.extractBookMetadata(bookId);

      // Extract chapters
      const chapters = await this.extractChapters();

      // Initialize download state
      const downloadState: DownloadState = {
        bookId,
        bookTitle: bookMetadata.title,
        totalChapters: chapters.length,
        downloadedChapters: [],
        outputDir,
        mode: options.mode,
        merge,
        metadata: embedMetadata,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };
      await stateManager.saveState(downloadState);

      // Download cover art
      const coverPath = await this.downloadCover(bookMetadata, outputDir);

      // Download all chapters
      const downloadedFiles = await this.downloadChapters(
        chapters,
        outputDir,
        bookMetadata.title,
        onProgress
      );

      // Process audio files
      let finalOutputPath = path.join(outputDir, sanitizeFilename(bookMetadata.title));

      if (merge && downloadedFiles.length > 1) {
        finalOutputPath = await this.processAudioFiles(
          downloadedFiles,
          outputDir,
          bookMetadata,
          chapters,
          coverPath,
          embedMetadata
        );
      }

      // Increment book counter for rate limiting
      this.rateLimiter.incrementBookCounter();

      // Delete state on successful completion
      await stateManager.deleteState(bookId);

      return {
        success: true,
        book: bookMetadata,
        chapters,
        outputPath: finalOutputPath,
        downloadedFiles,
      };
    } catch (error) {
      logger.error('Download failed', error);
      return {
        success: false,
        book: {} as LibbyBook,
        chapters: [],
        outputPath: '',
        downloadedFiles: [],
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Validate user is authenticated
   */
  private async validateAuthentication(): Promise<void> {
    const isLoggedIn = await this.auth.isLoggedIn();
    if (!isLoggedIn) {
      throw new AuthenticationError('Not logged in');
    }
  }

  /**
   * Validate FFmpeg is installed
   */
  private async validateFFmpeg(): Promise<void> {
    const hasFFmpeg = await this.processor.checkFFmpeg();
    if (!hasFFmpeg) {
      throw new FFmpegError('FFmpeg is required for merging chapters');
    }
  }

  /**
   * Extract book metadata from Libby
   */
  private async extractBookMetadata(bookId: string): Promise<LibbyBook> {
    try {
      logger.info('Opening book');
      await this.api.openBook(bookId);
      logger.success('Book opened');

      logger.info('Extracting metadata');
      const bookMetadata = await this.api.getBookMetadata();

      if (!bookMetadata) {
        throw new ExtractionError(
          'Failed to extract book metadata',
          ErrorCode.METADATA_EXTRACTION_FAILED
        );
      }

      logger.success(`Found: ${bookMetadata.title}`);
      return bookMetadata;
    } catch (error) {
      throw wrapError(error, 'Extract book metadata');
    }
  }

  /**
   * Extract chapter information
   */
  private async extractChapters(): Promise<LibbyChapter[]> {
    try {
      logger.info('Extracting chapters');
      const chapters = await this.api.getChapters();

      if (chapters.length === 0) {
        throw new ExtractionError('No chapters found', ErrorCode.NO_CHAPTERS_FOUND);
      }

      logger.success(`Found ${chapters.length} chapters`);
      return chapters;
    } catch (error) {
      throw wrapError(error, 'Extract chapters');
    }
  }

  /**
   * Download cover art
   */
  private async downloadCover(
    bookMetadata: LibbyBook,
    outputDir: string
  ): Promise<string | undefined> {
    if (!bookMetadata.coverUrl) {
      return undefined;
    }

    try {
      logger.info('Downloading cover art');
      const coverBuffer = await this.api.downloadCover(bookMetadata.coverUrl);

      if (!coverBuffer) {
        logger.warn('Failed to download cover art');
        return undefined;
      }

      const bookOutputDir = path.join(outputDir, sanitizeFilename(bookMetadata.title));
      await ensureDir(bookOutputDir);

      const coverPath = path.join(bookOutputDir, 'cover.jpg');
      await fs.writeFile(coverPath, coverBuffer);

      logger.success('Cover art downloaded');
      return coverPath;
    } catch (error) {
      logger.warn('Failed to download cover art', error);
      return undefined;
    }
  }

  /**
   * Download all chapters sequentially
   */
  private async downloadChapters(
    chapters: LibbyChapter[],
    outputDir: string,
    bookTitle: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string[]> {
    logger.info('Downloading chapters');

    const downloadedFiles = await this.downloader.downloadChapters(
      chapters,
      outputDir,
      bookTitle,
      onProgress
    );

    return downloadedFiles;
  }

  /**
   * Process audio files (merge, chapters, metadata)
   */
  private async processAudioFiles(
    downloadedFiles: string[],
    outputDir: string,
    bookMetadata: LibbyBook,
    chapters: LibbyChapter[],
    coverPath: string | undefined,
    embedMetadata: boolean
  ): Promise<string> {
    const sanitizedTitle = sanitizeFilename(bookMetadata.title);
    const bookOutputDir = path.join(outputDir, sanitizedTitle);
    const mergedPath = path.join(bookOutputDir, `${sanitizedTitle}.mp3`);

    // Merge chapters
    logger.info('Merging chapters');
    await this.processor.mergeChapters(downloadedFiles, mergedPath, {
      title: bookMetadata.title,
      artist: bookMetadata.authors.join(', '),
      album: bookMetadata.title,
      genre: 'Audiobook',
    });
    logger.success('Chapters merged');

    // Add chapter markers
    if (chapters.length > 1) {
      logger.info('Adding chapter markers');
      const tempPath = mergedPath + '.temp.mp3';
      await this.processor.addChapterMarkers(mergedPath, tempPath, chapters);
      await fs.unlink(mergedPath);
      await fs.rename(tempPath, mergedPath);
      logger.success('Chapter markers added');
    }

    // Embed metadata
    if (embedMetadata && coverPath) {
      logger.info('Embedding metadata');
      await this.embedder.embedMetadata(mergedPath, {
        title: bookMetadata.title,
        artist: bookMetadata.authors.join(', '),
        album: bookMetadata.title,
        genre: 'Audiobook',
        comment: bookMetadata.description,
        image: coverPath,
      });
      logger.success('Metadata embedded');
    }

    return mergedPath;
  }

  /**
   * Factory method to create orchestrator with default dependencies
   */
  static async create(
    mode: 'safe' | 'balanced' | 'aggressive' = 'balanced',
    headless: boolean = false
  ): Promise<DownloadOrchestrator> {
    const browserManager = new BrowserManager({ headless });
    await browserManager.launch();

    const auth = new LibbyAuth(browserManager);
    const api = new LibbyAPI(browserManager);
    const rateLimiter = new RateLimiter(mode);
    const downloader = new ChapterDownloader(browserManager, rateLimiter);
    const processor = new FFmpegProcessor();
    const embedder = new MetadataEmbedder();

    return new DownloadOrchestrator(
      browserManager,
      auth,
      api,
      downloader,
      processor,
      embedder,
      rateLimiter
    );
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.browserManager.close();
  }
}
