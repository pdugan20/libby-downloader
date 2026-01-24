/**
 * Chrome API type extensions and utilities
 */

/**
 * Message sender with tab information
 */
export interface MessageSender extends chrome.runtime.MessageSender {
  tab?: chrome.tabs.Tab;
}

/**
 * Response callback for message handlers
 */
export type MessageResponse = (response?: unknown) => void;

/**
 * Message handler function
 */
export type MessageHandler = (
  message: unknown,
  sender: MessageSender,
  sendResponse: MessageResponse
) => boolean | void;

/**
 * Download options
 */
export interface DownloadOptions {
  url: string;
  filename: string;
  saveAs?: boolean;
  conflictAction?: 'uniquify' | 'overwrite' | 'prompt';
}

/**
 * Download result
 */
export interface DownloadResult {
  downloadId: number;
  success: boolean;
  error?: string;
}
