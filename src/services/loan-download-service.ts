/**
 * LoanDownloadService - Start a Libby loan download in Chrome and wait for its files
 *
 * The Chrome extension does the downloading. This service opens the loan with the
 * autostart marker, then watches the downloads folder for the book's chapters and
 * its metadata.json, which the extension writes after the last chapter.
 */

import { execFile, spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AUTOSTART_HASH } from '../shared/autostart';

const LOAN_PATH = /^\/open\/loan\/(\d+)\/(\d+)\/?$/;
const CHAPTER_FILE = /^chapter-(\d{3,})\.mp3$/;

export interface DownloadProgressInfo {
  /** Book folder name, once the first file for it appears */
  folder?: string;
  chapters: number;
}

export interface DownloadedBook {
  folderPath: string;
  title: string;
  chapterCount: number;
  /** One-based chapter numbers listed in metadata.json but not downloaded */
  missingChapters: number[];
}

export interface WaitForBookOptions {
  /** File versions captured before Chrome opens; unchanged files cannot complete a new request. */
  previousFiles?: ReadonlyMap<string, string>;
  /** Request time for deadlines and the timestamp cutoff when no snapshot was supplied. */
  startedAt: number;
  /** Only watch the folder for this Libby title, named "<title> (<titleId>)" */
  titleId?: string;
  /** Give up after this long in total */
  timeoutMs?: number;
  /** Give up when no file changes for this long */
  idleTimeoutMs?: number;
  pollIntervalMs?: number;
  onProgress?: (progress: DownloadProgressInfo) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

interface FolderActivity {
  name: string;
  chapterNumbers: Set<number>;
  metadataFresh: boolean;
  latestChange: number;
  fileVersions: Map<string, string>;
}

/**
 * Validate a Libby loan address and return it without query or hash.
 * @throws {Error} When the address isn't a libbyapp.com loan page
 */
export function parseLoanUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    url = new URL('invalid:');
  }
  const match = url.pathname.match(LOAN_PATH);
  if (url.protocol !== 'https:' || url.hostname !== 'libbyapp.com' || !match) {
    throw new Error(
      'Expected a Libby loan address like https://libbyapp.com/open/loan/123456/7890123. Open the audiobook in Libby and copy the address.'
    );
  }
  return `https://libbyapp.com/open/loan/${match[1]}/${match[2]}`;
}

/**
 * The address that makes the extension start downloading when the page loads
 */
export function autostartUrl(loanUrl: string): string {
  return parseLoanUrl(loanUrl) + AUTOSTART_HASH;
}

/**
 * Libby's title ID from a loan address; the extension adds it to the book's folder name
 */
export function loanTitleId(loanUrl: string): string {
  return parseLoanUrl(loanUrl).split('/').pop() as string;
}

/**
 * Open a URL in Google Chrome, where the extension is installed
 */
export function openInChrome(url: string): Promise<void> {
  const [command, args]: [string, string[]] =
    process.platform === 'darwin'
      ? ['open', ['-a', 'Google Chrome', url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', 'chrome', url]]
        : ['google-chrome', [url]];

  return new Promise((resolve, reject) => {
    if (process.platform !== 'darwin' && process.platform !== 'win32') {
      // Linux Chrome stays alive until the browser closes. Observe process startup,
      // then detach instead of waiting for session termination.
      const child = spawn(command, args, { detached: true, stdio: 'ignore' });
      child.once('error', (error) => reject(new Error(`Couldn't open Chrome: ${error.message}`)));
      child.once('spawn', () => {
        child.unref();
        resolve();
      });
      return;
    }
    execFile(command, args, (error) =>
      error ? reject(new Error(`Couldn't open Chrome: ${error.message}`)) : resolve()
    );
  });
}

export class LoanDownloadService {
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(os.homedir(), 'Downloads', 'libby-downloads');
  }

  /** Capture existing chapter and completion-marker versions before launching Chrome. */
  async snapshotFiles(): Promise<ReadonlyMap<string, string>> {
    const folders = await this.scanActivity(-Infinity);
    return new Map(folders.flatMap((folder) => [...folder.fileVersions]));
  }

  /**
   * Wait for the extension to finish a book requested at startedAt.
   * Finishes when that book's metadata.json is written, which happens after its last
   * chapter, and reports any chapters that didn't arrive.
   * @throws {Error} When nothing changes for idleTimeoutMs or the total timeout passes
   */
  async waitForBook(options: WaitForBookOptions): Promise<DownloadedBook> {
    const {
      startedAt,
      titleId,
      previousFiles,
      timeoutMs = 60 * 60 * 1000,
      idleTimeoutMs = 3 * 60 * 1000,
      pollIntervalMs = 2000,
      onProgress,
      sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
      now = Date.now,
    } = options;

    let lastChange = startedAt;
    let lastReported = '';

    for (;;) {
      const folders = (await this.scanActivity(startedAt, previousFiles)).filter(
        (folder) => !titleId || folder.name.endsWith(` (${titleId})`)
      );
      const book =
        folders.find((folder) => folder.metadataFresh) ??
        folders.sort((a, b) => b.latestChange - a.latestChange)[0];

      if (book) {
        lastChange = Math.max(lastChange, book.latestChange);
        const report = `${book.name}:${book.chapterNumbers.size}`;
        if (report !== lastReported) {
          lastReported = report;
          lastChange = Math.max(lastChange, now());
          onProgress?.({ folder: book.name, chapters: book.chapterNumbers.size });
        }
        if (book.metadataFresh) {
          return this.finish(book);
        }
      }

      const current = now();
      if (current - lastChange > idleTimeoutMs) {
        throw new Error(
          book
            ? `The download of "${book.name}" stopped after ${book.chapterNumbers.size} chapters. Check the Libby tab in Chrome.`
            : "Chrome didn't start the download. Check that you're signed in to Libby, the loan is active, and the Libby Downloader extension is installed."
        );
      }
      if (current - startedAt > timeoutMs) {
        throw new Error('The download took longer than the time limit.');
      }
      await sleep(pollIntervalMs);
    }
  }

  private async finish(book: FolderActivity): Promise<DownloadedBook> {
    const folderPath = path.join(this.dataDir, book.name);
    const raw = await fs.readFile(path.join(folderPath, 'metadata.json'), 'utf-8');
    const metadata = JSON.parse(raw) as {
      metadata?: { title?: string };
      chapters?: unknown[];
    };
    const chapterCount = Array.isArray(metadata.chapters) ? metadata.chapters.length : 0;
    const missingChapters: number[] = [];
    for (let number = 1; number <= chapterCount; number++) {
      if (!book.chapterNumbers.has(number)) {
        missingChapters.push(number);
      }
    }
    return {
      folderPath,
      title: metadata.metadata?.title || book.name,
      chapterCount,
      missingChapters,
    };
  }

  /**
   * Collect files changed since the cutoff, grouped by book folder
   */
  private async scanActivity(
    cutoff: number,
    previousFiles?: ReadonlyMap<string, string>
  ): Promise<FolderActivity[]> {
    let entries;
    try {
      entries = await fs.readdir(this.dataDir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw new Error('Could not read the downloads directory.');
    }

    const folders: FolderActivity[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const activity: FolderActivity = {
        name: entry.name,
        chapterNumbers: new Set(),
        metadataFresh: false,
        latestChange: 0,
        fileVersions: new Map(),
      };
      const folderPath = path.join(this.dataDir, entry.name);
      let files: string[];
      try {
        files = await fs.readdir(folderPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw new Error('Could not read a book directory.');
      }
      for (const file of files) {
        const chapter = file.match(CHAPTER_FILE);
        const partial = /^chapter-\d{3,}\.mp3\.crdownload$/.test(file);
        if (!chapter && !partial && file !== 'metadata.json') continue;
        let stat;
        try {
          stat = await fs.lstat(path.join(folderPath, file));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
          throw new Error('Could not inspect a downloaded file.');
        }
        if (!stat.isFile()) continue;
        const key = path.join(entry.name, file);
        const version = `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
        activity.fileVersions.set(key, version);
        if (previousFiles ? previousFiles.get(key) === version : stat.mtimeMs < cutoff) continue;
        activity.latestChange = Math.max(activity.latestChange, stat.mtimeMs, stat.ctimeMs);
        if (chapter) {
          activity.chapterNumbers.add(Number(chapter[1]));
        } else if (file === 'metadata.json') {
          activity.metadataFresh = true;
        }
      }
      if (activity.latestChange > 0 || activity.chapterNumbers.size > 0 || activity.metadataFresh) {
        folders.push(activity);
      }
    }
    return folders;
  }
}
