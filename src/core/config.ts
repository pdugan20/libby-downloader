import { z } from 'zod';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { config as loadEnv } from 'dotenv';
import { logger } from '../utils/logger';
import { ValidationError, ErrorCode } from './errors';

// Load .env file
loadEnv();

/**
 * Zod schemas for configuration validation
 */

const StealthModeConfigSchema = z.object({
  delayBetweenChapters: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }),
  occasionalBreak: z.object({
    enabled: z.boolean(),
    afterChapters: z.number().min(1),
    duration: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }),
  }),
  mouseMovements: z.boolean(),
  randomScrolling: z.boolean(),
  maxBooksPerHour: z.number().min(1),
});

const StealthConfigFileSchema = z.object({
  modes: z.object({
    safe: StealthModeConfigSchema,
    balanced: StealthModeConfigSchema,
    aggressive: StealthModeConfigSchema,
  }),
  defaultMode: z.enum(['safe', 'balanced', 'aggressive']),
});

const SessionConfigSchema = z.object({
  cookiesPath: z.string(),
  userDataDir: z.string(),
  headless: z.boolean(),
});

const DownloadConfigSchema = z.object({
  outputDir: z.string(),
  tempDir: z.string(),
  keepTempFiles: z.boolean(),
  mergeChapters: z.boolean(),
  embedMetadata: z.boolean(),
});

const BrowserConfigSchema = z.object({
  headless: z.boolean(),
  timeout: z.number().min(1000),
  userDataDir: z.string().optional(),
});

const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
  verbose: z.boolean(),
});

/**
 * Configuration sources in priority order:
 * 1. CLI arguments (highest priority)
 * 2. Environment variables
 * 3. Config files (.env, stealth.json)
 * 4. Defaults (lowest priority)
 */
export class Config {
  private static instance: Config | undefined;

  public readonly session: z.infer<typeof SessionConfigSchema>;
  public readonly download: z.infer<typeof DownloadConfigSchema>;
  public readonly browser: z.infer<typeof BrowserConfigSchema>;
  public readonly logging: z.infer<typeof LoggingConfigSchema>;
  public readonly stealth: z.infer<typeof StealthConfigFileSchema>;

  private constructor() {
    // Load stealth config from JSON file
    this.stealth = this.loadStealthConfig();

    // Load other configs with environment variable overrides
    this.session = this.loadSessionConfig();
    this.download = this.loadDownloadConfig();
    this.browser = this.loadBrowserConfig();
    this.logging = this.loadLoggingConfig();

    logger.debug('Configuration loaded successfully');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * Reset singleton (mainly for testing)
   */
  public static reset(): void {
    Config.instance = undefined;
  }

  /**
   * Load stealth configuration from JSON file
   */
  private loadStealthConfig(): z.infer<typeof StealthConfigFileSchema> {
    try {
      const configPath = path.join(__dirname, '../../config/stealth.json');
      const configData = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(configData);

      const result = StealthConfigFileSchema.safeParse(parsed);

      if (!result.success) {
        const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
        throw new ValidationError(
          `Invalid stealth configuration: ${errors.join(', ')}`,
          ErrorCode.INVALID_CONFIG
        );
      }

      return result.data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new ValidationError(
        `Failed to load stealth config: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.INVALID_CONFIG
      );
    }
  }

  /**
   * Load session configuration
   */
  private loadSessionConfig(): z.infer<typeof SessionConfigSchema> {
    const baseDir = process.env.LIBBY_DATA_DIR || path.join(os.homedir(), '.libby-downloader');
    const config = {
      cookiesPath: process.env.LIBBY_COOKIES_PATH || path.join(baseDir, 'cookies.json'),
      userDataDir: process.env.LIBBY_USER_DATA_DIR || path.join(baseDir, 'browser-data'),
      headless: process.env.LIBBY_HEADLESS === 'true' || false,
    };

    const result = SessionConfigSchema.safeParse(config);

    if (!result.success) {
      const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(
        `Invalid session configuration: ${errors.join(', ')}`,
        ErrorCode.INVALID_CONFIG
      );
    }

    return result.data;
  }

  /**
   * Load download configuration
   */
  private loadDownloadConfig(): z.infer<typeof DownloadConfigSchema> {
    const config = {
      outputDir: process.env.LIBBY_OUTPUT_DIR || path.join(os.homedir(), 'Downloads', 'Libby'),
      tempDir: process.env.LIBBY_TEMP_DIR || path.join(os.tmpdir(), 'libby-downloader'),
      keepTempFiles: process.env.LIBBY_KEEP_TEMP === 'true' || false,
      mergeChapters: process.env.LIBBY_MERGE === 'false' ? false : true,
      embedMetadata: process.env.LIBBY_METADATA === 'false' ? false : true,
    };

    const result = DownloadConfigSchema.safeParse(config);

    if (!result.success) {
      const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(
        `Invalid download configuration: ${errors.join(', ')}`,
        ErrorCode.INVALID_CONFIG
      );
    }

    return result.data;
  }

  /**
   * Load browser configuration
   */
  private loadBrowserConfig(): z.infer<typeof BrowserConfigSchema> {
    const config = {
      headless: process.env.LIBBY_HEADLESS === 'true' || false,
      timeout: parseInt(process.env.LIBBY_BROWSER_TIMEOUT || '60000', 10),
      userDataDir: process.env.LIBBY_USER_DATA_DIR,
    };

    const result = BrowserConfigSchema.safeParse(config);

    if (!result.success) {
      const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(
        `Invalid browser configuration: ${errors.join(', ')}`,
        ErrorCode.INVALID_CONFIG
      );
    }

    return result.data;
  }

  /**
   * Load logging configuration
   */
  private loadLoggingConfig(): z.infer<typeof LoggingConfigSchema> {
    const level = (process.env.LIBBY_LOG_LEVEL?.toLowerCase() || 'info') as
      | 'debug'
      | 'info'
      | 'warn'
      | 'error';

    const config = {
      level,
      verbose: process.env.LIBBY_VERBOSE === 'true' || false,
    };

    const result = LoggingConfigSchema.safeParse(config);

    if (!result.success) {
      const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(
        `Invalid logging configuration: ${errors.join(', ')}`,
        ErrorCode.INVALID_CONFIG
      );
    }

    return result.data;
  }

  /**
   * Get stealth mode configuration
   */
  public getStealthMode(mode: 'safe' | 'balanced' | 'aggressive') {
    return {
      mode,
      ...this.stealth.modes[mode],
    };
  }

  /**
   * Get default stealth mode
   */
  public getDefaultStealthMode() {
    return this.stealth.defaultMode;
  }

  /**
   * Validate configuration at startup
   */
  public static validate(): void {
    try {
      Config.getInstance();
      logger.info('Configuration validation passed');
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.error('Configuration validation failed', error);
        throw error;
      }
      throw error;
    }
  }

  /**
   * Get all configuration as plain object (for debugging)
   */
  public toJSON() {
    return {
      session: this.session,
      download: this.download,
      browser: this.browser,
      logging: this.logging,
      stealth: this.stealth,
    };
  }
}

/**
 * Export singleton getter for convenience
 */
export const getConfig = () => Config.getInstance();
