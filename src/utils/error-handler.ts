import { logger } from './logger';
import { LibbyError } from '../core/errors';
import { retry, RetryOptions } from './retry';

/**
 * Higher-order function to wrap async functions with error logging
 *
 * @example
 * ```ts
 * const safeDownload = withLogging(downloadChapter, 'Download chapter');
 * await safeDownload(chapter, outputPath);
 * ```
 */
export function withLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      logger.debug(`Starting: ${operationName}`);
      const result = await fn(...args);
      logger.debug(`Completed: ${operationName}`);
      return result;
    } catch (error) {
      if (error instanceof LibbyError) {
        logger.error(`${operationName} failed:`, error);
      } else if (error instanceof Error) {
        logger.error(`${operationName} failed: ${error.message}`, error);
      } else {
        logger.error(`${operationName} failed: ${String(error)}`);
      }
      throw error;
    }
  }) as T;
}

/**
 * Higher-order function to wrap async functions with retry logic
 *
 * @example
 * ```ts
 * const resilientDownload = withRetry(downloadChapter, { maxAttempts: 3 });
 * await resilientDownload(chapter, outputPath);
 * ```
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: Partial<RetryOptions> = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return retry(() => fn(...args), options);
  }) as T;
}

/**
 * Higher-order function to wrap async functions with both logging and retry
 *
 * @example
 * ```ts
 * const safeRetriedDownload = withLoggingAndRetry(
 *   downloadChapter,
 *   'Download chapter',
 *   { maxAttempts: 3 }
 * );
 * await safeRetriedDownload(chapter, outputPath);
 * ```
 */
export function withLoggingAndRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string,
  retryOptions: Partial<RetryOptions> = {}
): T {
  const withRetryFn = withRetry(fn, retryOptions);
  return withLogging(withRetryFn, operationName);
}

/**
 * Higher-order function to catch and transform errors
 *
 * @example
 * ```ts
 * const safeDownload = withErrorHandler(
 *   downloadChapter,
 *   (error) => new DownloadError('Failed to download', ErrorCode.DOWNLOAD_FAILED, error)
 * );
 * ```
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler: (error: unknown) => Error
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw errorHandler(error);
    }
  }) as T;
}

/**
 * Safely execute an async function and return a result object instead of throwing
 * Useful for batch operations where you want to continue on error
 *
 * @example
 * ```ts
 * const result = await safeExecute(async () => downloadChapter(chapter));
 * if (result.success) {
 *   console.log('Downloaded:', result.data);
 * } else {
 *   console.error('Failed:', result.error);
 * }
 * ```
 */
export async function safeExecute<T>(
  fn: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Execute multiple async operations in parallel and return results
 * Continues execution even if some operations fail
 *
 * @example
 * ```ts
 * const results = await safeParallel([
 *   () => downloadChapter(chapter1),
 *   () => downloadChapter(chapter2),
 *   () => downloadChapter(chapter3),
 * ]);
 *
 * const successful = results.filter(r => r.success).length;
 * const failed = results.filter(r => !r.success).length;
 * ```
 */
export async function safeParallel<T>(
  operations: Array<() => Promise<T>>
): Promise<Array<{ success: true; data: T } | { success: false; error: Error }>> {
  return Promise.all(operations.map((op) => safeExecute(op)));
}

/**
 * Wrap a class method with error logging (for use in classes)
 *
 * @example
 * ```ts
 * class MyService {
 *   constructor() {
 *     this.downloadChapter = wrapMethod(this.downloadChapter.bind(this), 'Download chapter');
 *   }
 *   async downloadChapter(id: string) {
 *     // implementation
 *   }
 * }
 * ```
 */
export function wrapMethod<T extends (...args: any[]) => Promise<any>>(
  method: T,
  operationName: string
): T {
  return withLogging(method, operationName);
}
