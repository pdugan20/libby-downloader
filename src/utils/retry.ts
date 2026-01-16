import { logger } from './logger';
import { sleep } from './delay';
import { isRetryableError } from '../core/errors';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitterMs: 1000, // +/- 1 second of randomness
  onRetry: (attempt, error, delayMs) => {
    logger.warn(`Retry attempt ${attempt} after ${delayMs}ms: ${error.message}`);
  },
};

/**
 * Calculate delay with exponential backoff and jitter
 *
 * Formula: min(maxDelay, baseDelay * (multiplier ^ attempt)) +/- random jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);
  const jitter = (Math.random() - 0.5) * 2 * options.jitterMs;
  return Math.max(0, Math.round(cappedDelay + jitter));
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param operation Function to retry
 * @param options Retry configuration
 * @param shouldRetry Optional predicate to determine if error is retryable (defaults to isRetryableError)
 * @returns Result of the operation
 * @throws Last error if all retries exhausted
 *
 * @example
 * ```ts
 * const result = await retry(
 *   async () => downloadChapter(url),
 *   { maxAttempts: 3, baseDelayMs: 1000 }
 * );
 * ```
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  shouldRetry: (error: unknown) => boolean = isRetryableError
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        logger.debug(`Error not retryable, failing immediately`);
        throw error;
      }

      // Check if we have attempts left
      if (attempt >= opts.maxAttempts) {
        logger.debug(`Max retry attempts (${opts.maxAttempts}) reached`);
        throw error;
      }

      // Calculate delay and notify
      const delayMs = calculateDelay(attempt, opts);
      if (opts.onRetry && error instanceof Error) {
        opts.onRetry(attempt, error, delayMs);
      }

      // Wait before next attempt
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError;
}

/**
 * Retry with custom predicate
 *
 * @example
 * ```ts
 * const result = await retryIf(
 *   async () => fetchData(),
 *   (error) => error instanceof NetworkError,
 *   { maxAttempts: 5 }
 * );
 * ```
 */
export async function retryIf<T>(
  operation: () => Promise<T>,
  predicate: (error: unknown) => boolean,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return retry(operation, options, predicate);
}

/**
 * Retry with timeout per attempt
 *
 * @example
 * ```ts
 * const result = await retryWithTimeout(
 *   async () => downloadFile(),
 *   { maxAttempts: 3, timeoutMs: 30000 }
 * );
 * ```
 */
export async function retryWithTimeout<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions & { timeoutMs: number }> = {}
): Promise<T> {
  const { timeoutMs, ...retryOptions } = options;

  if (!timeoutMs) {
    return retry(operation, retryOptions);
  }

  const operationWithTimeout = async (): Promise<T> => {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      ),
    ]);
  };

  return retry(operationWithTimeout, retryOptions);
}
