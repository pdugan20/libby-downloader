/**
 * Validators for content script
 */

import type { BookData } from '../types/extension-book';

// Valid origin patterns for Libby domains
// Supports both exact matches and subdomains (e.g., dewey-abc123.listen.libbyapp.com)
const VALID_ORIGIN_PATTERNS = [
  /^https:\/\/([a-z0-9-]+\.)?listen\.libbyapp\.com$/,
  /^https:\/\/([a-z0-9-]+\.)?thunder\.libbyapp\.com$/,
];

export function validateOrigin(origin: string): boolean {
  if (origin === window.location.origin) {
    return true;
  }
  return VALID_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

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

  if (!Array.isArray(metadata.authors) || metadata.authors.length === 0) {
    return false;
  }

  if (!Array.isArray(chapters) || chapters.length === 0) {
    return false;
  }

  const firstChapter = chapters[0] as Record<string, unknown>;
  if (
    typeof firstChapter.index !== 'number' ||
    typeof firstChapter.title !== 'string' ||
    typeof firstChapter.url !== 'string' ||
    typeof firstChapter.duration !== 'number'
  ) {
    return false;
  }

  return true;
}
