import {
  withLogging,
  withRetry,
  withLoggingAndRetry,
  withErrorHandler,
  safeExecute,
  safeParallel,
} from '../error-handler';
import { LibbyError, ErrorCode } from '../../core/errors';

// Mock logger to avoid chalk ES module issues in Jest
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('error-handler utilities', () => {
  describe('withLogging', () => {
    it('should log successful operations', async () => {
      const mockFn = jest.fn(async (x: number) => x * 2);
      const wrappedFn = withLogging(mockFn, 'Test operation');

      const result = await wrappedFn(5);

      expect(result).toBe(10);
      expect(mockFn).toHaveBeenCalledWith(5);
    });

    it('should log and rethrow errors', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn(async () => {
        throw error;
      });
      const wrappedFn = withLogging(mockFn, 'Test operation');

      await expect(wrappedFn()).rejects.toThrow('Test error');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should handle LibbyError specially', async () => {
      const error = new LibbyError('Test error', ErrorCode.DOWNLOAD_TIMEOUT);
      const mockFn = jest.fn(async () => {
        throw error;
      });
      const wrappedFn = withLogging(mockFn, 'Test operation');

      await expect(wrappedFn()).rejects.toThrow(LibbyError);
    });
  });

  describe('withRetry', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const mockFn = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new LibbyError('Temporary failure', ErrorCode.NETWORK_ERROR);
        }
        return 'success';
      });

      const wrappedFn = withRetry(mockFn, { maxAttempts: 3, baseDelayMs: 10 });
      const result = await wrappedFn();

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const mockFn = jest.fn(async () => {
        throw new LibbyError('Permanent failure', ErrorCode.NETWORK_ERROR);
      });

      const wrappedFn = withRetry(mockFn, { maxAttempts: 2, baseDelayMs: 10 });

      await expect(wrappedFn()).rejects.toThrow('Permanent failure');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('withLoggingAndRetry', () => {
    it('should combine logging and retry', async () => {
      let attempts = 0;
      const mockFn = jest.fn(async () => {
        attempts++;
        if (attempts < 2) {
          throw new LibbyError('Temporary failure', ErrorCode.NETWORK_ERROR);
        }
        return 'success';
      });

      const wrappedFn = withLoggingAndRetry(mockFn, 'Test operation', {
        maxAttempts: 3,
        baseDelayMs: 10,
      });
      const result = await wrappedFn();

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('withErrorHandler', () => {
    it('should transform errors', async () => {
      const mockFn = jest.fn(async () => {
        throw new Error('Original error');
      });

      const wrappedFn = withErrorHandler(mockFn, (error) => {
        return new Error(`Transformed: ${(error as Error).message}`);
      });

      await expect(wrappedFn()).rejects.toThrow('Transformed: Original error');
    });

    it('should not transform successful results', async () => {
      const mockFn = jest.fn(async () => 'success');

      const wrappedFn = withErrorHandler(mockFn, () => new Error('Should not be called'));

      const result = await wrappedFn();
      expect(result).toBe('success');
    });
  });

  describe('safeExecute', () => {
    it('should return success result for successful operations', async () => {
      const result = await safeExecute(async () => 42);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it('should return error result for failed operations', async () => {
      const result = await safeExecute(async () => {
        throw new Error('Test error');
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Test error');
      }
    });

    it('should convert non-Error throws to Error', async () => {
      const result = await safeExecute(async () => {
        throw 'string error';
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('string error');
      }
    });
  });

  describe('safeParallel', () => {
    it('should execute operations in parallel', async () => {
      const start = Date.now();

      const results = await safeParallel([
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 1;
        },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 2;
        },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 3;
        },
      ]);

      const elapsed = Date.now() - start;

      // Should take ~50ms (parallel), not ~150ms (sequential)
      expect(elapsed).toBeLessThan(100);
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should continue on partial failures', async () => {
      const results = await safeParallel([
        async () => 'success1',
        async () => {
          throw new Error('failure');
        },
        async () => 'success2',
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);

      if (!results[1].success) {
        expect(results[1].error.message).toBe('failure');
      }
    });

    it('should return all results even if all fail', async () => {
      const results = await safeParallel([
        async () => {
          throw new Error('error1');
        },
        async () => {
          throw new Error('error2');
        },
      ]);

      expect(results).toHaveLength(2);
      expect(results.every((r) => !r.success)).toBe(true);
    });
  });
});
