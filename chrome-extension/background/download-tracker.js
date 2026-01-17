/**
 * Download Tracker for Libby Downloader
 * Tracks state of active downloads
 */

import { DownloadStatus } from '../shared/message-types.js';

export class DownloadTracker {
  constructor() {
    this.activeDownloads = new Map();
  }

  /**
   * Create a new download tracking entry
   * @param {object} bookData - Book metadata and chapters
   * @returns {string} Unique book ID
   */
  createDownload(bookData) {
    const bookId = `${Date.now()}`;
    const { metadata, chapters } = bookData;

    const downloadState = {
      bookId,
      metadata,
      totalChapters: chapters.length,
      completedChapters: 0,
      failedChapters: 0,
      downloadIds: [],
      startTime: Date.now(),
      status: DownloadStatus.DOWNLOADING,
    };

    this.activeDownloads.set(bookId, downloadState);

    console.log(`[Download Tracker] Created download: ${metadata.title} (ID: ${bookId})`);

    return bookId;
  }

  /**
   * Update download progress
   * @param {string} bookId - Book ID
   * @param {number} completed - Number of completed chapters
   * @param {number} failed - Number of failed chapters
   */
  updateProgress(bookId, completed, failed = 0) {
    const download = this.activeDownloads.get(bookId);
    if (!download) return;

    download.completedChapters = completed;
    download.failedChapters = failed;
  }

  /**
   * Mark download as complete
   * @param {string} bookId - Book ID
   * @param {object} result - Final download result
   */
  completeDownload(bookId, result) {
    const download = this.activeDownloads.get(bookId);
    if (!download) return;

    download.status = DownloadStatus.COMPLETE;
    download.endTime = Date.now();
    download.completedChapters = result.completed;
    download.failedChapters = result.failed;

    const duration = Math.round((download.endTime - download.startTime) / 1000);
    console.log(
      `[Download Tracker] Download complete: ${download.completedChapters}/${download.totalChapters} chapters in ${duration}s`
    );
  }

  /**
   * Get download status
   * @param {string} bookId - Book ID
   * @returns {object|null} Download state or null if not found
   */
  getDownloadStatus(bookId) {
    return this.activeDownloads.get(bookId) || null;
  }

  /**
   * Remove download from tracker
   * @param {string} bookId - Book ID
   */
  removeDownload(bookId) {
    this.activeDownloads.delete(bookId);
  }
}
