// Content script for Libby Downloader V2
// Runs on main Libby page, creates UI and coordinates extraction + download

(function() {
  console.log('[Libby Downloader] Content script loaded');

  // Only run on audiobook player pages
  if (!window.location.pathname.includes('/open/loan/')) {
    console.log('[Libby Downloader] Not an audiobook page');
    return;
  }

  console.log('[Libby Downloader] Audiobook page detected');

  // Create download button
  function createButton() {
    const button = document.createElement('button');
    button.id = 'libby-downloader-button';
    button.innerHTML = '📥 Download Audiobook';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      padding: 12px 20px;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-family: system-ui, -apple-system, sans-serif;
      transition: background 0.2s;
    `;

    button.addEventListener('mouseover', () => {
      if (!button.disabled) {
        button.style.background = '#1976D2';
      }
    });

    button.addEventListener('mouseout', () => {
      if (!button.disabled) {
        button.style.background = '#2196F3';
      }
    });

    button.addEventListener('click', startDownload);

    document.body.appendChild(button);
    console.log('[Libby Downloader] Button added');
  }

  // Start download process
  function startDownload() {
    const button = document.getElementById('libby-downloader-button');
    button.innerHTML = '⏳ Extracting metadata...';
    button.disabled = true;
    button.style.background = '#999';

    console.log('[Libby Downloader] Finding iframe...');

    // Find Libby iframe
    const iframes = document.getElementsByTagName('iframe');
    let libbyIframe = null;

    for (let iframe of iframes) {
      if (iframe.src && iframe.src.includes('listen.libbyapp.com')) {
        libbyIframe = iframe;
        break;
      }
    }

    if (!libbyIframe) {
      showError('Could not find audiobook iframe. Make sure the player has loaded.');
      resetButton();
      return;
    }

    console.log('[Libby Downloader] Found iframe, requesting extraction');

    // Request extraction from iframe
    libbyIframe.contentWindow.postMessage({
      type: 'EXTRACT_LIBBY_BOOK'
    }, '*');

    // Timeout
    setTimeout(() => {
      if (button.innerHTML === '⏳ Extracting metadata...') {
        showError('Extraction timeout. Try playing the audiobook for a few seconds first.');
        resetButton();
      }
    }, 10000);
  }

  // Listen for messages from iframe and background
  window.addEventListener('message', async (event) => {
    if (event.data.type === 'EXTRACTION_SUCCESS') {
      console.log('[Libby Downloader] Extraction successful');
      const bookData = event.data.data;

      const button = document.getElementById('libby-downloader-button');
      button.innerHTML = `⏳ Downloading ${bookData.chapters.length} chapters...`;

      try {
        // Send to background script for download
        const response = await chrome.runtime.sendMessage({
          type: 'START_DOWNLOAD',
          data: bookData,
        });

        if (response.success) {
          console.log('[Libby Downloader] Download started');
        } else {
          throw new Error(response.error);
        }
      } catch (error) {
        console.error('[Libby Downloader] Download failed:', error);
        showError(`Download failed: ${error.message}`);
        resetButton();
      }
    }

    if (event.data.type === 'EXTRACTION_ERROR') {
      console.error('[Libby Downloader] Extraction error:', event.data.error);
      showError(`Extraction failed: ${event.data.error}`);
      resetButton();
    }
  });

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
    const button = document.getElementById('libby-downloader-button');

    if (message.type === 'DOWNLOAD_PROGRESS') {
      const { completed, total } = message.progress;
      button.innerHTML = `⏳ Downloading ${completed}/${total}...`;
      console.log(`[Libby Downloader] Progress: ${completed}/${total}`);
    }

    if (message.type === 'DOWNLOAD_COMPLETE') {
      const { completed, failed, total } = message.result;

      if (failed === 0) {
        button.innerHTML = `✅ Downloaded ${completed} chapters!`;
        button.style.background = '#4CAF50';
        showNotification(`Successfully downloaded ${completed} chapters!`);
      } else {
        button.innerHTML = `⚠️ Downloaded ${completed}/${total} (${failed} failed)`;
        button.style.background = '#FF9800';
        showNotification(`Downloaded ${completed} chapters (${failed} failed)`);
      }

      setTimeout(resetButton, 3000);
    }
  });

  // Show error notification
  function showError(message) {
    alert(`❌ ${message}`);
  }

  // Show success notification
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      z-index: 999999;
      padding: 16px 20px;
      background: #4CAF50;
      color: white;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Reset button to initial state
  function resetButton() {
    const button = document.getElementById('libby-downloader-button');
    if (button) {
      button.innerHTML = '📥 Download Audiobook';
      button.disabled = false;
      button.style.background = '#2196F3';
    }
  }

  // Create button when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createButton);
  } else {
    createButton();
  }

  // Add animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
})();
