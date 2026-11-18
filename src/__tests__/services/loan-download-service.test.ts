/**
 * Tests for starting and watching a libby download
 */

import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';
import { execFile, spawn } from 'child_process';
import {
  autostartUrl,
  LoanDownloadService,
  loanTitleId,
  parseLoanUrl,
  openInChrome,
} from '../../services/loan-download-service';

jest.mock('child_process', () => ({ execFile: jest.fn(), spawn: jest.fn() }));

describe('openInChrome', () => {
  const platform = process.platform;
  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: platform });
    jest.resetAllMocks();
  });

  it('resolves when a Linux browser starts, without waiting for it to exit', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    const child = Object.assign(new EventEmitter(), { unref: jest.fn() });
    (spawn as jest.Mock).mockReturnValue(child);
    const opened = openInChrome('https://libbyapp.com/open/loan/111/222');
    expect(spawn).toHaveBeenCalledWith('google-chrome', expect.any(Array), {
      detached: true,
      stdio: 'ignore',
    });
    child.emit('spawn');
    await expect(opened).resolves.toBeUndefined();
    expect(child.unref).toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
  });

  it('reports a missing Linux browser executable', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    const child = Object.assign(new EventEmitter(), { unref: jest.fn() });
    (spawn as jest.Mock).mockReturnValue(child);
    const opened = openInChrome('https://libbyapp.com/open/loan/111/222');
    child.emit('error', new Error('spawn google-chrome ENOENT'));
    await expect(opened).rejects.toThrow("Couldn't open Chrome");
    expect(child.unref).not.toHaveBeenCalled();
  });
});

describe('parseLoanUrl', () => {
  it('accepts a loan address and drops its query and hash', () => {
    expect(parseLoanUrl(' https://libbyapp.com/open/loan/111/222/?x=1#main ')).toBe(
      'https://libbyapp.com/open/loan/111/222'
    );
  });

  it.each([
    'http://libbyapp.com/open/loan/111/222',
    'https://libbyapp.com.example.com/open/loan/111/222',
    'https://libbyapp.com/shelf/loans',
    'https://libbyapp.com/open/loan/111/abc',
    'javascript:alert(1)',
    'not a url',
  ])('rejects %s', (input) => {
    expect(() => parseLoanUrl(input)).toThrow('Expected a Libby loan address');
  });

  it('reads the title ID', () => {
    expect(loanTitleId('https://libbyapp.com/open/loan/111/222')).toBe('222');
  });

  it('adds the autostart marker', () => {
    expect(autostartUrl('https://libbyapp.com/open/loan/111/222')).toBe(
      'https://libbyapp.com/open/loan/111/222#libby-downloader-autostart'
    );
  });
});

describe('LoanDownloadService.waitForBook', () => {
  let dataDir: string;
  let clock: number;
  const startedAt = Date.now();
  const fakeTime = {
    now: () => clock,
    sleep: async (ms: number) => {
      clock += ms;
    },
  };

  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libby-download-'));
    clock = startedAt;
  });

  afterEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  async function writeBook(
    folder: string,
    files: string[],
    options: { chapters?: number; mtime?: number } = {}
  ): Promise<void> {
    const folderPath = path.join(dataDir, folder);
    await fs.mkdir(folderPath, { recursive: true });
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const content =
        file === 'metadata.json'
          ? JSON.stringify({
              metadata: { title: folder },
              chapters: Array.from({ length: options.chapters ?? 0 }, (_, i) => ({ index: i })),
            })
          : 'audio';
      await fs.writeFile(filePath, content);
      if (options.mtime) {
        const time = new Date(options.mtime);
        await fs.utimes(filePath, time, time);
      }
    }
  }

  it('returns the book once its metadata.json arrives after the chapters', async () => {
    await writeBook(
      'My Book',
      ['chapter-001.mp3', 'chapter-002.mp3', 'chapter-003.mp3', 'metadata.json'],
      { chapters: 3 }
    );
    const progress: number[] = [];

    const book = await new LoanDownloadService(dataDir).waitForBook({
      startedAt,
      ...fakeTime,
      onProgress: ({ chapters }) => progress.push(chapters),
    });

    expect(book).toEqual({
      folderPath: path.join(dataDir, 'My Book'),
      title: 'My Book',
      chapterCount: 3,
      missingChapters: [],
    });
    expect(progress).toEqual([3]);
  });

  it("watches only the loan's own folder when given its title ID", async () => {
    await writeBook('Other Book (111)', ['chapter-001.mp3', 'metadata.json'], { chapters: 1 });
    await writeBook('My Book (222)', ['chapter-001.mp3', 'metadata.json'], { chapters: 1 });

    const book = await new LoanDownloadService(dataDir).waitForBook({
      startedAt,
      titleId: '222',
      ...fakeTime,
    });

    expect(book.folderPath).toBe(path.join(dataDir, 'My Book (222)'));
  });

  it('lists chapters that did not download', async () => {
    await writeBook('My Book', ['chapter-001.mp3', 'chapter-003.mp3', 'metadata.json'], {
      chapters: 3,
    });

    const book = await new LoanDownloadService(dataDir).waitForBook({ startedAt, ...fakeTime });

    expect(book.missingChapters).toEqual([2]);
  });

  it('ignores files from earlier downloads and reports when Chrome never starts', async () => {
    await writeBook('Old Book', ['chapter-001.mp3', 'metadata.json'], {
      chapters: 1,
      mtime: startedAt - 60 * 60 * 1000,
    });

    await expect(
      new LoanDownloadService(dataDir).waitForBook({
        startedAt,
        idleTimeoutMs: 10_000,
        ...fakeTime,
      })
    ).rejects.toThrow("Chrome didn't start the download");
  });

  it('does not accept the previous completion marker from one second before the request', async () => {
    await writeBook('My Book (222)', ['chapter-001.mp3', 'metadata.json'], {
      chapters: 1,
      mtime: startedAt - 1000,
    });
    await expect(
      new LoanDownloadService(dataDir).waitForBook({
        startedAt,
        titleId: '222',
        idleTimeoutMs: 10_000,
        ...fakeTime,
      })
    ).rejects.toThrow();
  });

  it('ignores unchanged files even when their timestamps are newer than the request', async () => {
    await writeBook('My Book (222)', ['chapter-001.mp3', 'metadata.json'], {
      chapters: 1,
      mtime: startedAt + 1000,
    });
    const service = new LoanDownloadService(dataDir);
    const previousFiles = await service.snapshotFiles();
    await expect(
      service.waitForBook({
        startedAt,
        previousFiles,
        titleId: '222',
        idleTimeoutMs: 10_000,
        ...fakeTime,
      })
    ).rejects.toThrow();
  });

  it('waits for replacements and accepts changed files with coarse pre-request timestamps', async () => {
    const folder = 'My Book (222)';
    await writeBook(folder, ['chapter-001.mp3', 'metadata.json'], {
      chapters: 1,
      mtime: startedAt - 1000,
    });
    const service = new LoanDownloadService(dataDir);
    const previousFiles = await service.snapshotFiles();
    let polls = 0;
    const result = await service.waitForBook({
      startedAt,
      previousFiles,
      titleId: '222',
      now: fakeTime.now,
      sleep: async (ms) => {
        polls++;
        clock += ms;
        for (const name of ['chapter-001.mp3', 'metadata.json']) {
          const dest = path.join(dataDir, folder, name);
          await fs.copyFile(dest, dest + '.next');
          await fs.rename(dest + '.next', dest);
          const time = new Date(startedAt - 1000);
          await fs.utimes(dest, time, time);
        }
      },
    });
    expect(polls).toBe(1);
    expect(result.missingChapters).toEqual([]);
  });

  it('does not count unchanged chapters when only the new completion marker arrives', async () => {
    const folder = 'My Book (222)';
    await writeBook(folder, ['chapter-001.mp3', 'metadata.json'], { chapters: 1 });
    const service = new LoanDownloadService(dataDir);
    const previousFiles = await service.snapshotFiles();
    const dest = path.join(dataDir, folder, 'metadata.json');
    await fs.copyFile(dest, dest + '.next');
    await fs.rename(dest + '.next', dest);
    const result = await service.waitForBook({ startedAt, previousFiles, ...fakeTime });
    expect(result.missingChapters).toEqual([1]);
  });

  it('reports a download that stops partway', async () => {
    await writeBook('My Book', ['chapter-001.mp3', 'chapter-002.mp3']);

    await expect(
      new LoanDownloadService(dataDir).waitForBook({
        startedAt,
        idleTimeoutMs: 10_000,
        ...fakeTime,
      })
    ).rejects.toThrow('The download of "My Book" stopped after 2 chapters');
  });

  it('treats a growing partial chapter as activity without counting it as downloaded', async () => {
    const service = new LoanDownloadService(dataDir);
    const previousFiles = await service.snapshotFiles();
    const folder = 'Slow Book (222)';
    const counts: number[] = [];
    const result = await service.waitForBook({
      startedAt,
      previousFiles,
      titleId: '222',
      pollIntervalMs: 60_000,
      now: fakeTime.now,
      onProgress: ({ chapters }) => counts.push(chapters),
      sleep: async (ms) => {
        clock += ms;
        await writeBook(folder, ['chapter-001.mp3.crdownload'], { mtime: clock });
        if (clock - startedAt >= 5 * 60_000) {
          await fs.rename(
            path.join(dataDir, folder, 'chapter-001.mp3.crdownload'),
            path.join(dataDir, folder, 'chapter-001.mp3')
          );
          await writeBook(folder, ['metadata.json'], { chapters: 1, mtime: clock });
        }
      },
    });
    expect(result.missingChapters).toEqual([]);
    expect(counts).toEqual([0, 1]);
    expect(clock - startedAt).toBeGreaterThanOrEqual(5 * 60_000);
  });
});
