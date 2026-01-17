/**
 * Message Handler for Libby Downloader content script
 * Routes messages between iframe, background script, and UI
 */

import { MessageTypes } from '../shared/message-types.js';
import { validateOrigin, validateBookData } from '../shared/validators.js';

export class MessageHandler {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.extractionTimeout = null;
  }

  /**
   * Set up message listeners
   */
  setupListeners() {
    // Listen for messages from iframe (window.postMessage)
    window.addEventListener('message', (event) => this.handleWindowMessage(event));

    // Listen for messages from background script (chrome.runtime)
    chrome.runtime.onMessage.addListener((message) => this.handleBackgroundMessage(message));
  }

  /**
   * Handle messages from iframe via postMessage
   */
  handleWindowMessage(event) {
    // SECURITY: Validate origin
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
        // Ignore unknown message types
        break;
    }
  }

  /**
   * Handle messages from background script
   */
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
        // Ignore unknown message types
        break;
    }
  }

  /**
   * Request extraction from iframe
   */
  requestExtraction(iframe) {
    console.log('[Libby Downloader] Requesting extraction from iframe');

    this.uiManager.updateState('extracting');

    // Send extraction request (use Libby's actual origin, not wildcard)
    iframe.contentWindow.postMessage(
      {
        type: MessageTypes.EXTRACT_LIBBY_BOOK,
      },
      'https://listen.libbyapp.com'
    );

    // Set timeout
    this.extractionTimeout = setTimeout(() => {
      this.uiManager.showError('Extraction timeout. Try playing the audiobook for a few seconds first.');
    }, 10000);
  }

  /**
   * Handle successful extraction
   */
  async handleExtractionSuccess(bookData) {
    clearTimeout(this.extractionTimeout);

    console.log('[Libby Downloader] Extraction successful');

    // Validate book data
    if (!validateBookData(bookData)) {
      this.uiManager.showError('Invalid book data received from extraction');
      return;
    }

    this.uiManager.updateState('downloading', {
      completed: 0,
      total: bookData.chapters.length,
    });

    try {
      // Send to background script
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

  /**
   * Handle extraction error
   */
  handleExtractionError(error) {
    clearTimeout(this.extractionTimeout);

    console.error('[Libby Downloader] Extraction error:', error);
    this.uiManager.showError(`Extraction failed: ${error}`);
  }

  /**
   * Handle download progress update
   */
  handleDownloadProgress(progress) {
    const { completed, total } = progress;
    this.uiManager.updateState('downloading', { completed, total });
    console.log(`[Libby Downloader] Progress: ${completed}/${total}`);
  }

  /**
   * Handle download completion
   */
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
