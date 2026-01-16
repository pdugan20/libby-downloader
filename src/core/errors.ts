/**
 * Custom error classes for libby-downloader
 *
 * Provides typed, actionable errors with recovery hints
 */

export enum ErrorCode {
  // Authentication errors (1xxx)
  NOT_AUTHENTICATED = 'ERR_NOT_AUTHENTICATED',
  SESSION_EXPIRED = 'ERR_SESSION_EXPIRED',
  LOGIN_TIMEOUT = 'ERR_LOGIN_TIMEOUT',

  // Validation errors (2xxx)
  INVALID_BOOK_ID = 'ERR_INVALID_BOOK_ID',
  INVALID_OUTPUT_DIR = 'ERR_INVALID_OUTPUT_DIR',
  INVALID_MODE = 'ERR_INVALID_MODE',
  INVALID_CONFIG = 'ERR_INVALID_CONFIG',

  // Download errors (3xxx)
  BOOK_NOT_FOUND = 'ERR_BOOK_NOT_FOUND',
  NO_CHAPTERS_FOUND = 'ERR_NO_CHAPTERS_FOUND',
  CHAPTER_DOWNLOAD_FAILED = 'ERR_CHAPTER_DOWNLOAD_FAILED',
  DOWNLOAD_TIMEOUT = 'ERR_DOWNLOAD_TIMEOUT',
  NETWORK_ERROR = 'ERR_NETWORK_ERROR',

  // Processing errors (4xxx)
  FFMPEG_NOT_FOUND = 'ERR_FFMPEG_NOT_FOUND',
  MERGE_FAILED = 'ERR_MERGE_FAILED',
  METADATA_FAILED = 'ERR_METADATA_FAILED',
  CHAPTER_MARKERS_FAILED = 'ERR_CHAPTER_MARKERS_FAILED',

  // Extraction errors (5xxx)
  BIF_EXTRACTION_FAILED = 'ERR_BIF_EXTRACTION_FAILED',
  METADATA_EXTRACTION_FAILED = 'ERR_METADATA_EXTRACTION_FAILED',
  CHAPTER_EXTRACTION_FAILED = 'ERR_CHAPTER_EXTRACTION_FAILED',

  // Rate limiting errors (6xxx)
  RATE_LIMIT_EXCEEDED = 'ERR_RATE_LIMIT_EXCEEDED',

  // System errors (9xxx)
  UNKNOWN_ERROR = 'ERR_UNKNOWN',
}

/**
 * Base error class for all libby-downloader errors
 */
export class LibbyError extends Error {
  public readonly code: ErrorCode;
  public readonly recoveryHint?: string;
  public readonly originalError?: Error;

  constructor(message: string, code: ErrorCode, recoveryHint?: string, originalError?: Error) {
    super(message);
    this.name = 'LibbyError';
    this.code = code;
    this.recoveryHint = recoveryHint;
    this.originalError = originalError;

    // Maintain proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Format error for display
   */
  toDisplayString(): string {
    let output = `[${this.code}] ${this.message}`;
    if (this.recoveryHint) {
      output += `\n\nSuggestion: ${this.recoveryHint}`;
    }
    return output;
  }
}

/**
 * Authentication-related errors
 */
export class AuthenticationError extends LibbyError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.NOT_AUTHENTICATED,
    originalError?: Error
  ) {
    const hints: Record<string, string> = {
      [ErrorCode.NOT_AUTHENTICATED]: 'Run: libby login',
      [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Run: libby login',
      [ErrorCode.LOGIN_TIMEOUT]: 'Login took too long. Try again with more time.',
    };

    super(message, code, hints[code], originalError);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validation-related errors
 */
export class ValidationError extends LibbyError {
  constructor(message: string, code: ErrorCode, originalError?: Error) {
    const hints: Record<string, string> = {
      [ErrorCode.INVALID_BOOK_ID]: 'Book ID should contain only letters, numbers, and hyphens',
      [ErrorCode.INVALID_OUTPUT_DIR]: 'Check that the output directory exists and is writable',
      [ErrorCode.INVALID_MODE]: 'Mode must be one of: safe, balanced, aggressive',
      [ErrorCode.INVALID_CONFIG]: 'Check your configuration file for syntax errors',
    };

    super(message, code, hints[code], originalError);
    this.name = 'ValidationError';
  }
}

/**
 * Download-related errors
 */
export class DownloadError extends LibbyError {
  public readonly bookId?: string;
  public readonly chapterIndex?: number;

  constructor(
    message: string,
    code: ErrorCode,
    bookId?: string,
    chapterIndex?: number,
    originalError?: Error
  ) {
    const hints: Record<string, string> = {
      [ErrorCode.BOOK_NOT_FOUND]: 'Check that the book ID is correct and the book is borrowed',
      [ErrorCode.NO_CHAPTERS_FOUND]: 'The book may not be an audiobook or data extraction failed',
      [ErrorCode.CHAPTER_DOWNLOAD_FAILED]:
        'The chapter download failed. Retry logic will attempt again.',
      [ErrorCode.DOWNLOAD_TIMEOUT]: 'Network timeout. Check your internet connection.',
      [ErrorCode.NETWORK_ERROR]: 'Network error. Check your internet connection and try again.',
    };

    super(message, code, hints[code], originalError);
    this.name = 'DownloadError';
    this.bookId = bookId;
    this.chapterIndex = chapterIndex;
  }
}

/**
 * FFmpeg processing errors
 */
export class FFmpegError extends LibbyError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.FFMPEG_NOT_FOUND,
    originalError?: Error
  ) {
    const hints: Record<string, string> = {
      [ErrorCode.FFMPEG_NOT_FOUND]:
        'Install FFmpeg: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)',
      [ErrorCode.MERGE_FAILED]: 'Chapter merging failed. Check FFmpeg logs for details.',
      [ErrorCode.METADATA_FAILED]:
        'Metadata embedding failed. The audio file may still be playable.',
      [ErrorCode.CHAPTER_MARKERS_FAILED]:
        'Chapter markers failed. The merged file is still usable.',
    };

    super(message, code, hints[code], originalError);
    this.name = 'FFmpegError';
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends LibbyError {
  public readonly statusCode?: number;
  public readonly url?: string;

  constructor(message: string, statusCode?: number, url?: string, originalError?: Error) {
    const hint = statusCode
      ? `HTTP ${statusCode}: Check your network connection and try again.`
      : 'Network error. Check your internet connection.';

    super(message, ErrorCode.NETWORK_ERROR, hint, originalError);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    this.url = url;
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends LibbyError {
  public readonly waitTimeMs: number;

  constructor(message: string, waitTimeMs: number) {
    const waitMinutes = Math.ceil(waitTimeMs / 1000 / 60);
    const hint = `You've exceeded the rate limit. Wait ${waitMinutes} minute(s) before downloading again.`;

    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, hint);
    this.name = 'RateLimitError';
    this.waitTimeMs = waitTimeMs;
  }
}

/**
 * Data extraction errors
 */
export class ExtractionError extends LibbyError {
  constructor(message: string, code: ErrorCode, originalError?: Error) {
    const hints: Record<string, string> = {
      [ErrorCode.BIF_EXTRACTION_FAILED]:
        'Failed to extract book data from Libby. The page structure may have changed.',
      [ErrorCode.METADATA_EXTRACTION_FAILED]:
        'Failed to extract book metadata. Try refreshing and downloading again.',
      [ErrorCode.CHAPTER_EXTRACTION_FAILED]:
        'Failed to extract chapter URLs. The book format may not be supported.',
    };

    super(message, code, hints[code], originalError);
    this.name = 'ExtractionError';
  }
}

/**
 * Helper to wrap unknown errors
 */
export function wrapError(error: unknown, context?: string): LibbyError {
  if (error instanceof LibbyError) {
    return error;
  }

  if (error instanceof Error) {
    return new LibbyError(
      context ? `${context}: ${error.message}` : error.message,
      ErrorCode.UNKNOWN_ERROR,
      'An unexpected error occurred. Check the logs for details.',
      error
    );
  }

  return new LibbyError(
    context ? `${context}: ${String(error)}` : String(error),
    ErrorCode.UNKNOWN_ERROR,
    'An unexpected error occurred. Check the logs for details.'
  );
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof LibbyError)) {
    return false;
  }

  const retryableCodes = [
    ErrorCode.CHAPTER_DOWNLOAD_FAILED,
    ErrorCode.DOWNLOAD_TIMEOUT,
    ErrorCode.NETWORK_ERROR,
  ];

  return retryableCodes.includes(error.code);
}
