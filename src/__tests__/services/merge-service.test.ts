import { MergeService } from '../../services/merge-service';
import { createMockMetadata } from '../setup/fixtures/metadata.fixture';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    access: jest.fn(),
    unlink: jest.fn(),
    mkdtemp: jest.fn(),
    rm: jest.fn(),
  },
}));

jest.mock('fluent-ffmpeg');
jest.mock('@ffmpeg-installer/ffmpeg', () => ({
  path: '/mock/ffmpeg',
}));

global.fetch = jest.fn() as jest.Mock;

import { promises as fs } from 'fs';
import ffmpeg from 'fluent-ffmpeg';

describe('MergeService', () => {
  let mergeService: MergeService;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockFfmpeg = ffmpeg as jest.MockedFunction<typeof ffmpeg>;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mergeService = new MergeService();
    jest.clearAllMocks();

    // Setup default mocks
    mockFs.stat.mockResolvedValue({
      isDirectory: () => true,
      isFile: () => false,
    } as any);

    mockFs.readdir.mockResolvedValue(['chapter-1.mp3', 'chapter-2.mp3', 'metadata.json'] as any);

    mockFs.readFile.mockImplementation((path: any) => {
      if (path.includes('metadata.json')) {
        return Promise.resolve(JSON.stringify(createMockMetadata()));
      }
      return Promise.reject(new Error('File not found'));
    });

    mockFs.mkdtemp.mockResolvedValue('/tmp/libby-merge-abc123');
    mockFs.access.mockRejectedValue({ code: 'ENOENT' } as any);

    // Mock ffmpeg
    const mockCommand = {
      input: jest.fn().mockReturnThis(),
      inputOptions: jest.fn().mockReturnThis(),
      outputOptions: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      on: jest.fn(function (this: any, event: string, handler: any) {
        if (event === 'end') {
          setTimeout(() => handler(), 0);
        }
        return this;
      }),
      run: jest.fn(),
    };
    mockFfmpeg.mockReturnValue(mockCommand as any);

    // Mock ffprobe
    (ffmpeg as any).ffprobe = jest.fn((_file: string, callback: any) => {
      callback(null, {
        format: { duration: 1800 },
      });
    });

    // Mock fetch
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    } as any);
  });

  describe('mergeFolder', () => {
    it('should merge chapters into M4B audiobook', async () => {
      const outputPath = await mergeService.mergeFolder('/test/book');

      expect(outputPath).toContain('.m4b');
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockFfmpeg).toHaveBeenCalled();
    });

    it('should throw error if folder is not a directory', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
      } as any);

      await expect(mergeService.mergeFolder('/test/file.mp3')).rejects.toThrow('Not a directory');
    });

    it('should throw error if metadata.json is missing', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' } as any);

      await expect(mergeService.mergeFolder('/test/book')).rejects.toThrow(
        'metadata.json not found'
      );
    });

    it('should throw error if metadata.json has no title', async () => {
      mockFs.readFile.mockImplementation((path: any) => {
        if (path.includes('metadata.json')) {
          return Promise.resolve(
            JSON.stringify({
              metadata: { authors: ['Test'] },
              chapters: [{ index: 0, title: 'Ch 1', duration: 100 }],
            })
          );
        }
        return Promise.reject(new Error('File not found'));
      });

      await expect(mergeService.mergeFolder('/test/book')).rejects.toThrow(
        'missing required field: title'
      );
    });

    it('should throw error if metadata.json has no authors', async () => {
      mockFs.readFile.mockImplementation((path: any) => {
        if (path.includes('metadata.json')) {
          return Promise.resolve(
            JSON.stringify({
              metadata: { title: 'Test', authors: [] },
              chapters: [{ index: 0, title: 'Ch 1', duration: 100 }],
            })
          );
        }
        return Promise.reject(new Error('File not found'));
      });

      await expect(mergeService.mergeFolder('/test/book')).rejects.toThrow(
        'missing required field: authors'
      );
    });

    it('should throw error if no chapter files found', async () => {
      mockFs.readdir.mockResolvedValue(['README.md', 'metadata.json'] as any);

      await expect(mergeService.mergeFolder('/test/book')).rejects.toThrow(
        'No chapter MP3 files found'
      );
    });

    it('should throw error if output file already exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      await expect(mergeService.mergeFolder('/test/book')).rejects.toThrow('already exists');
    });

    it('should handle cover art download failure gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const outputPath = await mergeService.mergeFolder('/test/book');

      expect(outputPath).toContain('.m4b');
    });

    it('should clean up temp files after merge', async () => {
      await mergeService.mergeFolder('/test/book');

      expect(mockFs.rm).toHaveBeenCalledWith(
        '/tmp/libby-merge-abc123',
        expect.objectContaining({ recursive: true })
      );
    });

    it('should sanitize output filename', async () => {
      mockFs.readFile.mockImplementation((path: any) => {
        if (path.includes('metadata.json')) {
          const metadata = createMockMetadata({
            title: 'Book/Title:With*Bad?Chars',
          });
          return Promise.resolve(JSON.stringify(metadata));
        }
        return Promise.reject(new Error('File not found'));
      });

      const outputPath = await mergeService.mergeFolder('/test/book');

      expect(outputPath).toContain('Book-Title-With-Bad-Chars.m4b');
    });

    it('should sort chapter files numerically', async () => {
      mockFs.readdir.mockResolvedValue([
        'chapter-10.mp3',
        'chapter-2.mp3',
        'chapter-1.mp3',
        'metadata.json',
      ] as any);

      await mergeService.mergeFolder('/test/book');

      const writeFileCalls = mockFs.writeFile.mock.calls;
      const concatFileCall = writeFileCalls.find((call) => call[0].toString().includes('concat'));

      expect(concatFileCall).toBeDefined();
      const concatContent = concatFileCall?.[1] as string;
      expect(concatContent).toMatch(/chapter-1.*chapter-2.*chapter-10/s);
    });

    it('should handle ffmpeg error', async () => {
      const mockCommand = {
        input: jest.fn().mockReturnThis(),
        inputOptions: jest.fn().mockReturnThis(),
        outputOptions: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        on: jest.fn(function (this: any, event: string, handler: any) {
          if (event === 'error') {
            setTimeout(() => handler(new Error('FFmpeg failed')), 0);
          }
          return this;
        }),
        run: jest.fn(),
      };
      mockFfmpeg.mockReturnValue(mockCommand as any);

      await expect(mergeService.mergeFolder('/test/book')).rejects.toThrow(
        'Failed to merge audiobook'
      );
    });

    it('should fallback to metadata duration if ffprobe fails', async () => {
      (ffmpeg as any).ffprobe = jest.fn((_file: string, callback: any) => {
        callback(new Error('Probe failed'));
      });

      const outputPath = await mergeService.mergeFolder('/test/book');

      expect(outputPath).toContain('.m4b');
    });
  });
});
