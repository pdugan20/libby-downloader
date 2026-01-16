import { promises as fs, statSync, accessSync, constants } from 'fs';
import * as path from 'path';
import { ValidationError, ErrorCode } from '../core/errors';

/**
 * Validation utilities for user inputs
 */

/**
 * Validate book ID format
 * Book IDs should contain only alphanumeric characters and hyphens
 */
export function validateBookId(bookId: string): void {
  if (!bookId || typeof bookId !== 'string') {
    throw new ValidationError('Book ID is required', ErrorCode.INVALID_BOOK_ID);
  }

  // Trim whitespace
  const trimmed = bookId.trim();

  if (trimmed.length === 0) {
    throw new ValidationError('Book ID cannot be empty', ErrorCode.INVALID_BOOK_ID);
  }

  // Check format: alphanumeric + hyphens + slashes (for loanId/bookId format)
  const validFormat = /^[a-zA-Z0-9/-]+$/;
  if (!validFormat.test(trimmed)) {
    throw new ValidationError(
      `Invalid book ID format: "${bookId}". Book IDs should contain only letters, numbers, hyphens, and slashes.`,
      ErrorCode.INVALID_BOOK_ID
    );
  }

  // Check reasonable length (Libby book IDs are typically 8-40 characters)
  if (trimmed.length < 3 || trimmed.length > 100) {
    throw new ValidationError(
      `Invalid book ID length: "${bookId}". Book IDs should be between 3 and 100 characters.`,
      ErrorCode.INVALID_BOOK_ID
    );
  }
}

/**
 * Validate download mode
 */
export function validateMode(mode: string): asserts mode is 'safe' | 'balanced' | 'aggressive' {
  const validModes = ['safe', 'balanced', 'aggressive'];

  if (!validModes.includes(mode)) {
    throw new ValidationError(
      `Invalid mode: "${mode}". Must be one of: ${validModes.join(', ')}`,
      ErrorCode.INVALID_MODE
    );
  }
}

/**
 * Validate file path format
 * Checks for invalid characters and path injection attempts
 */
export function validateFilePath(filePath: string, label: string = 'Path'): void {
  if (!filePath || typeof filePath !== 'string') {
    throw new ValidationError(`${label} is required`, ErrorCode.INVALID_OUTPUT_DIR);
  }

  const trimmed = filePath.trim();

  if (trimmed.length === 0) {
    throw new ValidationError(`${label} cannot be empty`, ErrorCode.INVALID_OUTPUT_DIR);
  }

  // Check for null bytes (path injection attempt)
  if (trimmed.includes('\0')) {
    throw new ValidationError(`${label} contains invalid null bytes`, ErrorCode.INVALID_OUTPUT_DIR);
  }

  // Check for relative path traversal attempts
  // For security, reject any path containing '..' regardless of normalization
  // Users should provide clean paths without parent directory references
  if (trimmed.includes('..')) {
    throw new ValidationError(
      `${label} contains invalid path traversal (..)`,
      ErrorCode.INVALID_OUTPUT_DIR
    );
  }
}

/**
 * Validate that a directory exists and is writable
 */
export async function validateOutputDirectory(dirPath: string): Promise<void> {
  // First validate the path format
  validateFilePath(dirPath, 'Output directory');

  try {
    // Check if path exists
    const stats = await fs.stat(dirPath);

    // Check if it's a directory
    if (!stats.isDirectory()) {
      throw new ValidationError(
        `Output path is not a directory: ${dirPath}`,
        ErrorCode.INVALID_OUTPUT_DIR
      );
    }

    // Check if directory is writable
    await fs.access(dirPath, constants.W_OK);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Directory doesn't exist - that's okay, we'll create it
      // But validate that the parent directory exists and is writable
      const parentDir = path.dirname(dirPath);

      try {
        await fs.access(parentDir, constants.W_OK);
      } catch {
        throw new ValidationError(
          `Cannot create output directory (parent directory not writable): ${parentDir}`,
          ErrorCode.INVALID_OUTPUT_DIR
        );
      }
    } else if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new ValidationError(
        `Output directory is not writable: ${dirPath}`,
        ErrorCode.INVALID_OUTPUT_DIR
      );
    } else if (error instanceof ValidationError) {
      throw error;
    } else {
      throw new ValidationError(
        `Invalid output directory: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INVALID_OUTPUT_DIR
      );
    }
  }
}

/**
 * Synchronous version of validateOutputDirectory (for CLI startup)
 * Returns true if valid, throws ValidationError if invalid
 */
export function validateOutputDirectorySync(dirPath: string): void {
  // First validate the path format
  validateFilePath(dirPath, 'Output directory');

  try {
    // Check if path exists
    const stats = statSync(dirPath);

    // Check if it's a directory
    if (!stats.isDirectory()) {
      throw new ValidationError(
        `Output path is not a directory: ${dirPath}`,
        ErrorCode.INVALID_OUTPUT_DIR
      );
    }

    // Check if directory is writable
    accessSync(dirPath, constants.W_OK);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Directory doesn't exist - that's okay, we'll create it
      // But validate that the parent directory exists and is writable
      const parentDir = path.dirname(dirPath);

      try {
        accessSync(parentDir, constants.W_OK);
      } catch {
        throw new ValidationError(
          `Cannot create output directory (parent directory not writable): ${parentDir}`,
          ErrorCode.INVALID_OUTPUT_DIR
        );
      }
    } else if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new ValidationError(
        `Output directory is not writable: ${dirPath}`,
        ErrorCode.INVALID_OUTPUT_DIR
      );
    } else if (error instanceof ValidationError) {
      throw error;
    } else {
      throw new ValidationError(
        `Invalid output directory: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INVALID_OUTPUT_DIR
      );
    }
  }
}

/**
 * Validate all CLI inputs for download command
 */
export interface DownloadInputs {
  bookId: string;
  outputDir: string;
  mode: string;
  merge: boolean;
  metadata: boolean;
  headless: boolean;
}

export function validateDownloadInputs(inputs: DownloadInputs): void {
  // Validate book ID
  validateBookId(inputs.bookId);

  // Validate mode
  validateMode(inputs.mode);

  // Validate output directory path format (existence check happens later)
  validateFilePath(inputs.outputDir, 'Output directory');

  // Boolean flags don't need validation (they're always boolean in Commander)
}

/**
 * Sanitize user input by trimming whitespace
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim();
}
