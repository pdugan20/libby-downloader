/**
 * Service worker for Libby Downloader V2
 * Orchestrates download operations using service layer
 */

import { MessageTypes } from '../shared/message-types.js';
import { DownloadService } from './download-service.js';
import { DownloadTracker } from './download-tracker.js';
import { MetadataWriter } from './metadata-writer.js';

console.log('[Libby Downloader] Background service worker loaded');

// Initialize services
const downloadService = new DownloadService();
const downloadTracker = new DownloadTracker();
const metadataWriter = new MetadataWriter();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Libby Downloader] Received message:', message.type);

  if (message.type === MessageTypes.START_DOWNLOAD) {
    handleStartDownload(message.data, sender.tab.id)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === MessageTypes.GET_DOWNLOAD_STATUS) {
    const status = downloadTracker.getDownloadStatus(message.bookId);
    sendResponse({ status });
    return true;
  }
});

/**
 * Handle download start
 */
async function handleStartDownload(bookData, tabId) {
  const { metadata, chapters } = bookData;

  // Create download tracking
  const bookId = downloadTracker.createDownload(bookData);

  console.log(`[Libby Downloader] Starting download: ${metadata.title} (${chapters.length} chapters)`);

  // Progress callback
  const onProgress = (completed, total) => {
    downloadTracker.updateProgress(bookId, completed);

    // Notify content script
    chrome.tabs
      .sendMessage(tabId, {
        type: MessageTypes.DOWNLOAD_PROGRESS,
        progress: {
          completed,
          total,
        },
      })
      .catch(() => {}); // Ignore errors if tab is closed
  };

  // Download all chapters
  const result = await downloadService.downloadAllChapters(chapters, metadata.title, onProgress);

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
    .catch(() => {}); // Ignore errors if tab is closed

  return {
    bookId,
    completed: result.completed,
    failed: result.failed,
    total: result.total,
  };
}

// Listen for download state changes
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    console.log(`[Libby Downloader] Download ${delta.id} completed`);
  }

  if (delta.error) {
    console.error(`[Libby Downloader] Download ${delta.id} error:`, delta.error.current);
  }
});
