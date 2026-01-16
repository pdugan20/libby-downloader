import { promises as fs } from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { LibbyChapter, DownloadProgress } from '../types';
import { BrowserManager } from '../browser/manager';
import { RateLimiter } from '../utils/rate-limiter';
import { logger } from '../utils/logger';
import { ensureDir, sanitizeFilename, formatBytes } from '../utils/fs';
import { simulateMouseMovement, simulateScrolling } from '../browser/stealth';
import { retry } from '../utils/retry';
import { DownloadError, ErrorCode } from '../core/errors';

/**
 * Event emitted when chapter download starts
 */
export interface ChapterStartEvent {
  chapterIndex: number;
  chapterTitle: string;
  totalChapters: number;
}

/**
 * Event emitted when chapter download completes
 */
export interface ChapterCompleteEvent {
  chapterIndex: number;
  chapterTitle: string;
  filePath: string;
  fileSize: number;
}

/**
 * Event emitted when chapter download fails
 */
export interface ChapterErrorEvent {
  chapterIndex: number;
  chapterTitle: string;
  error: Error;
}

/**
 * Event emitted when rate limiter starts a break
 */
export interface BreakStartEvent {
  reason: string;
  durationMs: number;
}

/**
 * Event emitted when rate limiter ends a break
 */
export interface BreakEndEvent {
  reason: string;
}

export class ChapterDownloader extends EventEmitter {
  private browserManager: BrowserManager;
  private rateLimiter: RateLimiter;

  constructor(browserManager: BrowserManager, rateLimiter: RateLimiter) {
    super();
    this.browserManager = browserManager;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Download all chapters for a book
   * @deprecated Use event listeners instead of onProgress callback
   */
  async downloadChapters(
    chapters: LibbyChapter[],
    outputDir: string,
    bookTitle: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string[]> {
    const page = this.browserManager.getPage();
    const sanitizedTitle = sanitizeFilename(bookTitle);
    const bookDir = path.join(outputDir, sanitizedTitle);

    await ensureDir(bookDir);
    logger.info(`Downloading ${chapters.length} chapters to: ${bookDir}`);

    this.rateLimiter.resetChapterCounter();
    const downloadedFiles: string[] = [];

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];

      try {
        // Emit chapter:start event
        this.emit('chapter:start', {
          chapterIndex: i,
          chapterTitle: chapter.title,
          totalChapters: chapters.length,
        } as ChapterStartEvent);

        // Backward compatibility: Update progress via callback
        if (onProgress) {
          onProgress({
            bookId: '',
            bookTitle,
            totalChapters: chapters.length,
            downloadedChapters: i,
            currentChapter: chapter.title,
            status: 'downloading',
          });
        }

        logger.info(`Downloading chapter ${i + 1}/${chapters.length}: ${chapter.title}`);

        // Simulate user behavior before download
        if (this.rateLimiter.getConfig().mouseMovements) {
          await simulateMouseMovement(page);
        }

        if (this.rateLimiter.getConfig().randomScrolling && Math.random() > 0.7) {
          await simulateScrolling(page);
        }

        // Download the chapter with retry logic
        const filename = `${String(chapter.index + 1).padStart(3, '0')}-${sanitizeFilename(chapter.title)}.mp3`;
        const filepath = path.join(bookDir, filename);

        const buffer = await retry(
          async () => {
            const response = await page.goto(chapter.url, {
              waitUntil: 'networkidle2',
              timeout: 60000,
            });

            if (!response) {
              throw new DownloadError(
                'No response from server',
                ErrorCode.NETWORK_ERROR,
                '',
                chapter.index
              );
            }

            return await response.buffer();
          },
          {
            maxAttempts: 3,
            baseDelayMs: 2000,
            maxDelayMs: 10000,
          }
        );

        await fs.writeFile(filepath, buffer);

        downloadedFiles.push(filepath);
        logger.success(`Chapter ${i + 1} downloaded: ${formatBytes(buffer.length)}`);

        // Emit chapter:complete event
        this.emit('chapter:complete', {
          chapterIndex: i,
          chapterTitle: chapter.title,
          filePath: filepath,
          fileSize: buffer.length,
        } as ChapterCompleteEvent);

        // Wait before next chapter (rate limiting)
        if (i < chapters.length - 1) {
          // Check if we'll take a break
          const shouldBreak =
            this.rateLimiter.getConfig().occasionalBreak.enabled &&
            (this.rateLimiter.getStats().chaptersDownloaded + 1) %
              this.rateLimiter.getConfig().occasionalBreak.afterChapters ===
              0;

          if (shouldBreak) {
            const { min, max } = this.rateLimiter.getConfig().occasionalBreak.duration;
            const estimatedDuration = Math.floor((min + max) / 2);

            this.emit('break:start', {
              reason: 'Rate limiting - simulating human behavior',
              durationMs: estimatedDuration,
            } as BreakStartEvent);
          }

          await this.rateLimiter.waitForNextChapter();

          if (shouldBreak) {
            this.emit('break:end', {
              reason: 'Rate limiting - resuming downloads',
            } as BreakEndEvent);
          }
        }
      } catch (error) {
        logger.error(`Failed to download chapter ${i + 1}: ${chapter.title}`, error);

        // Emit chapter:error event
        this.emit('chapter:error', {
          chapterIndex: i,
          chapterTitle: chapter.title,
          error: error instanceof Error ? error : new Error(String(error)),
        } as ChapterErrorEvent);

        // Backward compatibility: Update progress via callback
        if (onProgress) {
          onProgress({
            bookId: '',
            bookTitle,
            totalChapters: chapters.length,
            downloadedChapters: i,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        throw error;
      }
    }

    // Backward compatibility: Final progress update
    if (onProgress) {
      onProgress({
        bookId: '',
        bookTitle,
        totalChapters: chapters.length,
        downloadedChapters: chapters.length,
        status: 'completed',
      });
    }

    logger.success(`All ${chapters.length} chapters downloaded successfully`);
    return downloadedFiles;
  }

  /**
   * Download a single chapter (useful for testing or retries)
   */
  async downloadChapter(chapter: LibbyChapter, outputPath: string): Promise<void> {
    const page = this.browserManager.getPage();

    logger.info(`Downloading chapter: ${chapter.title}`);

    const response = await page.goto(chapter.url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    if (!response) {
      throw new Error('No response from server');
    }

    const buffer = await response.buffer();
    await fs.writeFile(outputPath, buffer);

    logger.success(`Chapter downloaded: ${formatBytes(buffer.length)}`);
  }

  /**
   * Resume a partial download
   */
  async resumeDownload(
    chapters: LibbyChapter[],
    outputDir: string,
    bookTitle: string,
    existingFiles: string[],
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string[]> {
    // Determine which chapters still need to be downloaded
    const existingIndices = new Set(
      existingFiles.map((file) => {
        const match = file.match(/^(\d+)-/);
        return match ? parseInt(match[1], 10) - 1 : -1;
      })
    );

    const remainingChapters = chapters.filter((chapter) => !existingIndices.has(chapter.index));

    if (remainingChapters.length === 0) {
      logger.info('All chapters already downloaded');
      return existingFiles;
    }

    logger.info(`Resuming download: ${remainingChapters.length} chapters remaining`);

    const newFiles = await this.downloadChapters(
      remainingChapters,
      outputDir,
      bookTitle,
      onProgress
    );

    return [...existingFiles, ...newFiles];
  }
}
