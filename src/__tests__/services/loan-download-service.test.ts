/**
 * Tests for starting and watching a libby download
 */

import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  autostartUrl,
  LoanDownloadService,
  loanTitleId,
  parseLoanUrl,
} from '../../services/loan-download-service';

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
});
