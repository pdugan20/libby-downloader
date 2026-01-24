/**
 * Centralized logging utility for Libby Downloader
 * Provides consistent log formatting with [Libby Downloader] prefix
 * Respects DEBUG_MODE for enhanced logging in development
 */

import { DEBUG_MODE } from './constants';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private currentLevel: LogLevel;
  private prefix = '[Libby Downloader]';

  constructor() {
    // Set log level based on DEBUG_MODE
    this.currentLevel = DEBUG_MODE ? LogLevel.DEBUG : LogLevel.INFO;
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Log a debug message (only shown when DEBUG_MODE is true)
   * @param message - Debug message text
   * @param context - Optional structured data to log with message
   */
  debug(message: string, context?: LogContext): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      if (context) {
        console.log(`${this.prefix} [DEBUG]`, message, context);
      } else {
        console.log(`${this.prefix} [DEBUG]`, message);
      }
    }
  }

  /**
   * Log an informational message
   * @param message - Info message text
   * @param context - Optional structured data to log with message
   */
  info(message: string, context?: LogContext): void {
    if (this.currentLevel <= LogLevel.INFO) {
      if (context) {
        console.log(`${this.prefix}`, message, context);
      } else {
        console.log(`${this.prefix}`, message);
      }
    }
  }

  /**
   * Log a warning message
   * @param message - Warning message text
   * @param context - Optional structured data to log with message
   */
  warn(message: string, context?: LogContext): void {
    if (this.currentLevel <= LogLevel.WARN) {
      if (context) {
        console.warn(`${this.prefix} [WARN]`, message, context);
      } else {
        console.warn(`${this.prefix} [WARN]`, message);
      }
    }
  }

  /**
   * Log an error message with optional error object and context
   * Includes stack traces when DEBUG_MODE is true.
   * @param message - Error message text
   * @param error - Optional Error object or error value
   * @param context - Optional structured data to log with message
   * @example
   * ```typescript
   * try {
   *   await downloadChapter(chapter);
   * } catch (error) {
   *   logger.error('Failed to download chapter', error, { chapterIndex: 3 });
   * }
   * ```
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      if (error instanceof Error) {
        console.error(`${this.prefix} [ERROR]`, message, {
          error: error.message,
          stack: DEBUG_MODE ? error.stack : undefined,
          ...context,
        });
      } else if (error !== undefined) {
        console.error(`${this.prefix} [ERROR]`, message, { error, ...context });
      } else if (context) {
        console.error(`${this.prefix} [ERROR]`, message, context);
      } else {
        console.error(`${this.prefix} [ERROR]`, message);
      }
    }
  }

  /**
   * Log the start of an operation (debug level only)
   * Convenience wrapper for structured operation logging.
   * @param operation - Operation name (e.g., "Download chapter", "Extract metadata")
   * @param context - Optional structured data about the operation
   */
  operationStart(operation: string, context?: LogContext): void {
    this.debug(`Starting: ${operation}`, context);
  }

  /**
   * Log the successful completion of an operation (debug level only)
   * Convenience wrapper for structured operation logging.
   * @param operation - Operation name (e.g., "Download chapter", "Extract metadata")
   * @param context - Optional structured data about the operation
   */
  operationComplete(operation: string, context?: LogContext): void {
    this.debug(`Completed: ${operation}`, context);
  }

  /**
   * Log the failure of an operation (error level)
   * Convenience wrapper for structured operation error logging.
   * @param operation - Operation name (e.g., "Download chapter", "Extract metadata")
   * @param error - Error object or error value
   * @param context - Optional structured data about the operation
   */
  operationFailed(operation: string, error: Error | unknown, context?: LogContext): void {
    this.error(`Failed: ${operation}`, error, context);
  }
}

export const logger = new Logger();
