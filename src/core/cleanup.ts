import { logger } from '../utils/logger';

type CleanupHandler = () => Promise<void> | void;

/**
 * Registry for cleanup handlers that run on process exit
 *
 * Handles SIGINT (Ctrl+C) and SIGTERM signals gracefully
 */
export class CleanupRegistry {
  private handlers: CleanupHandler[] = [];
  private isShuttingDown = false;
  private readonly shutdownTimeoutMs: number;

  constructor(shutdownTimeoutMs: number = 10000) {
    this.shutdownTimeoutMs = shutdownTimeoutMs;
  }

  /**
   * Register a cleanup handler
   */
  register(handler: CleanupHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Unregister a cleanup handler
   */
  unregister(handler: CleanupHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index !== -1) {
      this.handlers.splice(index, 1);
    }
  }

  /**
   * Install signal handlers
   */
  install(): void {
    // Handle Ctrl+C (SIGINT)
    process.on('SIGINT', () => {
      logger.info('\nReceived SIGINT (Ctrl+C), shutting down gracefully...');
      this.cleanup(130); // 128 + 2 (SIGINT)
    });

    // Handle kill signal (SIGTERM)
    process.on('SIGTERM', () => {
      logger.info('\nReceived SIGTERM, shutting down gracefully...');
      this.cleanup(143); // 128 + 15 (SIGTERM)
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      this.cleanup(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', reason);
      this.cleanup(1);
    });
  }

  /**
   * Run all cleanup handlers
   */
  private async cleanup(exitCode: number): Promise<void> {
    if (this.isShuttingDown) {
      logger.debug('Already shutting down, ignoring duplicate signal');
      return;
    }

    this.isShuttingDown = true;

    // Set a timeout for cleanup
    const timeoutHandle = setTimeout(() => {
      logger.warn(`Cleanup timeout after ${this.shutdownTimeoutMs}ms, forcing exit`);
      process.exit(exitCode);
    }, this.shutdownTimeoutMs);

    try {
      logger.debug(`Running ${this.handlers.length} cleanup handlers`);

      // Run all cleanup handlers in parallel
      await Promise.all(
        this.handlers.map(async (handler, index) => {
          try {
            await handler();
            logger.debug(`Cleanup handler ${index + 1} completed`);
          } catch (error) {
            logger.error(`Cleanup handler ${index + 1} failed`, error);
          }
        })
      );

      logger.success('Cleanup completed successfully');
    } catch (error) {
      logger.error('Cleanup failed', error);
    } finally {
      clearTimeout(timeoutHandle);
      process.exit(exitCode);
    }
  }

  /**
   * Manual cleanup trigger
   */
  async runCleanup(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    await Promise.all(
      this.handlers.map(async (handler) => {
        try {
          await handler();
        } catch (error) {
          logger.error('Cleanup handler failed', error);
        }
      })
    );
  }
}

// Global cleanup registry
export const cleanupRegistry = new CleanupRegistry();

/**
 * Register a cleanup handler
 *
 * @example
 * ```ts
 * registerCleanupHandler(async () => {
 *   await browser.close();
 * });
 * ```
 */
export function registerCleanupHandler(handler: CleanupHandler): void {
  cleanupRegistry.register(handler);
}

/**
 * Unregister a cleanup handler
 */
export function unregisterCleanupHandler(handler: CleanupHandler): void {
  cleanupRegistry.unregister(handler);
}

/**
 * Install signal handlers (call once at app start)
 */
export function installSignalHandlers(): void {
  cleanupRegistry.install();
}
