/**
 * UI Manager for Libby Downloader content script
 * Handles button injection, state management, and user notifications
 */

import { ButtonState, type ButtonStateType, Timeouts, UIConfig } from './constants';
import { getIcon } from '../shared/icon-loader';

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

  /**
   * Create and inject the download button into Libby's navigation bar
   * Finds the .nav-action-bar-right element and appends a styled button that matches
   * Libby's native UI. The button starts in READY state with download icon.
   * @param onClickHandler - Callback function to execute when button is clicked
   * @example
   * ```typescript
   * const uiManager = new UIManager();
   * uiManager.createButton(() => {
   *   console.log('Download button clicked!');
   * });
   * ```
   */
  createButton(onClickHandler: () => void): void {
    // Find the nav action bar
    const navBar = document.querySelector<HTMLElement>('.nav-action-bar-right');

    if (!navBar) {
      console.error('[Libby Downloader] Could not find nav-action-bar-right');
      return;
    }

    try {
      // Create the container div
      const container = document.createElement('div');
      container.className = 'nav-action-item';
      container.id = UIConfig.BUTTON_ID + '-container';

      // Create the button
      const button = document.createElement('button');
      button.id = UIConfig.BUTTON_ID;
      button.className = 'nav-action-item-button halo';
      button.type = 'button';
      button.setAttribute('aria-label', 'Download Audiobook');
      button.setAttribute('touch-action', 'none');

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

      // Assemble the structure
      button.appendChild(iconContainer);
      container.appendChild(button);

      // Insert into nav bar
      navBar.appendChild(container);

      button.addEventListener('click', onClickHandler);

      this.button = button;
      this.iconContainer = iconContainer;
    } catch (error) {
      console.error('[Libby Downloader] Error creating button:', error);
    }
  }

  /**
   * Update button visual state and accessibility label
   * Changes icon, aria-label, and disabled state based on current download status.
   * @param state - Button state (READY, EXTRACTING, DOWNLOADING, SUCCESS, ERROR)
   * @param data - Optional state-specific data (progress counts, completion stats)
   * @example
   * ```typescript
   * // Show extracting state
   * uiManager.updateState(ButtonState.EXTRACTING);
   *
   * // Show download progress
   * uiManager.updateState(ButtonState.DOWNLOADING, { completed: 3, total: 10 });
   *
   * // Show completion
   * uiManager.updateState(ButtonState.SUCCESS, {
   *   completedChapters: 10,
   *   failedChapters: 0,
   *   totalChapters: 10
   * });
   * ```
   */
  updateState(state: ButtonStateType, data: StateData = {}): void {
    if (!this.button || !this.iconContainer) return;

    switch (state) {
      case ButtonState.EXTRACTING:
        this.iconContainer.innerHTML = getIcon('spinner');
        this.button.setAttribute('aria-label', 'Extracting metadata...');
        this.button.disabled = true;
        break;

      case ButtonState.DOWNLOADING: {
        const progressData = data as DownloadProgressData;
        const { completed, total } = progressData;
        this.iconContainer.innerHTML = getIcon('spinner');
        this.button.setAttribute('aria-label', `Downloading ${completed}/${total} chapters...`);
        this.button.disabled = true;
        break;
      }

      case ButtonState.SUCCESS: {
        const completeData = data as DownloadCompleteData;
        const { completedChapters, failedChapters, totalChapters } = completeData;
        this.iconContainer.innerHTML = getIcon('checkmark');
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
        this.iconContainer.innerHTML = getIcon('error');
        this.button.setAttribute('aria-label', 'Error - Click to retry');
        this.button.disabled = false;
        break;

      case ButtonState.READY:
      default:
        this.iconContainer.innerHTML = getIcon('download');
        this.button.setAttribute('aria-label', 'Download Audiobook');
        this.button.disabled = false;
        break;
    }
  }

  /**
   * Reset button to READY state after a delay
   * Used after successful downloads to allow user to download again.
   * Waits 3 seconds (Timeouts.BUTTON_RESET) before resetting.
   */
  resetAfterDelay(): void {
    setTimeout(() => {
      this.updateState(ButtonState.READY);
    }, Timeouts.BUTTON_RESET);
  }

  /**
   * Show error alert and update button to ERROR state
   * Displays browser alert dialog with error message, then sets button to error icon.
   * Button remains clickable in ERROR state to allow retry.
   * @param message - Error message to display to user
   * @example
   * ```typescript
   * uiManager.showError('Failed to find audiobook iframe');
   * ```
   */
  showError(message: string): void {
    alert(`❌ ${message}`);
    this.updateState(ButtonState.ERROR);
  }

  /**
   * Show temporary success notification overlay
   * Displays a slide-in notification that auto-dismisses after 3 seconds.
   * Uses CSS animations from content.css (slideIn, slideOut).
   * @param message - Notification message to display
   * @example
   * ```typescript
   * uiManager.showNotification('Download started! Check your downloads folder.');
   * ```
   */
  showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.className = UIConfig.NOTIFICATION_CLASS;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, Timeouts.NOTIFICATION_DURATION);
  }
}
