/**
 * Message type constants for Libby Downloader extension
 * Centralizes all message types to prevent typos and improve maintainability
 */

// Messages between content script and iframe
export const MessageTypes = {
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

// Download states
export const DownloadStatus = {
  IDLE: 'idle',
  EXTRACTING: 'extracting',
  DOWNLOADING: 'downloading',
  COMPLETE: 'complete',
  ERROR: 'error',
};

// Button states
export const ButtonState = {
  READY: 'ready',
  EXTRACTING: 'extracting',
  DOWNLOADING: 'downloading',
  SUCCESS: 'success',
  ERROR: 'error',
};

// Timeouts (in milliseconds)
export const Timeouts = {
  EXTRACTION: 10000, // 10 seconds
  DOWNLOAD_DELAY: 500, // 500ms between chapters
  NOTIFICATION_DURATION: 3000, // 3 seconds
  BUTTON_RESET: 3000, // 3 seconds
};

// UI configuration
export const UIConfig = {
  BUTTON_ID: 'libby-downloader-button',
  NOTIFICATION_CLASS: 'libby-downloader-notification',
  Z_INDEX: 999999,
};
