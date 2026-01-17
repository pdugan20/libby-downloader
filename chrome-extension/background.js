// Service worker for Libby Downloader V2
// Handles chrome.downloads API and tracks download progress

console.log('[Libby Downloader] Background service worker loaded');

// Store active downloads
const activeDownloads = new Map();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Libby Downloader] Received message:', message.type);

  if (message.type === 'START_DOWNLOAD') {
    handleStartDownload(message.data, sender.tab.id)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_DOWNLOAD_STATUS') {
    const status = activeDownloads.get(message.bookId);
    sendResponse({ status });
    return true;
  }
});

// Handle download start
async function handleStartDownload(bookData, tabId) {
  const { metadata, chapters } = bookData;
  const bookId = `${Date.now()}`; // Simple ID for now

  console.log(`[Libby Downloader] Starting download: ${metadata.title} (${chapters.length} chapters)`);

  // Create download tracking object
  const downloadState = {
    bookId,
    metadata,
    totalChapters: chapters.length,
    completedChapters: 0,
    failedChapters: 0,
    downloadIds: [],
    chapterFiles: [],
    startTime: Date.now(),
    status: 'downloading',
  };

  activeDownloads.set(bookId, downloadState);

  // Download each chapter sequentially
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const chapterNum = String(i + 1).padStart(3, '0');
    const filename = `libby-downloads/${sanitizeFilename(metadata.title)}/chapter-${chapterNum}.mp3`;

    console.log(`[Libby Downloader] Downloading chapter ${i + 1}/${chapters.length}: ${chapter.title}`);

    try {
      const downloadId = await chrome.downloads.download({
        url: chapter.url,
        filename: filename,
        saveAs: false,
      });

      downloadState.downloadIds.push(downloadId);

      // Wait for download to complete
      const filepath = await waitForDownload(downloadId);
      downloadState.chapterFiles.push(filepath);
      downloadState.completedChapters++;

      console.log(`[Libby Downloader] Chapter ${i + 1}/${chapters.length} complete`);

      // Notify tab of progress
      chrome.tabs.sendMessage(tabId, {
        type: 'DOWNLOAD_PROGRESS',
        progress: {
          completed: downloadState.completedChapters,
          total: downloadState.totalChapters,
        },
      }).catch(() => {});

      // Small delay between chapters (500ms)
      await sleep(500);
    } catch (error) {
      console.error(`[Libby Downloader] Failed to download chapter ${i + 1}:`, error);
      downloadState.failedChapters++;
    }
  }

  // Mark as complete
  downloadState.status = 'complete';
  downloadState.endTime = Date.now();

  const duration = Math.round((downloadState.endTime - downloadState.startTime) / 1000);
  console.log(`[Libby Downloader] Download complete: ${downloadState.completedChapters}/${downloadState.totalChapters} chapters in ${duration}s`);

  // Save metadata file to the same folder as MP3s
  try {
    const metadataContent = JSON.stringify({ metadata, chapters }, null, 2);
    const blob = new Blob([metadataContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const downloadId = await chrome.downloads.download({
      url: url,
      filename: `libby-downloads/${sanitizeFilename(metadata.title)}/metadata.json`,
      saveAs: false,
    });

    console.log('[Libby Downloader] Metadata file download started');

    // Revoke blob URL after 30 seconds (plenty of time for download to start)
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) {
    console.error('[Libby Downloader] Failed to save metadata file:', error);
  }

  // Notify tab of completion
  chrome.tabs.sendMessage(tabId, {
    type: 'DOWNLOAD_COMPLETE',
    result: {
      completed: downloadState.completedChapters,
      failed: downloadState.failedChapters,
      total: downloadState.totalChapters,
    },
  }).catch(() => {});

  return {
    bookId,
    completed: downloadState.completedChapters,
    failed: downloadState.failedChapters,
    total: downloadState.totalChapters,
  };
}

// Wait for a specific download to complete
function waitForDownload(downloadId) {
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

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

// Listen for download completion (alternative approach)
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    console.log(`[Libby Downloader] Download ${delta.id} completed`);
  }

  if (delta.error) {
    console.error(`[Libby Downloader] Download ${delta.id} error:`, delta.error.current);
  }
});
