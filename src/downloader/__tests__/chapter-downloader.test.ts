import { EventEmitter } from 'events';
import {
  ChapterDownloader,
  ChapterStartEvent,
  ChapterCompleteEvent,
  ChapterErrorEvent,
} from '../chapter-downloader';
import { BrowserManager } from '../../browser/manager';
import { RateLimiter } from '../../utils/rate-limiter';
import { LibbyChapter } from '../../types';

// Mock dependencies
jest.mock('../../browser/manager');
jest.mock('../../utils/rate-limiter');
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));
jest.mock('../../browser/stealth', () => ({
  simulateMouseMovement: jest.fn(),
  simulateScrolling: jest.fn(),
}));
jest.mock('../../utils/retry', () => ({
  retry: jest.fn((fn) => fn()),
}));

describe('ChapterDownloader Events', () => {
  let browserManager: jest.Mocked<BrowserManager>;
  let rateLimiter: jest.Mocked<RateLimiter>;
  let downloader: ChapterDownloader;

  beforeEach(() => {
    browserManager = new BrowserManager({ headless: true }) as jest.Mocked<BrowserManager>;
    rateLimiter = new RateLimiter('balanced') as jest.Mocked<RateLimiter>;

    // Mock browser page
    const mockPage = {
      goto: jest.fn().mockResolvedValue({
        buffer: jest.fn().mockResolvedValue(Buffer.from('mock audio data')),
      }),
    };

    browserManager.getPage = jest.fn().mockReturnValue(mockPage);

    // Mock rate limiter
    rateLimiter.getConfig = jest.fn().mockReturnValue({
      mode: 'balanced',
      delayBetweenChapters: { min: 1000, max: 2000 },
      occasionalBreak: {
        enabled: false,
        afterChapters: 5,
        duration: { min: 5000, max: 10000 },
      },
      mouseMovements: false,
      randomScrolling: false,
      maxBooksPerHour: 2,
    });

    rateLimiter.resetChapterCounter = jest.fn();
    rateLimiter.waitForNextChapter = jest.fn().mockResolvedValue(undefined);
    rateLimiter.getStats = jest.fn().mockReturnValue({
      chaptersDownloaded: 0,
      booksDownloaded: 0,
      sessionDuration: 0,
      mode: 'balanced',
    });

    downloader = new ChapterDownloader(browserManager, rateLimiter);
  });

  afterEach(() => {
    downloader.removeAllListeners();
    jest.clearAllMocks();
  });

  it('should extend EventEmitter', () => {
    expect(downloader).toBeInstanceOf(EventEmitter);
  });

  it('should emit chapter:start events', async () => {
    const chapters: LibbyChapter[] = [
      {
        index: 0,
        title: 'Chapter 1',
        url: 'http://example.com/chapter1.mp3',
        duration: 1000,
        startTime: 0,
      },
    ];

    const startEvents: ChapterStartEvent[] = [];

    downloader.on('chapter:start', (event: ChapterStartEvent) => {
      startEvents.push(event);
    });

    await expect(
      downloader.downloadChapters(chapters, '/tmp/test', 'Test Book')
    ).resolves.toBeDefined();

    expect(startEvents).toHaveLength(1);
    expect(startEvents[0]).toMatchObject({
      chapterIndex: 0,
      chapterTitle: 'Chapter 1',
      totalChapters: 1,
    });
  });

  it('should emit chapter:complete events', async () => {
    const chapters: LibbyChapter[] = [
      {
        index: 0,
        title: 'Chapter 1',
        url: 'http://example.com/chapter1.mp3',
        duration: 1000,
        startTime: 0,
      },
    ];

    const completeEvents: ChapterCompleteEvent[] = [];

    downloader.on('chapter:complete', (event: ChapterCompleteEvent) => {
      completeEvents.push(event);
    });

    await expect(
      downloader.downloadChapters(chapters, '/tmp/test', 'Test Book')
    ).resolves.toBeDefined();

    expect(completeEvents).toHaveLength(1);
    expect(completeEvents[0]).toMatchObject({
      chapterIndex: 0,
      chapterTitle: 'Chapter 1',
      filePath: expect.stringContaining('001-Chapter 1.mp3'),
      fileSize: expect.any(Number),
    });
  });

  it('should emit chapter:error events on failure', async () => {
    const chapters: LibbyChapter[] = [
      {
        index: 0,
        title: 'Chapter 1',
        url: 'http://example.com/chapter1.mp3',
        duration: 1000,
        startTime: 0,
      },
    ];

    // Mock page.goto to throw error
    const mockPage = {
      goto: jest.fn().mockRejectedValue(new Error('Network error')),
    };
    browserManager.getPage = jest.fn().mockReturnValue(mockPage);

    const errorEvents: ChapterErrorEvent[] = [];

    downloader.on('chapter:error', (event: ChapterErrorEvent) => {
      errorEvents.push(event);
    });

    await expect(downloader.downloadChapters(chapters, '/tmp/test', 'Test Book')).rejects.toThrow();

    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0]).toMatchObject({
      chapterIndex: 0,
      chapterTitle: 'Chapter 1',
      error: expect.objectContaining({
        message: expect.stringContaining('Network error'),
      }),
    });
  });

  it('should emit events in correct order for multiple chapters', async () => {
    const chapters: LibbyChapter[] = [
      {
        index: 0,
        title: 'Chapter 1',
        url: 'http://example.com/chapter1.mp3',
        duration: 1000,
        startTime: 0,
      },
      {
        index: 1,
        title: 'Chapter 2',
        url: 'http://example.com/chapter2.mp3',
        duration: 1000,
        startTime: 1000,
      },
    ];

    const eventLog: string[] = [];

    downloader.on('chapter:start', (event: ChapterStartEvent) => {
      eventLog.push(`start:${event.chapterIndex}`);
    });

    downloader.on('chapter:complete', (event: ChapterCompleteEvent) => {
      eventLog.push(`complete:${event.chapterIndex}`);
    });

    await expect(
      downloader.downloadChapters(chapters, '/tmp/test', 'Test Book')
    ).resolves.toBeDefined();

    expect(eventLog).toEqual(['start:0', 'complete:0', 'start:1', 'complete:1']);
  });

  it('should maintain backward compatibility with onProgress callback', async () => {
    const chapters: LibbyChapter[] = [
      {
        index: 0,
        title: 'Chapter 1',
        url: 'http://example.com/chapter1.mp3',
        duration: 1000,
        startTime: 0,
      },
    ];

    const progressUpdates: Array<{ status: string; currentChapter?: string }> = [];

    await expect(
      downloader.downloadChapters(chapters, '/tmp/test', 'Test Book', (progress) => {
        progressUpdates.push({
          status: progress.status,
          currentChapter: progress.currentChapter,
        });
      })
    ).resolves.toBeDefined();

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[0]).toMatchObject({
      status: 'downloading',
      currentChapter: 'Chapter 1',
    });
  });

  it('should emit both events and call callback when both are provided', async () => {
    const chapters: LibbyChapter[] = [
      {
        index: 0,
        title: 'Chapter 1',
        url: 'http://example.com/chapter1.mp3',
        duration: 1000,
        startTime: 0,
      },
    ];

    const startEvents: ChapterStartEvent[] = [];
    const callbackCalls: number[] = [];

    downloader.on('chapter:start', (event: ChapterStartEvent) => {
      startEvents.push(event);
    });

    await expect(
      downloader.downloadChapters(chapters, '/tmp/test', 'Test Book', () => {
        callbackCalls.push(1);
      })
    ).resolves.toBeDefined();

    expect(startEvents).toHaveLength(1);
    expect(callbackCalls.length).toBeGreaterThan(0);
  });
});
