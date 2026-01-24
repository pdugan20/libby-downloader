/**
 * Message Handler for Libby Downloader content script
 * Routes messages between iframe, content script, and background script
 */

import type { BookData } from '../types/extension-book';
import { MessageTypes } from '../types/messages';
import { DEBUG_MODE } from './constants';
import type { UIManager } from './ui-manager';
import { validateBookData, validateOrigin } from './validators';

interface DownloadProgressMessage {
  type: typeof MessageTypes.DOWNLOAD_PROGRESS;
  progress: {
    completed: number;
    total: number;
  };
}

interface DownloadCompleteMessage {
  type: typeof MessageTypes.DOWNLOAD_COMPLETE;
  result: {
    completed: number;
    failed: number;
    total: number;
  };
}

type BackgroundMessage = DownloadProgressMessage | DownloadCompleteMessage;

export class MessageHandler {
  private uiManager: UIManager;
  private extractionTimeout: number | null = null;

  constructor(uiManager: UIManager) {
    this.uiManager = uiManager;
  }

  setupListeners(): void {
    window.addEventListener('message', (event) => this.handleWindowMessage(event));
    chrome.runtime.onMessage.addListener((message) => this.handleBackgroundMessage(message));
  }

  private handleWindowMessage(event: MessageEvent): void {
    if (!validateOrigin(event.origin)) {
      console.warn('[Libby Downloader] Rejected message from untrusted origin:', event.origin);
      return;
    }

    const { type, data, error } = event.data as {
      type: string;
      data?: BookData;
      error?: string;
    };

    switch (type) {
      case 'LIBBY_DOWNLOADER_BUTTON_CLICKED':
        console.log('[Libby Downloader] Button clicked in iframe, starting download...');
        this.handleButtonClick();
        break;

      case MessageTypes.EXTRACTION_SUCCESS:
        if (data) {
          this.handleExtractionSuccess(data);
        }
        break;

      case MessageTypes.EXTRACTION_ERROR:
        if (error) {
          this.handleExtractionError(error);
        }
        break;

      default:
        break;
    }
  }

  private handleButtonClick(): void {
    console.log('[Libby Downloader] Finding iframe...');

    const iframes = document.getElementsByTagName('iframe');
    let libbyIframe: HTMLIFrameElement | null = null;

    for (const iframe of Array.from(iframes)) {
      if (iframe.src && iframe.src.includes('listen.libbyapp.com')) {
        libbyIframe = iframe;
        break;
      }
    }

    if (!libbyIframe) {
      console.error('[Libby Downloader] Could not find audiobook iframe');
      return;
    }

    this.requestExtraction(libbyIframe);
  }

  private handleBackgroundMessage(message: BackgroundMessage): void {
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

  private requestExtraction(iframe: HTMLIFrameElement): void {
    console.log('[Libby Downloader] Requesting extraction from iframe');

    this.uiManager.updateState('extracting');

    if (DEBUG_MODE) {
      console.log('[Libby Downloader] DEBUG MODE - Simulating extraction');

      setTimeout(() => {
        // Fake book data for UI testing
        const fakeBookData: BookData = {
          metadata: {
            title: 'Test Audiobook',
            authors: ['Test Author'],
            narrators: ['Test Narrator'],
            coverUrl: 'https://example.com/cover.jpg',
          },
          chapters: Array.from({ length: 12 }, (_, i) => ({
            index: i,
            title: `Chapter ${i + 1}`,
            url: 'https://example.com/chapter.mp3',
            duration: 1800,
          })),
        };

        this.handleExtractionSuccess(fakeBookData);
      }, 1500); // Simulate extraction delay

      return;
    }

    // Get the actual origin from the iframe's URL (supports subdomains)
    let targetOrigin = 'https://listen.libbyapp.com'; // fallback
    try {
      const iframeUrl = new URL(iframe.src);
      targetOrigin = iframeUrl.origin;
      console.log('[Libby Downloader] Target origin:', targetOrigin);
    } catch {
      console.warn('[Libby Downloader] Failed to parse iframe URL, using fallback origin');
    }

    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: MessageTypes.EXTRACT_LIBBY_BOOK,
        },
        targetOrigin
      );
    }

    this.extractionTimeout = window.setTimeout(() => {
      this.uiManager.showError(
        'Extraction timeout. Try playing the audiobook for a few seconds first.'
      );
    }, 10000);
  }

  private async handleExtractionSuccess(bookData: BookData): Promise<void> {
    if (this.extractionTimeout !== null) {
      clearTimeout(this.extractionTimeout);
    }

    console.log('[Libby Downloader] Extraction successful');

    if (!validateBookData(bookData)) {
      this.uiManager.showError('Invalid book data received from extraction');
      return;
    }

    if (DEBUG_MODE) {
      console.log('[Libby Downloader] DEBUG MODE - Simulating download progress');

      // Simulate downloading progress
      const totalChapters = bookData.chapters.length;

      this.uiManager.updateState('downloading', {
        completed: 0,
        total: totalChapters,
      });

      // Simulate progress updates
      for (let i = 1; i <= totalChapters; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        this.uiManager.updateState('downloading', {
          completed: i,
          total: totalChapters,
        });
      }

      // Simulate successful completion
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.uiManager.updateState('success', {
        completedChapters: totalChapters,
        failedChapters: 0,
        totalChapters: totalChapters,
      });

      this.uiManager.showNotification(`Successfully downloaded ${totalChapters} chapters!`);
      this.uiManager.resetAfterDelay();

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.uiManager.showError(`Download failed: ${errorMessage}`);
    }
  }

  private handleExtractionError(error: string): void {
    if (this.extractionTimeout !== null) {
      clearTimeout(this.extractionTimeout);
    }

    console.error('[Libby Downloader] Extraction error:', error);
    this.uiManager.showError(`Extraction failed: ${error}`);
  }

  private handleDownloadProgress(progress: { completed: number; total: number }): void {
    const { completed, total } = progress;
    this.uiManager.updateState('downloading', { completed, total });
    console.log(`[Libby Downloader] Progress: ${completed}/${total}`);
  }

  private handleDownloadComplete(result: {
    completed: number;
    failed: number;
    total: number;
  }): void {
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
