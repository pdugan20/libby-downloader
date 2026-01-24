/**
 * Background service worker for Libby Downloader
 * Handles downloads and communicates with content script
 */

import type { BookData } from '../types/extension-book';
import { MessageTypes } from '../types/messages';
import { DownloadService } from './download-service';
import { DownloadTracker } from './download-tracker';
import { MetadataWriter } from './metadata-writer';

console.log('[Libby Downloader] Background service worker loaded');

// Initialize services
const downloadService = new DownloadService();
const downloadTracker = new DownloadTracker();
const metadataWriter = new MetadataWriter();

/**
 * Handle start download message
 */
async function handleStartDownload(
  bookData: BookData,
  tabId: number
): Promise<{ bookId: string; completed: number; failed: number; total: number }> {
  const { metadata, chapters } = bookData;

  console.log(
    `[Libby Downloader] Starting download: ${metadata.title} (${chapters.length} chapters)`
  );

  // Create download tracking entry
  const bookId = downloadTracker.createDownload(bookData);

  // Download chapters with progress tracking
  const result = await downloadService.downloadAllChapters(
    chapters,
    metadata.title,
    (completed, total) => {
      // Update tracker
      downloadTracker.updateProgress(bookId, completed);

      // Notify content script of progress
      chrome.tabs
        .sendMessage(tabId, {
          type: MessageTypes.DOWNLOAD_PROGRESS,
          progress: { completed, total },
        })
        .catch(() => {
          // Tab might be closed, ignore error
        });
    }
  );

  // Mark download as complete
  downloadTracker.completeDownload(bookId, result);

  // Save metadata file
  try {
    await metadataWriter.saveMetadata(metadata, chapters, metadata.title);
  } catch (error) {
    console.error('[Libby Downloader] Failed to save metadata file:', error);
  }

  // Notify content script of completion
  chrome.tabs
    .sendMessage(tabId, {
      type: MessageTypes.DOWNLOAD_COMPLETE,
      result: {
        completed: result.completed,
        failed: result.failed,
        total: result.total,
      },
    })
    .catch(() => {
      // Tab might be closed, ignore error
    });

  return {
    bookId,
    completed: result.completed,
    failed: result.failed,
    total: result.total,
  };
}

/**
 * Message listener
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Libby Downloader] Received message:', message.type);

  if (message.type === MessageTypes.START_DOWNLOAD) {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID available' });
      return true;
    }

    handleStartDownload(message.data as BookData, tabId)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );

    return true; // Keep channel open for async response
  }

  if (message.type === MessageTypes.GET_DOWNLOAD_STATUS) {
    const status = downloadTracker.getDownloadStatus(message.bookId);
    sendResponse({ status });
    return true;
  }

  return false;
});

/**
 * Download state change listener
 */
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    console.log(`[Libby Downloader] Download ${delta.id} completed`);
  }

  if (delta.error) {
    console.error(`[Libby Downloader] Download ${delta.id} error:`, delta.error.current);
  }
});

console.log('[Libby Downloader] Background service worker ready');
