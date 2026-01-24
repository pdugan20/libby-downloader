/**
 * Content script constants for Libby Downloader
 */

// DEBUG MODE - Set to false for production
export const DEBUG_MODE = true;

export const ButtonState = {
  READY: 'ready',
  EXTRACTING: 'extracting',
  DOWNLOADING: 'downloading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type ButtonStateType = (typeof ButtonState)[keyof typeof ButtonState];

export const Timeouts = {
  EXTRACTION: 10000,
  DOWNLOAD_DELAY: 500,
  NOTIFICATION_DURATION: 3000,
  BUTTON_RESET: 3000,
} as const;

export const UIConfig = {
  BUTTON_ID: 'libby-downloader-button',
  NOTIFICATION_CLASS: 'libby-downloader-notification',
  Z_INDEX: 999999,
} as const;
