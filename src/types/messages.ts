/**
 * Message types for communication between extension components
 */

export const MessageTypes = {
  // Iframe extraction messages
  EXTRACT_LIBBY_BOOK: 'EXTRACT_LIBBY_BOOK',
  EXTRACTION_SUCCESS: 'EXTRACTION_SUCCESS',
  EXTRACTION_ERROR: 'EXTRACTION_ERROR',

  // Background download messages
  START_DOWNLOAD: 'START_DOWNLOAD',
  DOWNLOAD_PROGRESS: 'DOWNLOAD_PROGRESS',
  DOWNLOAD_COMPLETE: 'DOWNLOAD_COMPLETE',
  GET_DOWNLOAD_STATUS: 'GET_DOWNLOAD_STATUS',

  // UI messages
  LIBBY_DOWNLOADER_BUTTON_CLICKED: 'LIBBY_DOWNLOADER_BUTTON_CLICKED',
} as const;

export type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes];

/**
 * Message payload types
 */

export interface ExtractionRequestMessage {
  type: typeof MessageTypes.EXTRACT_LIBBY_BOOK;
}

export interface ExtractionSuccessMessage {
  type: typeof MessageTypes.EXTRACTION_SUCCESS;
  data: BookData;
}

export interface ExtractionErrorMessage {
  type: typeof MessageTypes.EXTRACTION_ERROR;
  error: string;
}

export interface StartDownloadMessage {
  type: typeof MessageTypes.START_DOWNLOAD;
  data: BookData;
}

export interface DownloadProgressMessage {
  type: typeof MessageTypes.DOWNLOAD_PROGRESS;
  progress: {
    completed: number;
    total: number;
  };
}

export interface DownloadCompleteMessage {
  type: typeof MessageTypes.DOWNLOAD_COMPLETE;
  result: {
    completed: number;
    failed: number;
    total: number;
  };
}

export interface ButtonClickedMessage {
  type: typeof MessageTypes.LIBBY_DOWNLOADER_BUTTON_CLICKED;
}

/**
 * Union type of all messages
 */
export type ExtensionMessage =
  | ExtractionRequestMessage
  | ExtractionSuccessMessage
  | ExtractionErrorMessage
  | StartDownloadMessage
  | DownloadProgressMessage
  | DownloadCompleteMessage
  | ButtonClickedMessage;

/**
 * Book data structure (imported from extension-book types)
 */
import type { BookData } from './extension-book';
