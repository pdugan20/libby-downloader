/**
 * Validation utilities for Libby Downloader extension
 * Provides security validation for message origins and data
 */

/**
 * Valid origin patterns for postMessage communication
 * Supports both exact matches and subdomains (e.g., dewey-abc123.listen.libbyapp.com)
 * Only accept messages from Libby's iframe domains
 */
const VALID_ORIGIN_PATTERNS = [
  /^https:\/\/([a-z0-9-]+\.)?listen\.libbyapp\.com$/,
  /^https:\/\/([a-z0-9-]+\.)?thunder\.libbyapp\.com$/,
];

/**
 * Validate message origin for security
 * @param {string} origin - The origin from event.origin
 * @returns {boolean} True if origin is valid
 */
export function validateOrigin(origin) {
  // Allow same-origin messages (from extension itself)
  if (origin === window.location.origin) {
    return true;
  }

  // Check against pattern whitelist
  return VALID_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

/**
 * Validate message structure
 * @param {object} data - The message data
 * @param {string} expectedType - Expected message type
 * @returns {boolean} True if message structure is valid
 */
export function validateMessage(data, expectedType) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (!data.type || data.type !== expectedType) {
    return false;
  }

  return true;
}

/**
 * Validate book data structure from extraction
 * @param {object} bookData - Book data from extraction
 * @returns {boolean} True if book data is valid
 */
export function validateBookData(bookData) {
  if (!bookData || typeof bookData !== 'object') {
    return false;
  }

  // Check required metadata fields
  if (!bookData.metadata || typeof bookData.metadata !== 'object') {
    return false;
  }

  const { metadata, chapters } = bookData;

  if (!metadata.title || typeof metadata.title !== 'string') {
    return false;
  }

  if (!Array.isArray(metadata.authors) || metadata.authors.length === 0) {
    return false;
  }

  // Check chapters array
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return false;
  }

  // Validate first chapter structure
  const firstChapter = chapters[0];
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

/**
 * Sanitize filename for safe filesystem usage
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
  return filename.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim();
}

/**
 * Validate URL is from Libby domain
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is from valid Libby domain
 */
export function validateLibbyUrl(url) {
  try {
    const urlObj = new URL(url);
    return VALID_ORIGIN_PATTERNS.some((pattern) => pattern.test(urlObj.origin));
  } catch {
    return false;
  }
}
