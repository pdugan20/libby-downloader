/**
 * Download Service for Libby Downloader
 * Handles chapter downloads using Chrome downloads API
 */

import type { Chapter } from '../types/extension-book';
import { DownloadError } from '../types/errors';
import { Timeouts } from '../types/messages';
import { logger } from '../shared/logger';
import { sanitizeFilename } from '../shared/validators';

export interface ChapterDownloadResult {
  downloadId: number;
  filepath: string;
  chapterIndex: number;
}

export interface DownloadAllResult {
  completed: number;
  failed: number;
  total: number;
  downloadIds: number[];
  errors: Array<{
    chapterIndex: number;
    error: string;
  }>;
}

export class DownloadService {
  /**
   * Download a single chapter using Chrome downloads API
   * @param chapter - The chapter to download
   * @param bookTitle - Book title for folder organization
   * @param index - Zero-based chapter index for filename
   * @returns Download result with ID, filepath, and chapter index
   * @throws {Error} If download fails or times out
   * @example
   * ```typescript
   * const service = new DownloadService();
   * const result = await service.downloadChapter(
   *   { index: 0, title: 'Chapter 1', url: 'https://...', duration: 1800 },
   *   'My Book',
   *   0
   * );
   * console.log(result.filepath); // "~/Downloads/libby-downloads/My Book/chapter-001.mp3"
   * ```
   */
  async downloadChapter(
    chapter: Chapter,
    bookTitle: string,
    index: number
  ): Promise<ChapterDownloadResult> {
    const chapterNum = String(index + 1).padStart(3, '0');
    const filename = `libby-downloads/${sanitizeFilename(bookTitle)}/chapter-${chapterNum}.mp3`;

    logger.operationStart(`Download chapter ${index + 1}`, {
      title: chapter.title,
      filename,
    });

    const downloadId = await chrome.downloads.download({
      url: chapter.url,
      filename: filename,
      saveAs: false,
    });

    // Wait for download to complete
    const filepath = await this.waitForDownload(downloadId);

    return {
      downloadId,
      filepath,
      chapterIndex: index,
    };
  }

  /**
   * Download all chapters sequentially with progress tracking and rate limiting
   * Downloads chapters one at a time with 500ms delays to avoid overwhelming the server.
   * Continues downloading even if individual chapters fail.
   * @param chapters - Array of chapters to download
   * @param bookTitle - Book title for folder organization
   * @param onProgress - Optional callback called after each chapter completes
   * @returns Summary of download results including completed, failed, and error details
   * @example
   * ```typescript
   * const service = new DownloadService();
   * const result = await service.downloadAllChapters(
   *   bookData.chapters,
   *   bookData.metadata.title,
   *   (completed, total) => console.log(`${completed}/${total} chapters`)
   * );
   * console.log(`Downloaded ${result.completed} of ${result.total} chapters`);
   * if (result.failed > 0) {
   *   console.error('Failed chapters:', result.errors);
   * }
   * ```
   */
  async downloadAllChapters(
    chapters: Chapter[],
    bookTitle: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<DownloadAllResult> {
    const results: DownloadAllResult = {
      completed: 0,
      failed: 0,
      total: chapters.length,
      downloadIds: [],
      errors: [],
    };

    for (let i = 0; i < chapters.length; i++) {
      try {
        const result = await this.downloadChapter(chapters[i], bookTitle, i);
        results.downloadIds.push(result.downloadId);
        results.completed++;

        logger.operationComplete(`Download chapter ${i + 1}/${chapters.length}`);

        // Call progress callback
        if (onProgress) {
          onProgress(results.completed, results.total);
        }

        // Delay between chapters to avoid rate limiting
        await this.sleep(Timeouts.DOWNLOAD_DELAY);
      } catch (error) {
        const downloadError = new DownloadError(
          `Failed to download chapter ${i + 1}`,
          i,
          error instanceof Error ? error : undefined
        );
        logger.operationFailed(`Download chapter ${i + 1}`, downloadError);
        results.failed++;
        results.errors.push({
          chapterIndex: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Wait for a download to complete
   */
  private waitForDownload(downloadId: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        const results = await chrome.downloads.search({ id: downloadId });

        if (results.length === 0) {
          clearInterval(checkInterval);
          reject(new Error('Download not found'));
          return;
        }

        const download = results[0];

        if (download.state === 'complete') {
          clearInterval(checkInterval);
          if (download.filename) {
            resolve(download.filename);
          } else {
            reject(new Error('Download completed but filename is undefined'));
          }
        }

        if (download.state === 'interrupted' || download.error) {
          clearInterval(checkInterval);
          reject(new Error(download.error || 'Download interrupted'));
        }
      }, 500);
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
