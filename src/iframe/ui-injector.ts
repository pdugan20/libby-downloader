/**
 * Iframe UI injector for Libby Downloader
 * Runs in the audiobook player iframe to inject download button and progress overlay
 */

import { MessageTypes } from '../types/messages';

console.log('[Libby Downloader] Iframe UI script loaded');

let progressOverlay: HTMLDivElement | null = null;
let albumArtContainer: HTMLElement | null = null;

/**
 * Find album artwork container in iframe
 */
function findAlbumArtContainer(): HTMLElement | null {
  const selectors = [
    '.backdrop-cover-button',
    '.slingshot',
    '.title-tile-cover',
    '.title-tile',
    '.player-art',
    '.album-art',
  ];

  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      console.log(`[Libby Downloader] Found album art: ${selector}`);
      return element;
    }
  }

  console.warn('[Libby Downloader] Could not find album art container');
  return null;
}

/**
 * Create progress overlay below album artwork
 */
function createProgressOverlay(): void {
  console.log('[Libby Downloader] createProgressOverlay called');

  if (progressOverlay) {
    console.log('[Libby Downloader] Overlay already exists, returning');
    return;
  }

  console.log('[Libby Downloader] Finding album art container...');
  albumArtContainer = findAlbumArtContainer();
  if (!albumArtContainer) {
    console.warn('[Libby Downloader] Cannot create progress overlay - album art not found');
    return;
  }

  console.log('[Libby Downloader] Album art found, creating overlay elements...');

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.className = 'libby-download-progress-overlay';

  // Create progress bar container
  const progressContainer = document.createElement('div');
  progressContainer.className = 'libby-progress-container';

  // Create progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'libby-progress-bar';

  // Create progress fill
  const progressFill = document.createElement('div');
  progressFill.className = 'libby-progress-fill';
  progressBar.appendChild(progressFill);

  // Create progress text
  const progressText = document.createElement('div');
  progressText.className = 'libby-progress-text';
  progressText.textContent = 'Preparing download...';

  // Assemble structure
  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(progressText);
  overlay.appendChild(progressContainer);

  // Append to body (will be positioned via CSS)
  document.body.appendChild(overlay);

  progressOverlay = overlay;
  console.log('[Libby Downloader] Progress overlay created');
}

/**
 * Update progress overlay
 */
function updateProgressOverlay(completed: number, total: number, message: string): void {
  console.log('[Libby Downloader] updateProgressOverlay called', {
    completed,
    total,
    message,
    hasOverlay: !!progressOverlay,
  });

  if (!progressOverlay) {
    console.log('[Libby Downloader] No overlay exists, creating one...');
    createProgressOverlay();
  }

  if (!progressOverlay) {
    console.warn('[Libby Downloader] Still no overlay after create attempt, returning');
    return;
  }

  console.log('[Libby Downloader] Updating overlay elements');
  const progressFill = progressOverlay.querySelector<HTMLElement>('.libby-progress-fill');
  const progressText = progressOverlay.querySelector<HTMLElement>('.libby-progress-text');

  if (progressFill) {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    progressFill.style.width = `${percentage}%`;
    console.log('[Libby Downloader] Updated progress fill to', percentage + '%');
  }

  if (progressText) {
    progressText.textContent = message;
    console.log('[Libby Downloader] Updated progress text to', message);
  }
}

/**
 * Show completion message
 */
function showCompletionMessage(failedChapters: number): void {
  if (!progressOverlay) return;

  const progressText = progressOverlay.querySelector<HTMLElement>('.libby-progress-text');
  if (progressText) {
    if (failedChapters === 0) {
      progressText.innerHTML = `
        <svg class="libby-checkmark" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 42.17L12.83 31L8.41 35.41L24 51L56 19L51.59 14.59L24 42.17Z" fill="currentColor"/>
        </svg>
        Download complete!
      `;
    } else {
      progressText.innerHTML = `Download complete with ${failedChapters} errors`;
    }
    progressText.classList.add('libby-completion-message');
  }
}

/**
 * Remove progress overlay
 */
function removeProgressOverlay(): void {
  if (progressOverlay) {
    progressOverlay.remove();
    progressOverlay = null;
  }

  albumArtContainer = null;
}

/**
 * Handle messages from parent window
 */
window.addEventListener('message', (event) => {
  // Filter out non-extension messages
  if (!event.data || typeof event.data !== 'object' || !event.data.type) {
    return;
  }

  console.log('[Libby Downloader] Iframe received extension message:', event.data);

  const { type, state, data } = event.data as {
    type: string;
    state?: string;
    data?: {
      completed?: number;
      total?: number;
      message?: string;
      failedChapters?: number;
    };
  };

  console.log(`[Libby Downloader] Message type: ${type}, state: ${state}`);

  switch (type) {
    case MessageTypes.UPDATE_PROGRESS_UI:
      console.log('[Libby Downloader] UPDATE_PROGRESS_UI matched');
      if (state === 'extracting') {
        console.log('[Libby Downloader] Creating progress overlay for extracting');
        createProgressOverlay();
        updateProgressOverlay(0, 1, 'Extracting metadata...');
      } else if (state === 'downloading' && data) {
        console.log('[Libby Downloader] Updating progress for downloading');
        updateProgressOverlay(
          data.completed || 0,
          data.total || 1,
          data.message || 'Downloading...'
        );
      } else if (state === 'success' && data) {
        console.log('[Libby Downloader] Showing completion message');
        showCompletionMessage(data.failedChapters || 0);
      }
      break;

    case MessageTypes.RESET_UI:
      console.log('[Libby Downloader] RESET_UI matched');
      removeProgressOverlay();
      break;

    default:
      console.log(`[Libby Downloader] Unhandled message type: ${type}`);
  }
});

/**
 * Wait for nav bar and inject download button
 */
function injectDownloadButton(): void {
  const navBar = document.querySelector<HTMLElement>('.nav-action-bar-right');

  if (!navBar) {
    console.log('[Libby Downloader] Nav bar not found yet, waiting...');
    setTimeout(injectDownloadButton, 100);
    return;
  }

  console.log('[Libby Downloader] Nav bar found, injecting button...');

  // Create the container div
  const container = document.createElement('div');
  container.className = 'nav-action-item';
  container.id = 'libby-downloader-button-container';

  // Create the button
  const button = document.createElement('button');
  button.id = 'libby-downloader-button';
  button.className = 'nav-action-item-button halo';
  button.type = 'button';
  button.setAttribute('aria-label', 'Download Audiobook');
  button.setAttribute('touch-action', 'none');

  // Create the icon container
  const iconContainer = document.createElement('div');
  iconContainer.className = 'nav-action-item-icon';
  iconContainer.style.transform = 'scale(0.7)'; // Scale down to match other icons
  iconContainer.innerHTML = `
    <svg viewBox="0 0 90 66" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <path class="icon-fill" d="M45 0C51.9047 0 58.828 2.60948 64.0938 7.875C68.18 11.9613 70.6146 17.074 71.5312 22.375C81.9872 24.0733 90 33.0815 90 44C90 56.1265 80.1265 66 68 66H19C8.5086 66 0 57.4914 0 47C0 36.7863 8.0804 28.5278 18.1875 28.0938C17.895 20.817 20.3931 13.4194 25.9375 7.875C31.1999 2.61245 38.0953 0 45 0ZM45 4C39.1085 4 33.2504 6.2183 28.75 10.7188C23.5485 15.9202 21.3768 22.9839 22.1875 29.75C22.2231 30.0328 22.1979 30.32 22.1134 30.5923C22.029 30.8646 21.8873 31.1157 21.6979 31.3287C21.5086 31.5418 21.2758 31.7119 21.0153 31.8277C20.7548 31.9435 20.4726 32.0022 20.1875 32H19C10.6554 32 4 38.6554 4 47C4 55.3446 10.6554 62 19 62H68C77.9647 62 86 53.9647 86 44C86 34.5907 78.8314 26.8955 69.6562 26.0625C69.1992 26.0228 68.7698 25.8273 68.4398 25.5087C68.1099 25.1901 67.8995 24.7678 67.8438 24.3125C67.2668 19.3422 65.0999 14.5373 61.2812 10.7188C56.7838 6.22127 50.8915 4 45 4ZM45 24C46.1048 24 47 24.8954 47 26V47.5L54.6562 40.5313C55.4326 39.8225 56.7943 39.877 57.5 40.6563C58.2056 41.4357 58.1657 42.7846 57.3438 43.5L46.3438 53.5C46.058 53.7618 45.5349 53.99 45 54C44.4692 54 44.0965 53.902 43.6562 53.5L32.6562 43.5C31.8737 42.7978 31.7299 41.4276 32.5 40.6563C33.2428 39.9122 34.5674 39.8225 35.3438 40.5313L43 47.5V26C43 24.8954 43.8952 24 45 24Z" fill="currentColor"/>
    </svg>
  `;

  // Assemble the structure
  button.appendChild(iconContainer);
  container.appendChild(button);

  // Find all existing nav items and insert before the last one (bookmark)
  const existingItems = navBar.querySelectorAll<HTMLElement>('.nav-action-item');

  if (existingItems.length > 0) {
    // Insert before the last item (which should be a bookmark button)
    const lastItem = existingItems[existingItems.length - 1];
    navBar.insertBefore(container, lastItem);
  } else {
    // Fallback: just append if no items found
    navBar.appendChild(container);
  }

  // Handle click - send message to parent window
  button.addEventListener('click', () => {
    console.log('[Libby Downloader] Download button clicked in iframe');
    window.parent.postMessage(
      {
        type: MessageTypes.LIBBY_DOWNLOADER_BUTTON_CLICKED,
      },
      '*'
    );
  });

  console.log('[Libby Downloader] Button injected successfully');
}

// Start injection when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectDownloadButton);
} else {
  injectDownloadButton();
}
