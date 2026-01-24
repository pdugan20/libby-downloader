/**
 * UI Manager for Libby Downloader content script
 * Handles button injection, state management, and user notifications
 */

import { ButtonState, type ButtonStateType, Timeouts, UIConfig } from './constants';

interface DownloadProgressData {
  completed: number;
  total: number;
}

interface DownloadCompleteData {
  completedChapters: number;
  failedChapters: number;
  totalChapters: number;
}

type StateData = DownloadProgressData | DownloadCompleteData | Record<string, never>;

export class UIManager {
  private button: HTMLButtonElement | null = null;
  private iconContainer: HTMLDivElement | null = null;

  createButton(onClickHandler: () => void): void {
    console.log('[Libby Downloader] createButton() called');

    // Find the nav action bar
    const navBar = document.querySelector<HTMLElement>('.nav-action-bar-right');
    console.log('[Libby Downloader] navBar element:', navBar);

    if (!navBar) {
      console.error('[Libby Downloader] Could not find nav-action-bar-right');
      return;
    }

    try {
      // Create the container div
      const container = document.createElement('div');
      container.className = 'nav-action-item';
      container.id = UIConfig.BUTTON_ID + '-container';
      console.log('[Libby Downloader] Created container:', container);

      // Create the button
      const button = document.createElement('button');
      button.id = UIConfig.BUTTON_ID;
      button.className = 'nav-action-item-button halo';
      button.type = 'button';
      button.setAttribute('aria-label', 'Download Audiobook');
      button.setAttribute('touch-action', 'none');
      console.log('[Libby Downloader] Created button:', button);

      // Create the icon container
      const iconContainer = document.createElement('div');
      iconContainer.className = 'nav-action-item-icon';
      iconContainer.innerHTML = `
        <svg viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fill-rule="evenodd" stroke="none" stroke-width="1">
            <path class="icon-fill" d="M32 42L20 30L23.5 26.5L29 32V16H35V32L40.5 26.5L44 30L32 42Z" fill="currentColor"/>
            <path class="icon-fill" d="M16 52C14.9 52 13.958 51.608 13.174 50.824C12.39 50.04 12 49.099 12 48V40H16V48H48V40H52V48C52 49.1 51.61 50.042 50.83 50.826C50.05 51.61 49.099 52 48 52H16Z" fill="currentColor"/>
          </g>
        </svg>
      `;
      console.log('[Libby Downloader] Created icon container:', iconContainer);

      // Assemble the structure
      button.appendChild(iconContainer);
      container.appendChild(button);
      console.log('[Libby Downloader] Assembled structure');

      // Insert into nav bar
      navBar.appendChild(container);
      console.log('[Libby Downloader] Inserted into nav bar');

      button.addEventListener('click', onClickHandler);
      console.log('[Libby Downloader] Added click handler');

      this.button = button;
      this.iconContainer = iconContainer;

      console.log('[Libby Downloader] Button created and injected into nav bar');
    } catch (error) {
      console.error('[Libby Downloader] Error creating button:', error);
    }
  }

  updateState(state: ButtonStateType, data: StateData = {}): void {
    if (!this.button || !this.iconContainer) return;

    // Download icon SVG
    const downloadIcon = `
      <svg viewBox="0 0 90 66" version="1.1" xmlns="http://www.w3.org/2000/svg">
        <path class="icon-fill" d="M45 0C51.9047 0 58.828 2.60948 64.0938 7.875C68.18 11.9613 70.6146 17.074 71.5312 22.375C81.9872 24.0733 90 33.0815 90 44C90 56.1265 80.1265 66 68 66H19C8.5086 66 0 57.4914 0 47C0 36.7863 8.0804 28.5278 18.1875 28.0938C17.895 20.817 20.3931 13.4194 25.9375 7.875C31.1999 2.61245 38.0953 0 45 0ZM45 4C39.1085 4 33.2504 6.2183 28.75 10.7188C23.5485 15.9202 21.3768 22.9839 22.1875 29.75C22.2231 30.0328 22.1979 30.32 22.1134 30.5923C22.029 30.8646 21.8873 31.1157 21.6979 31.3287C21.5086 31.5418 21.2758 31.7119 21.0153 31.8277C20.7548 31.9435 20.4726 32.0022 20.1875 32H19C10.6554 32 4 38.6554 4 47C4 55.3446 10.6554 62 19 62H68C77.9647 62 86 53.9647 86 44C86 34.5907 78.8314 26.8955 69.6562 26.0625C69.1992 26.0228 68.7698 25.8273 68.4398 25.5087C68.1099 25.1901 67.8995 24.7678 67.8438 24.3125C67.2668 19.3422 65.0999 14.5373 61.2812 10.7188C56.7838 6.22127 50.8915 4 45 4ZM45 24C46.1048 24 47 24.8954 47 26V47.5L54.6562 40.5313C55.4326 39.8225 56.7943 39.877 57.5 40.6563C58.2056 41.4357 58.1657 42.7846 57.3438 43.5L46.3438 53.5C46.058 53.7618 45.5349 53.99 45 54C44.4692 54 44.0965 53.902 43.6562 53.5L32.6562 43.5C31.8737 42.7978 31.7299 41.4276 32.5 40.6563C33.2428 39.9122 34.5674 39.8225 35.3438 40.5313L43 47.5V26C43 24.8954 43.8952 24 45 24Z" fill="currentColor"/>
      </svg>
    `;

    // Loading spinner SVG (matching Libby's spinner style)
    const spinnerIcon = `
      <svg class="spinner" viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd" stroke="none" stroke-linecap="round" stroke-width="1">
          <line class="icon-hollow" stroke="currentColor" stroke-width="3" x1="32" x2="32" y1="12.875" y2="16.125"></line>
          <line class="icon-hollow" stroke="currentColor" stroke-width="3" opacity="0.9" x1="41.6" x2="43.85" y1="14.15" y2="16.4"></line>
          <line class="icon-hollow" stroke="currentColor" stroke-width="3" opacity="0.8" x1="47.85" x2="49.85" y1="22.4" y2="24.4"></line>
          <line class="icon-hollow" stroke="currentColor" stroke-width="3" opacity="0.7" x1="49.85" x2="51.125" y1="32" y2="32"></line>
          <line class="icon-hollow" stroke="currentColor" stroke-width="3" opacity="0.6" x1="47.85" x2="49.85" y1="41.6" y2="39.6"></line>
          <line class="icon-hollow" stroke="currentColor" stroke-width="3" opacity="0.5" x1="41.6" x2="43.85" y1="49.85" y2="47.6"></line>
          <line class="icon-hollow" stroke="currentColor" stroke-width="3" opacity="0.4" x1="32" x2="32" y1="51.125" y2="47.875"></line>
          <line class="icon-hollow" stroke="currentColor" stroke-width="3" opacity="0.3" x1="22.4" x2="20.15" y1="49.85" y2="47.6"></line>
        </g>
      </svg>
    `;

    // Checkmark icon SVG
    const checkIcon = `
      <svg viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd" stroke="none" stroke-width="1">
          <path class="icon-fill" d="M24 42.17L12.83 31L8.41 35.41L24 51L56 19L51.59 14.59L24 42.17Z" fill="currentColor"/>
        </g>
      </svg>
    `;

    // Error icon SVG
    const errorIcon = `
      <svg viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd" stroke="none" stroke-width="1">
          <path class="icon-fill" d="M32 6C17.64 6 6 17.64 6 32s11.64 26 26 26 26-11.64 26-26S46.36 6 32 6zm3 39h-6v-6h6v6zm0-12h-6V18h6v15z" fill="currentColor"/>
        </g>
      </svg>
    `;

    switch (state) {
      case ButtonState.EXTRACTING:
        this.iconContainer.innerHTML = spinnerIcon;
        this.button.setAttribute('aria-label', 'Extracting metadata...');
        this.button.disabled = true;
        break;

      case ButtonState.DOWNLOADING: {
        const progressData = data as DownloadProgressData;
        const { completed, total } = progressData;
        this.iconContainer.innerHTML = spinnerIcon;
        this.button.setAttribute('aria-label', `Downloading ${completed}/${total} chapters...`);
        this.button.disabled = true;
        break;
      }

      case ButtonState.SUCCESS: {
        const completeData = data as DownloadCompleteData;
        const { completedChapters, failedChapters, totalChapters } = completeData;
        this.iconContainer.innerHTML = checkIcon;
        if (failedChapters === 0) {
          this.button.setAttribute(
            'aria-label',
            `Downloaded ${completedChapters} chapters successfully!`
          );
        } else {
          this.button.setAttribute(
            'aria-label',
            `Downloaded ${completedChapters}/${totalChapters} chapters (${failedChapters} failed)`
          );
        }
        break;
      }

      case ButtonState.ERROR:
        this.iconContainer.innerHTML = errorIcon;
        this.button.setAttribute('aria-label', 'Error - Click to retry');
        this.button.disabled = false;
        break;

      case ButtonState.READY:
      default:
        this.iconContainer.innerHTML = downloadIcon;
        this.button.setAttribute('aria-label', 'Download Audiobook');
        this.button.disabled = false;
        break;
    }
  }

  resetAfterDelay(): void {
    setTimeout(() => {
      this.updateState(ButtonState.READY);
    }, Timeouts.BUTTON_RESET);
  }

  showError(message: string): void {
    alert(`❌ ${message}`);
    this.updateState(ButtonState.ERROR);
  }

  showNotification(message: string): void {
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

  injectStyles(): void {
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
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      .spinner {
        animation: spin 1s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }
}
