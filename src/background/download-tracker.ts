/**
 * Download Tracker for Libby Downloader
 * Tracks state of active downloads
 */

import type { BookData, BookMetadata } from '../types/extension-book';
import { DownloadStatus, type DownloadStatusType } from '../types/messages';

export interface DownloadState {
  bookId: string;
  metadata: BookMetadata;
  totalChapters: number;
  completedChapters: number;
  failedChapters: number;
  downloadIds: number[];
  startTime: number;
  endTime?: number;
  status: DownloadStatusType;
}

export interface DownloadResult {
  completed: number;
  failed: number;
  total: number;
}

export class DownloadTracker {
  private activeDownloads: Map<string, DownloadState> = new Map();

  /**
   * Create a new download tracking entry for a book
   * Generates a unique book ID based on current timestamp and initializes tracking state.
   * @param bookData - Complete book data including metadata and chapters
   * @returns Unique book ID for tracking this download
   * @example
   * ```typescript
   * const tracker = new DownloadTracker();
   * const bookId = tracker.createDownload(bookData);
   * console.log('Tracking download:', bookId);
   * ```
   */
  createDownload(bookData: BookData): string {
    const bookId = `${Date.now()}`;
    const { metadata, chapters } = bookData;

    const downloadState: DownloadState = {
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

    return bookId;
  }

  /**
   * Update download progress for an active download
   * Silently ignores updates for non-existent book IDs.
   * @param bookId - Unique book identifier from createDownload()
   * @param completed - Number of chapters successfully downloaded
   * @param failed - Number of chapters that failed to download (default: 0)
   */
  updateProgress(bookId: string, completed: number, failed = 0): void {
    const download = this.activeDownloads.get(bookId);
    if (!download) return;

    download.completedChapters = completed;
    download.failedChapters = failed;
  }

  /**
   * Mark download as complete and record final statistics
   * Updates status, end time, and final chapter counts. Logs completion summary.
   * @param bookId - Unique book identifier from createDownload()
   * @param result - Final download results (completed, failed, total counts)
   */
  completeDownload(bookId: string, result: DownloadResult): void {
    const download = this.activeDownloads.get(bookId);
    if (!download) return;

    download.status = DownloadStatus.COMPLETE;
    download.endTime = Date.now();
    download.completedChapters = result.completed;
    download.failedChapters = result.failed;
  }

  /**
   * Get current download status for a book
   * @param bookId - Unique book identifier from createDownload()
   * @returns Download state object or null if book ID not found
   * @example
   * ```typescript
   * const status = tracker.getDownloadStatus(bookId);
   * if (status) {
   *   console.log(`Progress: ${status.completedChapters}/${status.totalChapters}`);
   * }
   * ```
   */
  getDownloadStatus(bookId: string): DownloadState | null {
    return this.activeDownloads.get(bookId) || null;
  }

  /**
   * Remove download from tracker to free memory
   * Used for cleanup after download completion. Safe to call with non-existent IDs.
   * @param bookId - Unique book identifier from createDownload()
   */
  removeDownload(bookId: string): void {
    this.activeDownloads.delete(bookId);
  }
}
