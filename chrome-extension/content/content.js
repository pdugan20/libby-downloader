/**
 * Content script for Libby Downloader V2
 * Orchestrates UI and message handling using modular components
 *
 * Note: This file combines multiple modules into one because Chrome Manifest V3
 * does not support ES6 module imports in content scripts via manifest declaration.
 */

(function () {
  'use strict';

  // ====================================
  // MESSAGE TYPES AND CONSTANTS
  // ====================================

  const MessageTypes = {
    // Iframe extraction
    EXTRACT_LIBBY_BOOK: 'EXTRACT_LIBBY_BOOK',
    EXTRACTION_SUCCESS: 'EXTRACTION_SUCCESS',
    EXTRACTION_ERROR: 'EXTRACTION_ERROR',

    // Background download
    START_DOWNLOAD: 'START_DOWNLOAD',
    DOWNLOAD_PROGRESS: 'DOWNLOAD_PROGRESS',
    DOWNLOAD_COMPLETE: 'DOWNLOAD_COMPLETE',
    GET_DOWNLOAD_STATUS: 'GET_DOWNLOAD_STATUS',
  };

  const ButtonState = {
    READY: 'ready',
    EXTRACTING: 'extracting',
    DOWNLOADING: 'downloading',
    SUCCESS: 'success',
    ERROR: 'error',
  };

  const Timeouts = {
    EXTRACTION: 10000,
    DOWNLOAD_DELAY: 500,
    NOTIFICATION_DURATION: 3000,
    BUTTON_RESET: 3000,
  };

  const UIConfig = {
    BUTTON_ID: 'libby-downloader-button',
    NOTIFICATION_CLASS: 'libby-downloader-notification',
    Z_INDEX: 999999,
  };

  // ====================================
  // VALIDATORS
  // ====================================

  const VALID_ORIGINS = [
    'https://listen.libbyapp.com',
    'https://thunder.libbyapp.com',
  ];

  function validateOrigin(origin) {
    if (origin === window.location.origin) {
      return true;
    }
    return VALID_ORIGINS.some((validOrigin) => origin === validOrigin);
  }

  function validateBookData(bookData) {
    if (!bookData || typeof bookData !== 'object') {
      return false;
    }

    if (!bookData.metadata || typeof bookData.metadata !== 'object') {
      return false;
    }

    const { metadata, chapters } = bookData;

    if (!metadata.title || typeof metadata.title !== 'string') {
      return false;
    }

    if (!Array.isArray(metadata.authors) || metadata.authors.length === 0) {
      return false;
    }

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return false;
    }

    const firstChapter = chapters[0];
    if (
      typeof firstChapter.index !== 'number' ||
      typeof firstChapter.title !== 'string' ||
      typeof firstChapter.url !== 'string' ||
      typeof firstChapter.duration !== 'number'
    ) {
      return false;
    }

    return true;
  }

  // ====================================
  // UI MANAGER CLASS
  // ====================================

  class UIManager {
    constructor() {
      this.button = null;
      this.currentState = ButtonState.READY;
    }

    createButton(onClickHandler) {
      const button = document.createElement('button');
      button.id = UIConfig.BUTTON_ID;
      button.textContent = '📥 Download Audiobook';
      button.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: ${UIConfig.Z_INDEX};
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

      button.addEventListener('click', onClickHandler);

      document.body.appendChild(button);
      this.button = button;

      console.log('[Libby Downloader] Button created');
    }

    updateState(state, data = {}) {
      if (!this.button) return;

      this.currentState = state;

      switch (state) {
        case ButtonState.EXTRACTING:
          this.button.textContent = '⏳ Extracting metadata...';
          this.button.disabled = true;
          this.button.style.background = '#999';
          break;

        case ButtonState.DOWNLOADING:
          const { completed, total } = data;
          this.button.textContent = `⏳ Downloading ${completed}/${total}...`;
          this.button.disabled = true;
          this.button.style.background = '#999';
          break;

        case ButtonState.SUCCESS:
          const { completedChapters, failedChapters, totalChapters } = data;
          if (failedChapters === 0) {
            this.button.textContent = `✅ Downloaded ${completedChapters} chapters!`;
            this.button.style.background = '#4CAF50';
          } else {
            this.button.textContent = `⚠️ Downloaded ${completedChapters}/${totalChapters} (${failedChapters} failed)`;
            this.button.style.background = '#FF9800';
          }
          break;

        case ButtonState.ERROR:
          this.button.textContent = '❌ Error - Click to retry';
          this.button.disabled = false;
          this.button.style.background = '#F44336';
          break;

        case ButtonState.READY:
        default:
          this.button.textContent = '📥 Download Audiobook';
          this.button.disabled = false;
          this.button.style.background = '#2196F3';
          break;
      }
    }

    resetAfterDelay() {
      setTimeout(() => {
        this.updateState(ButtonState.READY);
      }, Timeouts.BUTTON_RESET);
    }

    showError(message) {
      alert(`❌ ${message}`);
      this.updateState(ButtonState.ERROR);
    }

    showNotification(message) {
      const notification = document.createElement('div');
      notification.className = UIConfig.NOTIFICATION_CLASS;
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        z-index: ${UIConfig.Z_INDEX};
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
      }, Timeouts.NOTIFICATION_DURATION);
    }

    injectStyles() {
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
    }
  }

  // ====================================
  // MESSAGE HANDLER CLASS
  // ====================================

  class MessageHandler {
    constructor(uiManager) {
      this.uiManager = uiManager;
      this.extractionTimeout = null;
    }

    setupListeners() {
      window.addEventListener('message', (event) => this.handleWindowMessage(event));
      chrome.runtime.onMessage.addListener((message) => this.handleBackgroundMessage(message));
    }

    handleWindowMessage(event) {
      if (!validateOrigin(event.origin)) {
        console.warn('[Libby Downloader] Rejected message from untrusted origin:', event.origin);
        return;
      }

      const { type, data, error } = event.data;

      switch (type) {
        case MessageTypes.EXTRACTION_SUCCESS:
          this.handleExtractionSuccess(data);
          break;

        case MessageTypes.EXTRACTION_ERROR:
          this.handleExtractionError(error);
          break;

        default:
          break;
      }
    }

    handleBackgroundMessage(message) {
      const { type } = message;

      switch (type) {
        case MessageTypes.DOWNLOAD_PROGRESS:
          this.handleDownloadProgress(message.progress);
          break;

        case MessageTypes.DOWNLOAD_COMPLETE:
          this.handleDownloadComplete(message.result);
          break;

        default:
          break;
      }
    }

    requestExtraction(iframe) {
      console.log('[Libby Downloader] Requesting extraction from iframe');

      this.uiManager.updateState('extracting');

      iframe.contentWindow.postMessage(
        {
          type: MessageTypes.EXTRACT_LIBBY_BOOK,
        },
        'https://listen.libbyapp.com'
      );

      this.extractionTimeout = setTimeout(() => {
        this.uiManager.showError('Extraction timeout. Try playing the audiobook for a few seconds first.');
      }, 10000);
    }

    async handleExtractionSuccess(bookData) {
      clearTimeout(this.extractionTimeout);

      console.log('[Libby Downloader] Extraction successful');

      if (!validateBookData(bookData)) {
        this.uiManager.showError('Invalid book data received from extraction');
        return;
      }

      this.uiManager.updateState('downloading', {
        completed: 0,
        total: bookData.chapters.length,
      });

      try {
        const response = await chrome.runtime.sendMessage({
          type: MessageTypes.START_DOWNLOAD,
          data: bookData,
        });

        if (!response.success) {
          throw new Error(response.error);
        }

        console.log('[Libby Downloader] Download started');
      } catch (error) {
        console.error('[Libby Downloader] Download failed:', error);
        this.uiManager.showError(`Download failed: ${error.message}`);
      }
    }

    handleExtractionError(error) {
      clearTimeout(this.extractionTimeout);

      console.error('[Libby Downloader] Extraction error:', error);
      this.uiManager.showError(`Extraction failed: ${error}`);
    }

    handleDownloadProgress(progress) {
      const { completed, total } = progress;
      this.uiManager.updateState('downloading', { completed, total });
      console.log(`[Libby Downloader] Progress: ${completed}/${total}`);
    }

    handleDownloadComplete(result) {
      const { completed, failed, total } = result;

      this.uiManager.updateState('success', {
        completedChapters: completed,
        failedChapters: failed,
        totalChapters: total,
      });

      if (failed === 0) {
        this.uiManager.showNotification(`Successfully downloaded ${completed} chapters!`);
      } else {
        this.uiManager.showNotification(`Downloaded ${completed} chapters (${failed} failed)`);
      }

      this.uiManager.resetAfterDelay();
    }
  }

  // ====================================
  // MAIN INITIALIZATION
  // ====================================

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
