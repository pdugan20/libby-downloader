/** @jest-environment node */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DownloadJobs } from '../../mcp/jobs';
import { LoanDownloadService } from '../../services/loan-download-service';

describe('MCP download jobs', () => {
  let root: string;
  const book = 'Test Book (222)';
  const loan = 'https://libbyapp.com/open/loan/111/222';
  let jobs: DownloadJobs;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'libby-mcp-'));
    await fs.mkdir(path.join(root, book));
    await fs.writeFile(path.join(root, book, 'metadata.json'), '{}');
  });

  afterEach(async () => {
    jobs?.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  async function finish(id: string) {
    for (let i = 0; i < 100; i++) {
      const status = jobs.status(id);
      if (status.state !== 'running') return status;
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    throw new Error('Job never finished');
  }

  it('uses real Chrome orchestration and chains tagging/merge only after a complete download', async () => {
    const previousFiles = new Map([['existing-file', 'previous-version']]);
    const snapshotFiles = jest.fn().mockResolvedValue(previousFiles);
    const open = jest.fn().mockResolvedValue(undefined);
    const waitForBook = jest.fn().mockResolvedValue({
      folderPath: path.join(root, book),
      title: 'Test Book',
      chapterCount: 2,
      missingChapters: [],
    });
    const embedToFolder = jest.fn().mockResolvedValue(undefined);
    const mergeFolder = jest
      .fn()
      .mockResolvedValue({ outputPath: path.join(root, book, 'Book.m4b') });
    jobs = new DownloadJobs(root, {
      open,
      downloads: { waitForBook, snapshotFiles },
      metadata: { embedToFolder },
      merger: { mergeFolder },
    });
    const started = jobs.download(loan, { tag: true, merge: true });
    expect(started.state).toBe('running');
    const result = await finish(started.id);
    expect(open).toHaveBeenCalledWith(loan + '#libby-downloader-autostart');
    expect(snapshotFiles.mock.invocationCallOrder[0]).toBeLessThan(
      open.mock.invocationCallOrder[0]
    );
    expect(waitForBook).toHaveBeenCalledWith(
      expect.objectContaining({ titleId: '222', previousFiles })
    );
    expect(embedToFolder).toHaveBeenCalledTimes(1);
    expect(mergeFolder).toHaveBeenCalledWith(
      path.join(root, book),
      expect.objectContaining({ force: false })
    );
    expect(result).toMatchObject({ state: 'completed', book, chapters: 2, outputFile: 'Book.m4b' });
    expect(JSON.stringify(result)).not.toContain(loan);
  });

  it('stops incomplete downloads before tagging and sanitizes service errors', async () => {
    const embedToFolder = jest.fn();
    jobs = new DownloadJobs(root, {
      open: jest.fn().mockResolvedValue(undefined),
      downloads: {
        snapshotFiles: jest.fn().mockResolvedValue(new Map()),
        waitForBook: jest.fn().mockResolvedValue({
          folderPath: path.join(root, book),
          chapterCount: 2,
          missingChapters: [2],
        }),
      },
      metadata: { embedToFolder },
    });
    const result = await finish(jobs.download(loan, { tag: true }).id);
    expect(result.state).toBe('failed');
    expect(result.error).toContain('Download did not complete');
    expect(embedToFolder).not.toHaveBeenCalled();
  });

  it('does not leak raw exceptions or start overlapping mutation jobs', async () => {
    let rejectOpen!: (error: Error) => void;
    jobs = new DownloadJobs(root, {
      open: () => new Promise((_resolve, reject) => (rejectOpen = reject)),
      downloads: {
        snapshotFiles: jest.fn().mockResolvedValue(new Map()),
        waitForBook: jest.fn(),
      },
    });
    const first = jobs.download(loan, {});
    expect(() => jobs.download(loan, {})).toThrow('already running');
    await new Promise((resolve) => setImmediate(resolve));
    rejectOpen(new Error('secret https://audio.example/part?cmpt=private'));
    const result = await finish(first.id);
    expect(result.state).toBe('failed');
    expect(JSON.stringify(result)).not.toMatch(/secret|cmpt|private/);
  });

  it.each(['../outside', '/tmp/book', '.', '..', 'nested/book', 'nested\\book'])(
    'rejects path input %s',
    async (input) => {
      jobs = new DownloadJobs(root);
      await expect(jobs.tag(input)).rejects.toThrow('exact book folder');
    }
  );

  it('rejects symlink folders and symlink metadata before invoking any service', async () => {
    const embedToFolder = jest.fn();
    jobs = new DownloadJobs(root, { metadata: { embedToFolder } });
    await fs.symlink(path.join(root, book), path.join(root, 'link'));
    await expect(jobs.tag('link')).rejects.toThrow('unsafe');
    await fs.symlink(
      path.join(root, book, 'metadata.json'),
      path.join(root, book, 'chapter-001.mp3')
    );
    await expect(jobs.tag(book)).rejects.toThrow('unsafe');
    expect(embedToFolder).not.toHaveBeenCalled();
  });

  it('omits raw metadata from list_books', async () => {
    jobs = new DownloadJobs(root, {
      books: {
        analyzeBook: jest.fn().mockResolvedValue({
          chapterCount: 2,
          hasMetadata: true,
          isTagged: false,
          isMerged: false,
          metadataJson: { secret: '?cmpt=private' },
        }),
      },
    });
    const listed = await jobs.listBooks();
    expect(listed).toHaveLength(1);
    expect(listed[0].book).toBe(book);
    expect(JSON.stringify(listed)).not.toMatch(/metadataJson|cmpt|private/);
  });

  it('cancels a waiting download on shutdown and preserves existing files', async () => {
    const old = new Date(Date.now() - 60_000);
    await fs.utimes(path.join(root, book, 'metadata.json'), old, old);
    jobs = new DownloadJobs(root, {
      open: jest.fn().mockResolvedValue(undefined),
      downloads: new LoanDownloadService(root),
    });
    const started = jobs.download(loan, {});
    await new Promise((resolve) => setTimeout(resolve, 20));
    jobs.close();
    const result = await finish(started.id);
    expect(result.state).toBe('failed');
    expect(result.error).toContain('Server stopped');
    expect(await fs.readFile(path.join(root, book, 'metadata.json'), 'utf8')).toBe('{}');
  });
});
