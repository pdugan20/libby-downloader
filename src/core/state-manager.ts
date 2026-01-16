import { promises as fs, existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from '../utils/logger';
import { ensureDir } from '../utils/fs';

/**
 * Download state for persistence
 */
export interface DownloadState {
  bookId: string;
  bookTitle: string;
  totalChapters: number;
  downloadedChapters: number[];
  outputDir: string;
  mode: 'safe' | 'balanced' | 'aggressive';
  merge: boolean;
  metadata: boolean;
  startedAt: string;
  lastUpdatedAt: string;
}

/**
 * Manages download state persistence for resume functionality
 */
export class StateManager {
  private stateDir: string;

  constructor(stateDir?: string) {
    this.stateDir = stateDir || path.join(os.homedir(), '.libby-downloader', 'state');
  }

  /**
   * Get state file path for a book
   */
  private getStateFilePath(bookId: string): string {
    return path.join(this.stateDir, `${bookId}.json`);
  }

  /**
   * Initialize state directory
   */
  async initialize(): Promise<void> {
    await ensureDir(this.stateDir);
  }

  /**
   * Save download state
   */
  async saveState(state: DownloadState): Promise<void> {
    try {
      await this.initialize();

      const stateFile = this.getStateFilePath(state.bookId);
      const stateData = {
        ...state,
        lastUpdatedAt: new Date().toISOString(),
      };

      await fs.writeFile(stateFile, JSON.stringify(stateData, null, 2));
      logger.debug(`Download state saved for book: ${state.bookId}`);
    } catch (error) {
      logger.error('Failed to save download state', error);
      // Don't throw - state saving is not critical
    }
  }

  /**
   * Load download state for a book
   */
  async loadState(bookId: string): Promise<DownloadState | null> {
    try {
      const stateFile = this.getStateFilePath(bookId);

      if (!existsSync(stateFile)) {
        return null;
      }

      const stateData = await fs.readFile(stateFile, 'utf-8');
      const state = JSON.parse(stateData) as DownloadState;

      logger.debug(`Download state loaded for book: ${bookId}`);
      return state;
    } catch (error) {
      logger.error('Failed to load download state', error);
      return null;
    }
  }

  /**
   * Check if a book has saved state
   */
  async hasState(bookId: string): Promise<boolean> {
    const stateFile = this.getStateFilePath(bookId);
    return existsSync(stateFile);
  }

  /**
   * Delete download state for a book (called on completion)
   */
  async deleteState(bookId: string): Promise<void> {
    try {
      const stateFile = this.getStateFilePath(bookId);

      if (existsSync(stateFile)) {
        await fs.unlink(stateFile);
        logger.debug(`Download state deleted for book: ${bookId}`);
      }
    } catch (error) {
      logger.error('Failed to delete download state', error);
      // Don't throw - state cleanup is not critical
    }
  }

  /**
   * List all books with saved state
   */
  async listStates(): Promise<DownloadState[]> {
    try {
      await this.initialize();

      const files = await fs.readdir(this.stateDir);
      const stateFiles = files.filter((file) => file.endsWith('.json'));

      const states: DownloadState[] = [];

      for (const file of stateFiles) {
        try {
          const stateData = await fs.readFile(path.join(this.stateDir, file), 'utf-8');
          const state = JSON.parse(stateData) as DownloadState;
          states.push(state);
        } catch (error) {
          logger.warn(`Failed to load state file: ${file}`, error);
        }
      }

      return states;
    } catch (error) {
      logger.error('Failed to list download states', error);
      return [];
    }
  }

  /**
   * Update state with newly downloaded chapter
   */
  async updateChapterProgress(bookId: string, chapterIndex: number): Promise<void> {
    try {
      const state = await this.loadState(bookId);

      if (!state) {
        logger.warn(`No state found for book: ${bookId}`);
        return;
      }

      if (!state.downloadedChapters.includes(chapterIndex)) {
        state.downloadedChapters.push(chapterIndex);
        state.downloadedChapters.sort((a, b) => a - b);
        await this.saveState(state);
      }
    } catch (error) {
      logger.error('Failed to update chapter progress', error);
    }
  }

  /**
   * Get progress percentage for a book
   */
  async getProgress(bookId: string): Promise<number> {
    const state = await this.loadState(bookId);

    if (!state) {
      return 0;
    }

    return (state.downloadedChapters.length / state.totalChapters) * 100;
  }

  /**
   * Clean up old state files (older than specified days)
   */
  async cleanupOldStates(olderThanDays: number = 30): Promise<number> {
    try {
      const states = await this.listStates();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedCount = 0;

      for (const state of states) {
        const lastUpdated = new Date(state.lastUpdatedAt);

        if (lastUpdated < cutoffDate) {
          await this.deleteState(state.bookId);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(
          `Cleaned up ${deletedCount} old state file(s) older than ${olderThanDays} days`
        );
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old states', error);
      return 0;
    }
  }
}

/**
 * Global state manager instance
 */
let globalStateManager: StateManager | null = null;

/**
 * Get or create global state manager
 */
export function getStateManager(): StateManager {
  if (!globalStateManager) {
    globalStateManager = new StateManager();
  }
  return globalStateManager;
}

/**
 * Reset global state manager (for testing)
 */
export function resetStateManager(): void {
  globalStateManager = null;
}
