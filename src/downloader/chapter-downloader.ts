import * as fs from 'fs/promises';
import * as path from 'path';
import { LibbyChapter, DownloadProgress } from '../types';
import { BrowserManager } from '../browser/manager';
import { RateLimiter } from '../utils/rate-limiter';
import { logger } from '../utils/logger';
import { ensureDir, sanitizeFilename, formatBytes } from '../utils/fs';
import { simulateMouseMovement, simulateScrolling } from '../browser/stealth';

export class ChapterDownloader {
  private browserManager: BrowserManager;
  private rateLimiter: RateLimiter;

  constructor(browserManager: BrowserManager, rateLimiter: RateLimiter) {
    this.browserManager = browserManager;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Download all chapters for a book
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
        // Update progress
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

        // Download the chapter
        const filename = `${String(chapter.index + 1).padStart(3, '0')}-${sanitizeFilename(chapter.title)}.mp3`;
        const filepath = path.join(bookDir, filename);

        const response = await page.goto(chapter.url, {
          waitUntil: 'networkidle2',
          timeout: 60000,
        });

        if (!response) {
          throw new Error('No response from server');
        }

        const buffer = await response.buffer();
        await fs.writeFile(filepath, buffer);

        downloadedFiles.push(filepath);
        logger.success(`Chapter ${i + 1} downloaded: ${formatBytes(buffer.length)}`);

        // Wait before next chapter (rate limiting)
        if (i < chapters.length - 1) {
          await this.rateLimiter.waitForNextChapter();
        }
      } catch (error) {
        logger.error(`Failed to download chapter ${i + 1}: ${chapter.title}`, error);

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
