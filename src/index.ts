/**
 * Libby Downloader - Programmatic API
 *
 * This module exports utilities for working with audiobooks downloaded via the Libby Chrome extension.
 *
 * @example
 * ```typescript
 * import { BookService, MetadataService } from 'libby-downloader';
 *
 * // Find all downloaded books
 * const bookService = new BookService();
 * const books = await bookService.discoverBooks();
 *
 * // Tag a book's MP3 files with metadata
 * const metadataService = new MetadataService();
 * await metadataService.embedToFolder(books[0].path);
 * ```
 *
 * @packageDocumentation
 */

// Core services
export { BookService } from './services/book-service';
export { MetadataService } from './services/metadata-service';
export { FileService } from './services/file-service';

// Types
export type { BookInfo } from './types/book';

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
