import { StealthConfig } from '../types';
import { sleepRandom, formatDuration } from './delay';
import { logger } from './logger';
import * as stealthConfigData from '../../config/stealth.json';

export class RateLimiter {
  private config: StealthConfig;
  private chaptersDownloaded: number = 0;
  private booksDownloaded: number = 0;
  private sessionStartTime: number = Date.now();
  private lastDownloadTime: number = 0;

  constructor(mode: 'safe' | 'balanced' | 'aggressive' = 'balanced') {
    const modeConfig = stealthConfigData.modes[mode];
    this.config = {
      mode,
      ...modeConfig,
    };
    logger.info(`Rate limiter initialized in ${mode} mode`);
  }

  /**
   * Get the current configuration
   */
  getConfig(): StealthConfig {
    return this.config;
  }

  /**
   * Wait before downloading the next chapter
   */
  async waitForNextChapter(): Promise<void> {
    const { min, max } = this.config.delayBetweenChapters;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;

    logger.debug(`Waiting ${formatDuration(delay)} before next chapter`);
    await sleepRandom(min, max);

    this.chaptersDownloaded++;

    // Check if we need a break
    if (this.shouldTakeBreak()) {
      await this.takeBreak();
    }

    this.lastDownloadTime = Date.now();
  }

  /**
   * Check if we should take a break
   */
  private shouldTakeBreak(): boolean {
    const { enabled, afterChapters } = this.config.occasionalBreak;
    return enabled && this.chaptersDownloaded % afterChapters === 0;
  }

  /**
   * Take a break to simulate human behavior
   */
  private async takeBreak(): Promise<void> {
    const { min, max } = this.config.occasionalBreak.duration;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;

    logger.info(`Taking a break for ${formatDuration(delay)} to simulate human behavior`);
    await sleepRandom(min, max);
  }

  /**
   * Check if we can download another book based on rate limits
   */
  canDownloadBook(): boolean {
    const hoursElapsed = (Date.now() - this.sessionStartTime) / (1000 * 60 * 60);

    if (hoursElapsed < 1) {
      const maxBooks = this.config.maxBooksPerHour;
      if (this.booksDownloaded >= maxBooks) {
        logger.warn(
          `Rate limit reached: ${this.booksDownloaded}/${maxBooks} books per hour in ${this.config.mode} mode`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Get time until next book download is allowed
   */
  getTimeUntilNextBook(): number {
    const hoursElapsed = (Date.now() - this.sessionStartTime) / (1000 * 60 * 60);

    if (hoursElapsed >= 1) {
      return 0;
    }

    const maxBooks = this.config.maxBooksPerHour;
    if (this.booksDownloaded < maxBooks) {
      return 0;
    }

    const timeRemaining = (1 - hoursElapsed) * 60 * 60 * 1000;
    return timeRemaining;
  }

  /**
   * Increment book download counter
   */
  incrementBookCounter(): void {
    this.booksDownloaded++;
    logger.debug(`Books downloaded this session: ${this.booksDownloaded}`);
  }

  /**
   * Reset chapter counter (call at start of each book)
   */
  resetChapterCounter(): void {
    this.chaptersDownloaded = 0;
  }

  /**
   * Get stats for current session
   */
  getStats(): {
    chaptersDownloaded: number;
    booksDownloaded: number;
    sessionDuration: number;
    mode: string;
  } {
    return {
      chaptersDownloaded: this.chaptersDownloaded,
      booksDownloaded: this.booksDownloaded,
      sessionDuration: Date.now() - this.sessionStartTime,
      mode: this.config.mode,
    };
  }

  /**
   * Warning about detection risks
   */
  showRiskWarning(): void {
    const warnings = {
      aggressive:
        'WARNING: Aggressive mode has high detection risk. Your library card may be banned.',
      balanced: 'NOTE: Balanced mode provides moderate protection. Use with caution.',
      safe: 'INFO: Safe mode minimizes detection risk but downloads are slower.',
    };

    const warning = warnings[this.config.mode];
    if (this.config.mode === 'aggressive') {
      logger.warn(warning);
    } else {
      logger.info(warning);
    }
  }
}
