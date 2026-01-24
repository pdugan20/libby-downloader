/**
 * Download Service for Libby Downloader
 * Handles chapter downloads using Chrome downloads API
 */

import type { Chapter } from '../types/extension-book';
import { Timeouts } from '../types/messages';

/**
 * Sanitize filename to be filesystem-safe
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 200);
}

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
   * Download a single chapter
   */
  async downloadChapter(
    chapter: Chapter,
    bookTitle: string,
    index: number
  ): Promise<ChapterDownloadResult> {
    const chapterNum = String(index + 1).padStart(3, '0');
    const filename = `libby-downloads/${sanitizeFilename(bookTitle)}/chapter-${chapterNum}.mp3`;

    console.log(`[Download Service] Downloading chapter ${index + 1}: ${chapter.title}`);

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
   * Download all chapters sequentially with progress tracking
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

        console.log(`[Download Service] Chapter ${i + 1}/${chapters.length} complete`);

        // Call progress callback
        if (onProgress) {
          onProgress(results.completed, results.total);
        }

        // Delay between chapters to avoid rate limiting
        await this.sleep(Timeouts.DOWNLOAD_DELAY);
      } catch (error) {
        console.error(`[Download Service] Failed to download chapter ${i + 1}:`, error);
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
