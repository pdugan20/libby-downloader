/**
 * Tests for BookService
 */

import { BookService } from '../../services/book-service';
import { createMockBooks, createMockBookInfo } from '../setup/fixtures/books.fixture';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn(),
  },
}));

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
}));

import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import * as os from 'os';
import * as path from 'path';

describe('BookService', () => {
  let bookService: BookService;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockExecFile = execFile as jest.MockedFunction<typeof execFile>;

  beforeEach(() => {
    bookService = new BookService();
    jest.clearAllMocks();
  });

  describe('getDownloadsFolder', () => {
    it('should return the correct downloads folder path', () => {
      const expected = path.join(os.homedir(), 'Downloads', 'libby-downloads');
      expect(bookService.getDownloadsFolder()).toBe(expected);
    });
  });

  describe('discoverBooks', () => {
    it('should return empty array if downloads folder does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const books = await bookService.discoverBooks();

      expect(books).toEqual([]);
      expect(mockFs.access).toHaveBeenCalled();
    });

    it('should discover and return books from downloads folder', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([
        { name: 'Book1', isDirectory: () => true, isFile: () => false },
        { name: 'Book2', isDirectory: () => true, isFile: () => false },
        { name: 'file.txt', isDirectory: () => false, isFile: () => true },
      ] as any);

      // Mock analyzeBook to return valid books
      jest.spyOn(bookService, 'analyzeBook').mockImplementation(async (bookPath, name) => {
        if (name === 'Book1' || name === 'Book2') {
          return createMockBookInfo({ name, path: bookPath });
        }
        return null;
      });

      const books = await bookService.discoverBooks();

      expect(books).toHaveLength(2);
      expect(books[0].name).toBe('Book1');
      expect(books[1].name).toBe('Book2');
    });

    it('should sort books by download time (newest first)', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([
        { name: 'OldBook', isDirectory: () => true, isFile: () => false },
        { name: 'NewBook', isDirectory: () => true, isFile: () => false },
      ] as any);

      jest.spyOn(bookService, 'analyzeBook').mockImplementation(async (bookPath, name) => {
        return createMockBookInfo({
          name,
          path: bookPath,
          downloadedAt: name === 'NewBook' ? new Date('2024-02-01') : new Date('2024-01-01'),
        });
      });

      const books = await bookService.discoverBooks();

      expect(books[0].name).toBe('NewBook');
      expect(books[1].name).toBe('OldBook');
    });
  });

  describe('analyzeBook', () => {
    it('should return null if no MP3 files found', async () => {
      mockFs.readdir.mockResolvedValue(['README.md', 'cover.jpg'] as any);

      const result = await bookService.analyzeBook('/path/to/book', 'TestBook');

      expect(result).toBeNull();
    });

    it('should analyze book with metadata file', async () => {
      mockFs.readdir.mockResolvedValue(['chapter-1.mp3', 'chapter-2.mp3', 'metadata.json'] as any);
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          metadata: {
            title: 'Test Book',
            authors: ['Test Author'],
          },
          chapters: [{ title: 'Chapter 1' }, { title: 'Chapter 2' }],
        })
      );
      mockFs.stat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-01'),
      } as any);

      // Mock checkIfTagged
      mockExecFile.mockImplementation((cmd: any, args: any, callback: any) => {
        callback(null, {
          stdout: JSON.stringify({
            format: { tags: { album: 'Test', artist: 'Author' } },
          }),
        });
        return {} as any;
      });

      const result = await bookService.analyzeBook('/path/to/book', 'TestBook');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('TestBook');
      expect(result?.chapterCount).toBe(2);
      expect(result?.hasMetadata).toBe(true);
      expect(result?.metadataJson?.metadata.title).toBe('Test Book');
    });

    it('should handle book without metadata file', async () => {
      mockFs.readdir.mockResolvedValue(['chapter-1.mp3', 'chapter-2.mp3'] as any);
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.stat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-01'),
      } as any);

      mockExecFile.mockImplementation((cmd: any, args: any, callback: any) => {
        callback(null, { stdout: JSON.stringify({ format: {} }) });
        return {} as any;
      });

      const result = await bookService.analyzeBook('/path/to/book', 'TestBook');

      expect(result).not.toBeNull();
      expect(result?.hasMetadata).toBe(false);
      expect(result?.metadataJson).toBeUndefined();
    });

    it('should detect merged files', async () => {
      mockFs.readdir.mockResolvedValue(['chapter-1.mp3', 'chapter-2.mp3', 'full-book.m4b'] as any);
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.stat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-01'),
      } as any);

      mockExecFile.mockImplementation((cmd: any, args: any, callback: any) => {
        callback(null, { stdout: JSON.stringify({ format: {} }) });
        return {} as any;
      });

      const result = await bookService.analyzeBook('/path/to/book', 'TestBook');

      expect(result?.isMerged).toBe(true);
    });
  });

  describe('findBook', () => {
    it('should find book by index', async () => {
      const mockBooks = createMockBooks(3);
      jest.spyOn(bookService, 'discoverBooks').mockResolvedValue(mockBooks);

      const result = await bookService.findBook('2');

      expect(result).toBe(mockBooks[1]);
    });

    it('should find book by exact name', async () => {
      const mockBooks = createMockBooks(3);
      jest.spyOn(bookService, 'discoverBooks').mockResolvedValue(mockBooks);

      const result = await bookService.findBook('Book 1');

      expect(result).toBe(mockBooks[0]);
    });

    it('should find book by case-insensitive match', async () => {
      const mockBooks = createMockBooks(3);
      jest.spyOn(bookService, 'discoverBooks').mockResolvedValue(mockBooks);

      const result = await bookService.findBook('book 1');

      expect(result).toBe(mockBooks[0]);
    });

    it('should find book by partial match', async () => {
      const mockBooks = createMockBooks(3);
      jest.spyOn(bookService, 'discoverBooks').mockResolvedValue(mockBooks);

      const result = await bookService.findBook('book');

      expect(result).not.toBeNull();
    });

    it('should return null if no match found', async () => {
      jest.spyOn(bookService, 'discoverBooks').mockResolvedValue(createMockBooks(3));

      const result = await bookService.findBook('NonExistent');

      expect(result).toBeNull();
    });
  });

  describe('filterBooks', () => {
    it('should filter tagged books', () => {
      const books = createMockBooks(5);

      const result = bookService.filterBooks(books, { tagged: true });

      expect(result.every((b) => b.isTagged)).toBe(true);
    });

    it('should filter untagged books', () => {
      const books = createMockBooks(5);

      const result = bookService.filterBooks(books, { untagged: true });

      expect(result.every((b) => !b.isTagged)).toBe(true);
    });

    it('should filter merged books', () => {
      const books = createMockBooks(5);

      const result = bookService.filterBooks(books, { merged: true });

      expect(result.every((b) => b.isMerged)).toBe(true);
    });

    it('should apply multiple filters', () => {
      const books = createMockBooks(10);

      const result = bookService.filterBooks(books, {
        tagged: true,
        merged: true,
      });

      expect(result.every((b) => b.isTagged && b.isMerged)).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should calculate correct statistics', () => {
      const books = createMockBooks(10);

      const stats = bookService.getStatistics(books);

      expect(stats.total).toBe(10);
      expect(stats.tagged).toBeGreaterThan(0);
      expect(stats.untagged).toBeGreaterThan(0);
      expect(stats.tagged + stats.untagged).toBe(10);
    });

    it('should handle empty array', () => {
      const stats = bookService.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.tagged).toBe(0);
      expect(stats.untagged).toBe(0);
    });
  });

  describe('formatTimeAgo', () => {
    it('should format recent time as "just now"', () => {
      const date = new Date();
      expect(bookService.formatTimeAgo(date)).toBe('just now');
    });

    it('should format minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      expect(bookService.formatTimeAgo(date)).toBe('5 minutes ago');
    });

    it('should format hours ago', () => {
      const date = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(bookService.formatTimeAgo(date)).toBe('2 hours ago');
    });

    it('should format days ago', () => {
      const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(bookService.formatTimeAgo(date)).toBe('3 days ago');
    });

    it('should format old dates as locale date string', () => {
      const date = new Date('2020-01-01');
      const result = bookService.formatTimeAgo(date);
      expect(result).toBe(date.toLocaleDateString());
    });
  });
});
