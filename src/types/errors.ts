/**
 * Custom error types for Libby Downloader
 */

/**
 * Base error class for Libby Downloader errors
 */
export class LibbyDownloaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LibbyDownloaderError';
    Object.setPrototypeOf(this, LibbyDownloaderError.prototype);
  }
}

/**
 * Error thrown when book extraction fails
 */
export class ExtractionError extends LibbyDownloaderError {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ExtractionError';
    Object.setPrototypeOf(this, ExtractionError.prototype);
  }
}

/**
 * Error thrown when book data validation fails
 */
export class ValidationError extends LibbyDownloaderError {
  constructor(
    message: string,
    public readonly invalidData?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when a download operation fails
 */
export class DownloadError extends LibbyDownloaderError {
  constructor(
    message: string,
    public readonly chapterIndex?: number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DownloadError';
    Object.setPrototypeOf(this, DownloadError.prototype);
  }
}

/**
 * Error thrown when iframe communication fails
 */
export class IframeError extends LibbyDownloaderError {
  constructor(
    message: string,
    public readonly origin?: string
  ) {
    super(message);
    this.name = 'IframeError';
    Object.setPrototypeOf(this, IframeError.prototype);
  }
}

/**
 * Error thrown when a timeout occurs
 */
export class TimeoutError extends LibbyDownloaderError {
  constructor(
    message: string,
    public readonly timeoutMs?: number
  ) {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}
