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
   * Create a new download tracking entry
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

    console.log(`[Download Tracker] Created download: ${metadata.title} (ID: ${bookId})`);

    return bookId;
  }

  /**
   * Update download progress
   */
  updateProgress(bookId: string, completed: number, failed = 0): void {
    const download = this.activeDownloads.get(bookId);
    if (!download) return;

    download.completedChapters = completed;
    download.failedChapters = failed;
  }

  /**
   * Mark download as complete
   */
  completeDownload(bookId: string, result: DownloadResult): void {
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
   */
  getDownloadStatus(bookId: string): DownloadState | null {
    return this.activeDownloads.get(bookId) || null;
  }

  /**
   * Remove download from tracker
   */
  removeDownload(bookId: string): void {
    this.activeDownloads.delete(bookId);
  }
}
