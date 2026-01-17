/**
 * UI Manager for Libby Downloader
 * Handles button creation, state updates, and notifications
 */

import { ButtonState, UIConfig, Timeouts } from '../shared/message-types.js';

export class UIManager {
  constructor() {
    this.button = null;
    this.currentState = ButtonState.READY;
  }

  /**
   * Initialize and create the download button
   */
  createButton(onClickHandler) {
    const button = document.createElement('button');
    button.id = UIConfig.BUTTON_ID;
    button.innerHTML = '📥 Download Audiobook';
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

  /**
   * Update button state
   * @param {string} state - One of ButtonState values
   * @param {object} data - Additional data (e.g., chapter count, progress)
   */
  updateState(state, data = {}) {
    if (!this.button) return;

    this.currentState = state;

    switch (state) {
      case ButtonState.EXTRACTING:
        this.button.innerHTML = '⏳ Extracting metadata...';
        this.button.disabled = true;
        this.button.style.background = '#999';
        break;

      case ButtonState.DOWNLOADING:
        const { completed, total } = data;
        this.button.innerHTML = `⏳ Downloading ${completed}/${total}...`;
        this.button.disabled = true;
        this.button.style.background = '#999';
        break;

      case ButtonState.SUCCESS:
        const { completedChapters, failedChapters, totalChapters } = data;
        if (failedChapters === 0) {
          this.button.innerHTML = `✅ Downloaded ${completedChapters} chapters!`;
          this.button.style.background = '#4CAF50';
        } else {
          this.button.innerHTML = `⚠️ Downloaded ${completedChapters}/${totalChapters} (${failedChapters} failed)`;
          this.button.style.background = '#FF9800';
        }
        break;

      case ButtonState.ERROR:
        this.button.innerHTML = '❌ Error - Click to retry';
        this.button.disabled = false;
        this.button.style.background = '#F44336';
        break;

      case ButtonState.READY:
      default:
        this.button.innerHTML = '📥 Download Audiobook';
        this.button.disabled = false;
        this.button.style.background = '#2196F3';
        break;
    }
  }

  /**
   * Reset button to ready state after delay
   */
  resetAfterDelay() {
    setTimeout(() => {
      this.updateState(ButtonState.READY);
    }, Timeouts.BUTTON_RESET);
  }

  /**
   * Show error notification
   */
  showError(message) {
    alert(`❌ ${message}`);
    this.updateState(ButtonState.ERROR);
  }

  /**
   * Show success notification with toast
   */
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

  /**
   * Add CSS animations for notifications
   */
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
