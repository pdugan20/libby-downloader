/**
 * Content script for Libby Downloader V2
 * Orchestrates UI and message handling using modular components
 */

import { UIManager } from './ui-manager.js';
import { MessageHandler } from './message-handler.js';

(function () {
  console.log('[Libby Downloader] Content script loaded');

  // Only run on audiobook player pages
  if (!window.location.pathname.includes('/open/loan/')) {
    console.log('[Libby Downloader] Not an audiobook page');
    return;
  }

  console.log('[Libby Downloader] Audiobook page detected');

  // Initialize components
  const uiManager = new UIManager();
  const messageHandler = new MessageHandler(uiManager);

  // Setup message listeners
  messageHandler.setupListeners();

  // Inject styles
  uiManager.injectStyles();

  // Create button with click handler
  function handleDownloadClick() {
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
      uiManager.showError('Could not find audiobook iframe. Make sure the player has loaded.');
      return;
    }

    // Request extraction via message handler
    messageHandler.requestExtraction(libbyIframe);
  }

  // Create button when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      uiManager.createButton(handleDownloadClick);
    });
  } else {
    uiManager.createButton(handleDownloadClick);
  }
})();
