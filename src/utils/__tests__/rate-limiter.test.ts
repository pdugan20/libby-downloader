import { RateLimiter } from '../rate-limiter';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock Config
jest.mock('../../core/config', () => {
  const mockGetStealthMode = (mode: string) => ({
    mode,
    delayBetweenChapters: { min: 1000, max: 2000 },
    occasionalBreak: {
      enabled: mode === 'safe' || mode === 'balanced',
      afterChapters: mode === 'safe' ? 3 : 5,
      duration: { min: 5000, max: 10000 },
    },
    mouseMovements: mode !== 'aggressive',
    randomScrolling: mode === 'safe',
    maxBooksPerHour: mode === 'safe' ? 1 : mode === 'balanced' ? 2 : 5,
  });

  return {
    Config: {
      getInstance: jest.fn(() => ({
        getStealthMode: mockGetStealthMode,
      })),
    },
    getConfig: jest.fn(() => ({
      getStealthMode: mockGetStealthMode,
    })),
  };
});

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with safe mode config', () => {
      const limiter = new RateLimiter('safe');
      const config = limiter.getConfig();

      expect(config.mode).toBe('safe');
      expect(config.maxBooksPerHour).toBe(1);
      expect(config.occasionalBreak.enabled).toBe(true);
      expect(config.occasionalBreak.afterChapters).toBe(3);
    });

    it('should initialize with balanced mode config', () => {
      const limiter = new RateLimiter('balanced');
      const config = limiter.getConfig();

      expect(config.mode).toBe('balanced');
      expect(config.maxBooksPerHour).toBe(2);
      expect(config.occasionalBreak.afterChapters).toBe(5);
    });

    it('should initialize with aggressive mode config', () => {
      const limiter = new RateLimiter('aggressive');
      const config = limiter.getConfig();

      expect(config.mode).toBe('aggressive');
      expect(config.maxBooksPerHour).toBe(5);
      expect(config.occasionalBreak.enabled).toBe(false);
    });

    it('should default to balanced mode', () => {
      const limiter = new RateLimiter();
      const config = limiter.getConfig();

      expect(config.mode).toBe('balanced');
    });
  });

  describe('waitForNextChapter', () => {
    it('should wait between min and max delay', async () => {
      const limiter = new RateLimiter('balanced');

      const waitPromise = limiter.waitForNextChapter();

      // Fast-forward timers
      jest.advanceTimersByTime(2000);

      await waitPromise;

      expect(jest.getTimerCount()).toBe(0);
    });

    it('should increment chapter counter', async () => {
      const limiter = new RateLimiter('balanced');

      const initialStats = limiter.getStats();
      expect(initialStats.chaptersDownloaded).toBe(0);

      const waitPromise = limiter.waitForNextChapter();
      jest.runAllTimers();
      await waitPromise;

      const updatedStats = limiter.getStats();
      expect(updatedStats.chaptersDownloaded).toBe(1);
    });

    it('should track chapter downloads correctly', async () => {
      const limiter = new RateLimiter('safe');

      // Download 2 chapters
      for (let i = 0; i < 2; i++) {
        const waitPromise = limiter.waitForNextChapter();
        jest.runAllTimers();
        await waitPromise;
      }

      const stats = limiter.getStats();
      expect(stats.chaptersDownloaded).toBe(2);
      expect(stats.mode).toBe('safe');
    });

    it('should not take break in aggressive mode', async () => {
      const limiter = new RateLimiter('aggressive');

      // Download many chapters
      for (let i = 0; i < 10; i++) {
        const waitPromise = limiter.waitForNextChapter();
        jest.runAllTimers();
        await waitPromise;
      }

      // Should complete without breaks
      const stats = limiter.getStats();
      expect(stats.chaptersDownloaded).toBe(10);
    });
  });

  describe('canDownloadBook', () => {
    it('should allow download when under rate limit', () => {
      const limiter = new RateLimiter('safe'); // 1 book per hour

      expect(limiter.canDownloadBook()).toBe(true);
    });

    it('should prevent download when at rate limit', () => {
      const limiter = new RateLimiter('safe'); // 1 book per hour

      limiter.incrementBookCounter();

      expect(limiter.canDownloadBook()).toBe(false);
    });

    it('should allow download after an hour', () => {
      const limiter = new RateLimiter('safe');

      limiter.incrementBookCounter();
      expect(limiter.canDownloadBook()).toBe(false);

      // Advance time by 1 hour
      jest.advanceTimersByTime(60 * 60 * 1000 + 1);

      expect(limiter.canDownloadBook()).toBe(true);
    });

    it('should allow multiple books in balanced mode', () => {
      const limiter = new RateLimiter('balanced'); // 2 books per hour

      limiter.incrementBookCounter();
      expect(limiter.canDownloadBook()).toBe(true);

      limiter.incrementBookCounter();
      expect(limiter.canDownloadBook()).toBe(false);
    });
  });

  describe('getTimeUntilNextBook', () => {
    it('should return 0 when can download', () => {
      const limiter = new RateLimiter('balanced');

      expect(limiter.getTimeUntilNextBook()).toBe(0);
    });

    it('should return remaining time when at limit', () => {
      const limiter = new RateLimiter('safe');

      limiter.incrementBookCounter();

      const remainingTime = limiter.getTimeUntilNextBook();
      expect(remainingTime).toBeGreaterThan(0);
      expect(remainingTime).toBeLessThanOrEqual(60 * 60 * 1000); // Less than 1 hour
    });

    it('should return 0 after hour has passed', () => {
      const limiter = new RateLimiter('safe');

      limiter.incrementBookCounter();

      // Advance time by more than an hour
      jest.advanceTimersByTime(60 * 60 * 1000 + 1);

      expect(limiter.getTimeUntilNextBook()).toBe(0);
    });
  });

  describe('resetChapterCounter', () => {
    it('should reset chapter count to 0', async () => {
      const limiter = new RateLimiter('balanced');

      // Download some chapters
      for (let i = 0; i < 3; i++) {
        const waitPromise = limiter.waitForNextChapter();
        jest.runAllTimers();
        await waitPromise;
      }

      expect(limiter.getStats().chaptersDownloaded).toBe(3);

      limiter.resetChapterCounter();

      expect(limiter.getStats().chaptersDownloaded).toBe(0);
    });
  });

  describe('incrementBookCounter', () => {
    it('should increment book count', () => {
      const limiter = new RateLimiter('balanced');

      expect(limiter.getStats().booksDownloaded).toBe(0);

      limiter.incrementBookCounter();
      expect(limiter.getStats().booksDownloaded).toBe(1);

      limiter.incrementBookCounter();
      expect(limiter.getStats().booksDownloaded).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return current stats', async () => {
      const limiter = new RateLimiter('balanced');

      limiter.incrementBookCounter();

      const waitPromise = limiter.waitForNextChapter();
      jest.runAllTimers();
      await waitPromise;

      const stats = limiter.getStats();

      expect(stats.chaptersDownloaded).toBe(1);
      expect(stats.booksDownloaded).toBe(1);
      expect(stats.mode).toBe('balanced');
      expect(stats.sessionDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('showRiskWarning', () => {
    it('should show warning for aggressive mode', () => {
      const limiter = new RateLimiter('aggressive');

      // Should not throw
      expect(() => limiter.showRiskWarning()).not.toThrow();
    });

    it('should show info for safe mode', () => {
      const limiter = new RateLimiter('safe');

      expect(() => limiter.showRiskWarning()).not.toThrow();
    });

    it('should show note for balanced mode', () => {
      const limiter = new RateLimiter('balanced');

      expect(() => limiter.showRiskWarning()).not.toThrow();
    });
  });
});
