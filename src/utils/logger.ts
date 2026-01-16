import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private initialized: boolean = false;

  /**
   * Initialize logger from environment configuration
   * This is called lazily on first use to avoid circular dependencies
   */
  private ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    // Read LOG_LEVEL from environment with fallback to INFO
    const envLevel = (process.env.LIBBY_LOG_LEVEL || process.env.LOG_LEVEL || 'info').toLowerCase();

    const levelMap: Record<string, LogLevel> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
      silent: LogLevel.SILENT,
    };

    if (envLevel in levelMap) {
      this.level = levelMap[envLevel];
    } else {
      this.level = LogLevel.INFO;
      console.warn(
        chalk.yellow(
          `[WARN] Invalid log level "${envLevel}". Defaulting to INFO. Valid levels: debug, info, warn, error, silent`
        )
      );
    }

    this.initialized = true;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
    this.initialized = true;
  }

  debug(message: string, ...args: any[]): void {
    this.ensureInitialized();
    if (this.level <= LogLevel.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    this.ensureInitialized();
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    this.ensureInitialized();
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    this.ensureInitialized();
    if (this.level <= LogLevel.WARN) {
      console.warn(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  error(message: string, error?: Error | any, ...args: any[]): void {
    this.ensureInitialized();
    if (this.level <= LogLevel.ERROR) {
      console.error(chalk.red(`[ERROR] ${message}`), ...args);
      if (error instanceof Error) {
        console.error(chalk.red(error.stack || error.message));
      } else if (error) {
        console.error(chalk.red(JSON.stringify(error, null, 2)));
      }
    }
  }
}

export const logger = new Logger();
