/**
 * Download Service for Libby Downloader
 * Handles chapter downloads using Chrome downloads API
 */

import { Timeouts } from '../shared/message-types.js';
import { sanitizeFilename } from '../shared/validators.js';

export class DownloadService {
  /**
   * Download a single chapter
   * @param {object} chapter - Chapter data with url and title
   * @param {string} bookTitle - Book title for folder structure
   * @param {number} index - Chapter index (0-based)
   * @returns {Promise<object>} Download result with id and filepath
   */
  async downloadChapter(chapter, bookTitle, index) {
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
   * @param {Array} chapters - Array of chapter objects
   * @param {string} bookTitle - Book title
   * @param {function} onProgress - Progress callback (completed, total)
   * @returns {Promise<object>} Summary with completed/failed counts
   */
  async downloadAllChapters(chapters, bookTitle, onProgress) {
    const results = {
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
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Wait for a download to complete
   * @param {number} downloadId - Chrome download ID
   * @returns {Promise<string>} Filepath of completed download
   */
  waitForDownload(downloadId) {
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
          resolve(download.filename);
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
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
