/**
 * Tests for FileService
 */

import { FileService } from '../../services/file-service';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock fs
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
  },
}));

describe('FileService', () => {
  let fileService: FileService;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    fileService = new FileService();
    jest.clearAllMocks();
  });

  describe('exists', () => {
    it('should return true if file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await fileService.exists('/test/file.txt');

      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should return false if file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await fileService.exists('/test/missing.txt');

      expect(result).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file as string with default encoding', async () => {
      mockFs.readFile.mockResolvedValue('file contents' as any);

      const result = await fileService.readFile('/test/file.txt');

      expect(result).toBe('file contents');
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf-8');
    });

    it('should read file with specified encoding', async () => {
      mockFs.readFile.mockResolvedValue('ascii contents' as any);

      const result = await fileService.readFile('/test/file.txt', 'ascii');

      expect(result).toBe('ascii contents');
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/file.txt', 'ascii');
    });
  });

  describe('readFileBuffer', () => {
    it('should read file as buffer', async () => {
      const buffer = Buffer.from('test');
      mockFs.readFile.mockResolvedValue(buffer as any);

      const result = await fileService.readFileBuffer('/test/file.bin');

      expect(result).toBe(buffer);
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/file.bin');
    });
  });

  describe('writeFile', () => {
    it('should write string to file', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await fileService.writeFile('/test/file.txt', 'content');

      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/file.txt', 'content');
    });

    it('should write buffer to file', async () => {
      const buffer = Buffer.from('test');
      mockFs.writeFile.mockResolvedValue(undefined);

      await fileService.writeFile('/test/file.bin', buffer);

      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/file.bin', buffer);
    });
  });

  describe('readdir', () => {
    it('should read directory contents', async () => {
      mockFs.readdir.mockResolvedValue(['file1.txt', 'file2.txt'] as any);

      const result = await fileService.readdir('/test/dir');

      expect(result).toEqual(['file1.txt', 'file2.txt']);
      expect(mockFs.readdir).toHaveBeenCalledWith('/test/dir');
    });
  });

  describe('readdirWithFileTypes', () => {
    it('should read directory with file types', async () => {
      const entries = [
        { name: 'file.txt', isDirectory: () => false, isFile: () => true },
        { name: 'dir', isDirectory: () => true, isFile: () => false },
      ];
      mockFs.readdir.mockResolvedValue(entries as any);

      const result = await fileService.readdirWithFileTypes('/test/dir');

      expect(result).toEqual(entries);
      expect(mockFs.readdir).toHaveBeenCalledWith('/test/dir', { withFileTypes: true });
    });
  });

  describe('stat', () => {
    it('should get file stats', async () => {
      const stats = {
        isDirectory: () => false,
        isFile: () => true,
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-02'),
        size: 1024,
      };
      mockFs.stat.mockResolvedValue(stats as any);

      const result = await fileService.stat('/test/file.txt');

      expect(result).toEqual(stats);
      expect(mockFs.stat).toHaveBeenCalledWith('/test/file.txt');
    });
  });

  describe('path utilities', () => {
    it('should join paths', () => {
      const result = fileService.join('foo', 'bar', 'baz.txt');
      expect(result).toBe(path.join('foo', 'bar', 'baz.txt'));
    });

    it('should get basename', () => {
      const result = fileService.basename('/foo/bar/file.txt');
      expect(result).toBe('file.txt');
    });

    it('should get basename without extension', () => {
      const result = fileService.basename('/foo/bar/file.txt', '.txt');
      expect(result).toBe('file');
    });

    it('should get dirname', () => {
      const result = fileService.dirname('/foo/bar/file.txt');
      expect(result).toBe(path.dirname('/foo/bar/file.txt'));
    });

    it('should get extname', () => {
      const result = fileService.extname('/foo/bar/file.txt');
      expect(result).toBe('.txt');
    });

    it('should resolve paths', () => {
      const result = fileService.resolve('foo', 'bar');
      expect(result).toBe(path.resolve('foo', 'bar'));
    });

    it('should check if path is absolute', () => {
      expect(fileService.isAbsolute('/absolute/path')).toBe(true);
      expect(fileService.isAbsolute('relative/path')).toBe(false);
    });
  });
});
