/**
 * Centralized logging utility for Libby Downloader
 * Provides consistent log formatting with [Libby Downloader] prefix
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private currentLevel: LogLevel = LogLevel.INFO;
  private prefix = '[Libby Downloader]';

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.log(`${this.prefix} [DEBUG]`, message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      console.log(`${this.prefix}`, message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.WARN) {
      console.warn(`${this.prefix} [WARN]`, message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      console.error(`${this.prefix} [ERROR]`, message, ...args);
    }
  }
}

export const logger = new Logger();
