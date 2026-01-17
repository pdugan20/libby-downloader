/**
 * Libby Downloader - Programmatic API
 *
 * This module exports utilities for working with audiobooks downloaded via the Libby Chrome extension.
 *
 * @example
 * ```typescript
 * import { MetadataEmbedder, discoverBooks } from 'libby-downloader';
 *
 * // Find all downloaded books
 * const books = await discoverBooks();
 *
 * // Tag a book's MP3 files with metadata
 * const embedder = new MetadataEmbedder();
 * await embedder.tagFiles(books[0].path);
 * ```
 *
 * @packageDocumentation
 */

// Metadata embedding
export { MetadataEmbedder } from './metadata/embedder';

// Book discovery and management
export {
  discoverBooks,
  findBook,
  analyzeBook,
  getDownloadsFolder,
  formatTimeAgo,
} from './utils/books';
export type { BookInfo } from './utils/books';

// Types
export type { LibbyBook, LibbyChapter, AudioMetadata, ChapterMetadata } from './types';

// Logger
export { logger, LogLevel } from './utils/logger';

// File utilities
export { ensureDir, sanitizeFilename, formatBytes } from './utils/fs';

/**
 * Library version
 */
export const VERSION = '1.0.0';
