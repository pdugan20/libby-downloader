/**
 * Shared validators for Libby Downloader
 */

import type { BookData } from '../types/extension-book';

/**
 * Valid origin patterns for Libby domains
 * Supports both exact matches and subdomains (e.g., dewey-abc123.listen.libbyapp.com)
 */
const VALID_ORIGIN_PATTERNS = [
  /^https:\/\/([a-z0-9-]+\.)?listen\.libbyapp\.com$/,
  /^https:\/\/([a-z0-9-]+\.)?thunder\.libbyapp\.com$/,
];

/**
 * Validate that a message origin is from a trusted Libby domain
 * @param origin - The origin to validate
 * @returns True if origin is valid, false otherwise
 */
export function validateOrigin(origin: string): boolean {
  if (origin === window.location.origin) {
    return true;
  }
  return VALID_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

/** Any HTTPS Libby origin: the top-level app or one of its player subdomains. */
const LIBBY_ORIGIN_PATTERN = /^https:\/\/([a-z0-9-]+\.)*libbyapp\.com$/;

/**
 * Whether a message received inside the player iframe came from the Libby
 * page that embeds it. Other frames and windows can post to the iframe too,
 * so both the sender window and its origin must match.
 */
export function isTrustedParentMessage(
  event: Pick<MessageEvent, 'origin' | 'source'>,
  parent: Window = window.parent
): boolean {
  return event.source === parent && LIBBY_ORIGIN_PATTERN.test(event.origin);
}

/**
 * Validate book data structure for completeness and correctness
 * @param bookData - The book data to validate
 * @returns True if book data is valid (with type narrowing)
 */
export function validateBookData(bookData: unknown): bookData is BookData {
  if (!bookData || typeof bookData !== 'object') {
    return false;
  }

  const data = bookData as Record<string, unknown>;

  if (!data.metadata || typeof data.metadata !== 'object') {
    return false;
  }

  const { metadata, chapters } = data as {
    metadata: Record<string, unknown>;
    chapters: unknown;
  };

  if (!metadata.title || typeof metadata.title !== 'string') {
    return false;
  }

  if (!Array.isArray(metadata.authors)) {
    return false;
  }

  if (!Array.isArray(chapters) || chapters.length === 0) {
    return false;
  }

  return chapters.every((chapter: unknown) => {
    if (!chapter || typeof chapter !== 'object') return false;
    const item = chapter as Record<string, unknown>;
    if (
      typeof item.index !== 'number' ||
      typeof item.title !== 'string' ||
      typeof item.url !== 'string' ||
      typeof item.duration !== 'number'
    )
      return false;
    try {
      const url = new URL(item.url);
      return (
        ['http:', 'https:'].includes(url.protocol) && !['?undefined', '?null'].includes(url.search)
      );
    } catch {
      return false;
    }
  });
}

/**
 * Sanitize filename to be filesystem-safe
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 200);
}
