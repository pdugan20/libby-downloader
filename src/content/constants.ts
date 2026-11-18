/**
 * Content script constants for Libby Downloader
 */

// Re-export DEBUG_MODE from shared constants
export { DEBUG_MODE } from '../shared/constants';

export const ButtonState = {
  READY: 'ready',
  EXTRACTING: 'extracting',
  DOWNLOADING: 'downloading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type ButtonStateType = (typeof ButtonState)[keyof typeof ButtonState];

export const Timeouts = {
  EXTRACTION: 20000, // Allowed time without progress while collecting chapter URLs
  DOWNLOAD_DELAY: 500,
  NOTIFICATION_DURATION: 3000,
  BUTTON_RESET: 3000,
} as const;

export const UIConfig = {
  BUTTON_ID: 'libby-downloader-button',
  NOTIFICATION_CLASS: 'libby-downloader-notification',
  Z_INDEX: 999999,
} as const;
