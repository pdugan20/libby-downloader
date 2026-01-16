import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StateManager, DownloadState, getStateManager, resetStateManager } from '../state-manager';

// Mock logger to avoid chalk ES module issues in Jest
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('StateManager', () => {
  let stateManager: StateManager;
  let tempStateDir: string;

  beforeEach(async () => {
    // Create temporary state directory for testing
    tempStateDir = path.join(os.tmpdir(), `libby-test-${Date.now()}`);
    stateManager = new StateManager(tempStateDir);
    await stateManager.initialize();
  });

  afterEach(async () => {
    // Clean up temporary state directory
    try {
      await fs.rm(tempStateDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('saveState', () => {
    it('should save download state to file', async () => {
      const state: DownloadState = {
        bookId: 'test-book-123',
        bookTitle: 'Test Book',
        totalChapters: 10,
        downloadedChapters: [0, 1, 2],
        outputDir: '/tmp/output',
        mode: 'balanced',
        merge: true,
        metadata: true,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await stateManager.saveState(state);

      const stateFile = path.join(tempStateDir, 'test-book-123.json');
      const fileExists = await fs
        .access(stateFile)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);

      const savedData = await fs.readFile(stateFile, 'utf-8');
      const savedState = JSON.parse(savedData) as DownloadState;

      expect(savedState.bookId).toBe('test-book-123');
      expect(savedState.bookTitle).toBe('Test Book');
      expect(savedState.totalChapters).toBe(10);
      expect(savedState.downloadedChapters).toEqual([0, 1, 2]);
    });

    it('should update lastUpdatedAt timestamp', async () => {
      const state: DownloadState = {
        bookId: 'test-book-456',
        bookTitle: 'Test Book 2',
        totalChapters: 5,
        downloadedChapters: [],
        outputDir: '/tmp/output',
        mode: 'safe',
        merge: false,
        metadata: false,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: '2020-01-01T00:00:00.000Z',
      };

      await stateManager.saveState(state);

      const stateFile = path.join(tempStateDir, 'test-book-456.json');
      const savedData = await fs.readFile(stateFile, 'utf-8');
      const savedState = JSON.parse(savedData) as DownloadState;

      expect(savedState.lastUpdatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    });
  });

  describe('loadState', () => {
    it('should load existing state', async () => {
      const state: DownloadState = {
        bookId: 'test-book-789',
        bookTitle: 'Test Book 3',
        totalChapters: 8,
        downloadedChapters: [0, 1, 2, 3],
        outputDir: '/tmp/output',
        mode: 'aggressive',
        merge: true,
        metadata: true,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await stateManager.saveState(state);

      const loadedState = await stateManager.loadState('test-book-789');

      expect(loadedState).not.toBeNull();
      expect(loadedState?.bookId).toBe('test-book-789');
      expect(loadedState?.bookTitle).toBe('Test Book 3');
      expect(loadedState?.totalChapters).toBe(8);
      expect(loadedState?.downloadedChapters).toEqual([0, 1, 2, 3]);
    });

    it('should return null for non-existent state', async () => {
      const loadedState = await stateManager.loadState('non-existent-book');

      expect(loadedState).toBeNull();
    });
  });

  describe('hasState', () => {
    it('should return true for existing state', async () => {
      const state: DownloadState = {
        bookId: 'test-book-abc',
        bookTitle: 'Test Book 4',
        totalChapters: 5,
        downloadedChapters: [0],
        outputDir: '/tmp/output',
        mode: 'balanced',
        merge: true,
        metadata: true,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await stateManager.saveState(state);

      const hasState = await stateManager.hasState('test-book-abc');
      expect(hasState).toBe(true);
    });

    it('should return false for non-existent state', async () => {
      const hasState = await stateManager.hasState('non-existent-book');
      expect(hasState).toBe(false);
    });
  });

  describe('deleteState', () => {
    it('should delete existing state', async () => {
      const state: DownloadState = {
        bookId: 'test-book-def',
        bookTitle: 'Test Book 5',
        totalChapters: 3,
        downloadedChapters: [0, 1, 2],
        outputDir: '/tmp/output',
        mode: 'safe',
        merge: true,
        metadata: true,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await stateManager.saveState(state);

      let hasState = await stateManager.hasState('test-book-def');
      expect(hasState).toBe(true);

      await stateManager.deleteState('test-book-def');

      hasState = await stateManager.hasState('test-book-def');
      expect(hasState).toBe(false);
    });

    it('should not throw when deleting non-existent state', async () => {
      await expect(stateManager.deleteState('non-existent-book')).resolves.not.toThrow();
    });
  });

  describe('updateChapterProgress', () => {
    it('should add chapter to downloaded list', async () => {
      const state: DownloadState = {
        bookId: 'test-book-ghi',
        bookTitle: 'Test Book 6',
        totalChapters: 10,
        downloadedChapters: [0, 1],
        outputDir: '/tmp/output',
        mode: 'balanced',
        merge: true,
        metadata: true,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await stateManager.saveState(state);

      await stateManager.updateChapterProgress('test-book-ghi', 2);

      const loadedState = await stateManager.loadState('test-book-ghi');

      expect(loadedState?.downloadedChapters).toEqual([0, 1, 2]);
    });

    it('should not duplicate chapter indices', async () => {
      const state: DownloadState = {
        bookId: 'test-book-jkl',
        bookTitle: 'Test Book 7',
        totalChapters: 10,
        downloadedChapters: [0, 1, 2],
        outputDir: '/tmp/output',
        mode: 'balanced',
        merge: true,
        metadata: true,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await stateManager.saveState(state);

      await stateManager.updateChapterProgress('test-book-jkl', 1);

      const loadedState = await stateManager.loadState('test-book-jkl');

      expect(loadedState?.downloadedChapters).toEqual([0, 1, 2]);
    });

    it('should keep chapters sorted', async () => {
      const state: DownloadState = {
        bookId: 'test-book-mno',
        bookTitle: 'Test Book 8',
        totalChapters: 10,
        downloadedChapters: [0, 2, 4],
        outputDir: '/tmp/output',
        mode: 'balanced',
        merge: true,
        metadata: true,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await stateManager.saveState(state);

      await stateManager.updateChapterProgress('test-book-mno', 1);
      await stateManager.updateChapterProgress('test-book-mno', 3);

      const loadedState = await stateManager.loadState('test-book-mno');

      expect(loadedState?.downloadedChapters).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('getProgress', () => {
    it('should calculate correct progress percentage', async () => {
      const state: DownloadState = {
        bookId: 'test-book-pqr',
        bookTitle: 'Test Book 9',
        totalChapters: 10,
        downloadedChapters: [0, 1, 2, 3, 4],
        outputDir: '/tmp/output',
        mode: 'balanced',
        merge: true,
        metadata: true,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await stateManager.saveState(state);

      const progress = await stateManager.getProgress('test-book-pqr');

      expect(progress).toBe(50);
    });

    it('should return 0 for non-existent state', async () => {
      const progress = await stateManager.getProgress('non-existent-book');

      expect(progress).toBe(0);
    });
  });

  describe('listStates', () => {
    it('should list all saved states', async () => {
      const state1: DownloadState = {
        bookId: 'book-1',
        bookTitle: 'Book 1',
        totalChapters: 5,
        downloadedChapters: [0],
        outputDir: '/tmp/output',
        mode: 'safe',
        merge: true,
        metadata: true,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      const state2: DownloadState = {
        bookId: 'book-2',
        bookTitle: 'Book 2',
        totalChapters: 8,
        downloadedChapters: [0, 1],
        outputDir: '/tmp/output',
        mode: 'balanced',
        merge: true,
        metadata: true,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await stateManager.saveState(state1);
      await stateManager.saveState(state2);

      const states = await stateManager.listStates();

      expect(states).toHaveLength(2);
      expect(states.map((s) => s.bookId).sort()).toEqual(['book-1', 'book-2']);
    });

    it('should return empty array when no states exist', async () => {
      const states = await stateManager.listStates();

      expect(states).toEqual([]);
    });
  });

  describe('cleanupOldStates', () => {
    it('should delete states older than specified days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);

      const oldState: DownloadState = {
        bookId: 'old-book',
        bookTitle: 'Old Book',
        totalChapters: 5,
        downloadedChapters: [0],
        outputDir: '/tmp/output',
        mode: 'safe',
        merge: true,
        metadata: true,
        startedAt: oldDate.toISOString(),
        lastUpdatedAt: oldDate.toISOString(),
      };

      const recentState: DownloadState = {
        bookId: 'recent-book',
        bookTitle: 'Recent Book',
        totalChapters: 5,
        downloadedChapters: [0],
        outputDir: '/tmp/output',
        mode: 'safe',
        merge: true,
        metadata: true,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      // Manually write old state to preserve old timestamp
      // (saveState overwrites lastUpdatedAt with current time)
      const oldStateFile = path.join(tempStateDir, 'old-book.json');
      await fs.writeFile(oldStateFile, JSON.stringify(oldState, null, 2));

      await stateManager.saveState(recentState);

      const deletedCount = await stateManager.cleanupOldStates(30);

      expect(deletedCount).toBe(1);

      const states = await stateManager.listStates();
      expect(states).toHaveLength(1);
      expect(states[0].bookId).toBe('recent-book');
    });

    it('should return 0 when no old states exist', async () => {
      const recentState: DownloadState = {
        bookId: 'recent-book',
        bookTitle: 'Recent Book',
        totalChapters: 5,
        downloadedChapters: [0],
        outputDir: '/tmp/output',
        mode: 'safe',
        merge: true,
        metadata: true,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };

      await stateManager.saveState(recentState);

      const deletedCount = await stateManager.cleanupOldStates(30);

      expect(deletedCount).toBe(0);
    });
  });

  describe('getStateManager', () => {
    it('should return singleton instance', () => {
      const instance1 = getStateManager();
      const instance2 = getStateManager();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getStateManager();
      resetStateManager();
      const instance2 = getStateManager();

      expect(instance1).not.toBe(instance2);
    });
  });
});
