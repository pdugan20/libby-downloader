import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { BookService } from '../services/book-service';
import { MetadataService } from '../services/metadata-service';
import { MergeService } from '../services/merge-service';
import {
  autostartUrl,
  loanTitleId,
  LoanDownloadService,
  openInChrome,
  parseLoanUrl,
} from '../services/loan-download-service';

export interface JobStatus {
  id: string;
  state: 'running' | 'completed' | 'failed';
  phase: 'opening' | 'downloading' | 'tagging' | 'merging' | 'done';
  book?: string;
  chapters?: number;
  current?: number;
  total?: number;
  timemark?: string;
  outputFile?: string;
  error?: string;
}

interface Dependencies {
  books: Pick<BookService, 'analyzeBook'>;
  downloads: Pick<LoanDownloadService, 'waitForBook'>;
  metadata: Pick<MetadataService, 'embedToFolder'>;
  merger: Pick<MergeService, 'mergeFolder'>;
  open: typeof openInChrome;
}

/** Local jobs retain progress only, never loan addresses or signed audio URLs. */
export class DownloadJobs {
  private readonly jobs = new Map<string, JobStatus>();
  private readonly controller = new AbortController();
  private readonly dependencies: Dependencies;
  readonly dataDir: string;

  constructor(dataDir?: string, dependencies: Partial<Dependencies> = {}) {
    const books = new BookService(dataDir);
    this.dataDir = path.resolve(books.getDownloadsFolder());
    this.dependencies = {
      books,
      downloads: new LoanDownloadService(this.dataDir),
      metadata: new MetadataService(),
      merger: new MergeService(),
      open: openInChrome,
      ...dependencies,
    };
  }

  async listBooks() {
    let entries;
    try {
      entries = await fs.readdir(this.dataDir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw new Error('Could not read the downloads directory.');
    }
    const books = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const folder = await this.bookFolder(entry.name);
        const book = await this.dependencies.books.analyzeBook(folder, entry.name);
        if (book) {
          // Deliberately exclude metadataJson, which can come from older extensions.
          books.push({
            book: entry.name,
            chapters: book.chapterCount,
            hasMetadata: book.hasMetadata,
            isTagged: book.isTagged,
            isMerged: book.isMerged,
          });
        }
      } catch {
        // Unsafe or unreadable folders are not offered as mutation targets.
      }
    }
    return books;
  }

  status(id: string): JobStatus {
    const job = this.jobs.get(id);
    if (!job) throw new Error('Unknown job ID. Jobs expire when the server restarts.');
    return { ...job };
  }

  download(loanUrl: string, options: { tag?: boolean; merge?: boolean; force?: boolean }) {
    const loan = parseLoanUrl(loanUrl);
    return this.start('opening', async (job) => {
      const startedAt = Date.now();
      await this.dependencies.open(autostartUrl(loan));
      job.phase = 'downloading';
      const downloaded = await this.dependencies.downloads.waitForBook({
        startedAt,
        titleId: loanTitleId(loan),
        signal: this.controller.signal,
        onProgress: ({ folder, chapters }) => {
          job.book = folder;
          job.chapters = chapters;
        },
      });
      job.book = path.basename(downloaded.folderPath);
      job.chapters = downloaded.chapterCount;
      if (downloaded.chapterCount === 0 || downloaded.missingChapters.length > 0) {
        throw new Error('Incomplete download');
      }
      const folder = await this.bookFolder(job.book);
      if (path.resolve(downloaded.folderPath) !== folder) throw new Error('Unexpected folder');
      if (options.tag) await this.tagFolder(job, folder);
      if (options.merge) await this.mergeFolder(job, folder, options.force);
    });
  }

  async tag(book: string) {
    const folder = await this.bookFolder(book);
    return this.start('tagging', (job) => this.tagFolder(job, folder), book);
  }

  async merge(book: string, force = false) {
    const folder = await this.bookFolder(book);
    return this.start('merging', (job) => this.mergeFolder(job, folder, force), book);
  }

  close(): void {
    this.controller.abort();
  }

  private start(
    phase: JobStatus['phase'],
    run: (job: JobStatus) => Promise<void>,
    book?: string
  ): JobStatus {
    this.controller.signal.throwIfAborted();
    if ([...this.jobs.values()].some((job) => job.state === 'running')) {
      throw new Error('A job is already running. Check get_job before starting another.');
    }
    // Keep a bounded history in memory for clients that poll infrequently.
    if (this.jobs.size >= 50) this.jobs.delete(this.jobs.keys().next().value as string);
    const job: JobStatus = { id: randomUUID(), state: 'running', phase, book };
    this.jobs.set(job.id, job);
    void Promise.resolve()
      .then(() => {
        this.controller.signal.throwIfAborted();
        return run(job);
      })
      .then(() => {
        job.phase = 'done';
        job.state = 'completed';
      })
      .catch(() => {
        job.state = 'failed';
        // Do not forward service errors: they may contain URLs, tokens, or metadata.
        job.error = this.controller.signal.aborted
          ? 'Server stopped. Chrome downloads may continue; completed files are preserved.'
          : job.phase === 'opening'
            ? 'Could not open Chrome. Check that Google Chrome is installed.'
            : job.phase === 'downloading'
              ? 'Download did not complete. Check the Libby tab, active loan, extension, and Chrome download directory.'
              : job.phase === 'tagging'
                ? 'Tagging failed. Check the book metadata and chapter files.'
                : 'Merge failed. Check the chapter files, ffprobe, free disk space, and whether an output already exists. Use force only to replace this book’s existing M4B.';
      });
    return { ...job };
  }

  private async tagFolder(job: JobStatus, folder: string): Promise<void> {
    job.phase = 'tagging';
    await this.dependencies.metadata.embedToFolder(
      folder,
      { signal: this.controller.signal },
      {
        onFileStart: (_filename, current, total) => {
          job.current = current;
          job.total = total;
        },
      }
    );
  }

  private async mergeFolder(job: JobStatus, folder: string, force = false): Promise<void> {
    job.phase = 'merging';
    const result = await this.dependencies.merger.mergeFolder(folder, {
      force,
      signal: this.controller.signal,
      onMergeProgress: (timemark) => {
        job.timemark = timemark;
      },
    });
    job.outputFile = path.basename(result.outputPath);
  }

  /** Resolve an exact direct-child folder and reject symlink inputs before services read it. */
  private async bookFolder(book: string): Promise<string> {
    if (!book || book === '.' || book === '..' || /[/\\\0]/.test(book)) {
      throw new Error('Use an exact book folder name returned by list_books.');
    }
    const folder = path.join(this.dataDir, book);
    try {
      const stat = await fs.lstat(folder);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Unsafe folder');
      const root = await fs.realpath(this.dataDir);
      if (path.dirname(await fs.realpath(folder)) !== root) throw new Error('Outside root');
      for (const name of await fs.readdir(folder)) {
        if (!/\.(mp3|m4b|json)$/i.test(name)) continue;
        const child = await fs.lstat(path.join(folder, name));
        if (!child.isFile() || child.isSymbolicLink()) throw new Error('Unsafe file');
      }
    } catch {
      throw new Error('Book folder is missing, unreadable, or contains unsafe file links.');
    }
    return folder;
  }
}
