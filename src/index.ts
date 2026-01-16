/**
 * Libby Downloader - Programmatic API
 *
 * This module exports the public API for using Libby Downloader as a library.
 *
 * @example
 * ```typescript
 * import { DownloadOrchestrator, Config } from 'libby-downloader';
 *
 * const orchestrator = await DownloadOrchestrator.create('balanced', false);
 *
 * const result = await orchestrator.downloadBook({
 *   bookId: 'your-book-id',
 *   outputDir: './downloads',
 *   mode: 'balanced',
 *   merge: true,
 *   metadata: true,
 *   headless: false,
 * });
 *
 * console.log(`Downloaded: ${result.outputPath}`);
 * await orchestrator.cleanup();
 * ```
 *
 * @packageDocumentation
 */

// Core classes
export { DownloadOrchestrator } from './core/orchestrator';
export type { DownloadOptions, DownloadResult } from './core/orchestrator';

export { Config, getConfig } from './core/config';
export { StateManager, getStateManager, resetStateManager } from './core/state-manager';
export type { DownloadState } from './core/state-manager';

// Browser management
export { BrowserManager } from './browser/manager';

// Authentication
export { LibbyAuth } from './auth/libby-auth';

// Libby API
export { LibbyAPI } from './downloader/libby-api';

// Downloading
export {
  ChapterDownloader,
  type ChapterStartEvent,
  type ChapterCompleteEvent,
  type ChapterErrorEvent,
  type BreakStartEvent,
  type BreakEndEvent,
} from './downloader/chapter-downloader';

// Audio processing
export { FFmpegProcessor } from './processor/ffmpeg-processor';
export { MetadataEmbedder } from './metadata/embedder';

// Rate limiting
export { RateLimiter } from './utils/rate-limiter';

// Error classes
export {
  LibbyError,
  AuthenticationError,
  ValidationError,
  DownloadError,
  FFmpegError,
  NetworkError,
  ExtractionError,
  RateLimitError,
  ErrorCode,
  wrapError,
  isRetryableError,
} from './core/errors';

// Types
export type {
  LibbyBook,
  LibbyChapter,
  DownloadProgress,
  StealthConfig,
  AudioMetadata,
  ChapterMetadata,
  SessionConfig,
  DownloadConfig,
  LibbyCredentials,
} from './types';

// Logger
export { logger, LogLevel } from './utils/logger';

// Utilities
export { sleep, sleepRandom, randomDelay, formatDuration } from './utils/delay';
export { ensureDir, sanitizeFilename, formatBytes } from './utils/fs';
export { retry } from './utils/retry';
export type { RetryOptions } from './utils/retry';

/**
 * Library version
 */
export const VERSION = '1.0.0';
