/**
 * Tests for MetadataService
 */

import { MetadataService } from '../../services/metadata-service';
import { createMetadataJsonString } from '../setup/fixtures/metadata.fixture';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
  },
}));

jest.mock('node-id3', () => ({
  __esModule: true,
  default: {
    write: jest.fn(() => true),
    read: jest.fn(() => ({})),
    removeTags: jest.fn(() => true),
  },
}));

global.fetch = jest.fn();

import { promises as fs } from 'fs';
import NodeID3 from 'node-id3';

describe('MetadataService', () => {
  let metadataService: MetadataService;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockNodeID3 = NodeID3 as jest.Mocked<typeof NodeID3>;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    metadataService = new MetadataService();
    jest.clearAllMocks();
    (mockNodeID3.write as any).mockReturnValue(true);
    (mockNodeID3.read as any).mockReturnValue({});
    (mockNodeID3.removeTags as any).mockReturnValue(true);
  });

  describe('embedToFolder', () => {
    beforeEach(() => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false,
      } as any);

      mockFs.readdir.mockResolvedValue(['chapter-1.mp3', 'chapter-2.mp3', 'metadata.json'] as any);

      mockFs.readFile.mockImplementation((path: any) => {
        if (path.includes('metadata.json')) {
          return Promise.resolve(createMetadataJsonString());
        }
        return Promise.reject(new Error('File not found'));
      });
    });

    it('should tag all MP3 files in folder with metadata', async () => {
      await metadataService.embedToFolder('/test/book');

      expect(mockNodeID3.write).toHaveBeenCalledTimes(2);
      expect(mockNodeID3.write).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Chapter 1',
          artist: 'Sample Author',
          album: 'Sample Audiobook',
          genre: 'Audiobook',
        }),
        '/test/book/chapter-1.mp3'
      );
    });

    it('should throw error if path is not a directory', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
      } as any);

      await expect(metadataService.embedToFolder('/test/file.mp3')).rejects.toThrow(
        'Not a directory'
      );
    });

    it('should throw error if no MP3 files found', async () => {
      mockFs.readdir.mockResolvedValue(['README.md', 'cover.jpg'] as any);

      await expect(metadataService.embedToFolder('/test/book')).rejects.toThrow(
        'No MP3 files found'
      );
    });

    it('should use options when no metadata file exists', async () => {
      mockFs.readdir.mockResolvedValue(['chapter-1.mp3'] as any);
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      await metadataService.embedToFolder('/test/book', {
        title: 'Custom Title',
        author: 'Custom Author',
      });

      expect(mockNodeID3.write).toHaveBeenCalledWith(
        expect.objectContaining({
          album: 'Custom Title',
          artist: 'Custom Author',
        }),
        '/test/book/chapter-1.mp3'
      );
    });

    it('should download cover art if URL provided', async () => {
      mockFetch.mockResolvedValue({
        arrayBuffer: async () => new ArrayBuffer(100),
      } as any);

      await metadataService.embedToFolder('/test/book');

      expect(mockFetch).toHaveBeenCalled();
      expect(mockNodeID3.write).toHaveBeenCalledWith(
        expect.objectContaining({
          image: expect.objectContaining({
            mime: 'image/jpeg',
            type: expect.objectContaining({ id: 3 }),
          }),
        }),
        expect.any(String)
      );
    });

    it('should handle cover art download failure gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await metadataService.embedToFolder('/test/book');

      expect(mockNodeID3.write).toHaveBeenCalled();
      // Should still tag files even if cover download fails
    });

    it('should handle complex description format', async () => {
      const metadataWithComplexDesc = {
        metadata: {
          title: 'Test Book',
          authors: ['Author'],
          description: {
            full: 'Full description',
            short: 'Short description',
          },
        },
        chapters: [{ index: 0, title: 'Chapter 1', duration: 100 }],
      };

      mockFs.readFile.mockImplementation((path: any) => {
        if (path.includes('metadata.json')) {
          return Promise.resolve(JSON.stringify(metadataWithComplexDesc));
        }
        return Promise.reject(new Error('File not found'));
      });

      mockFs.readdir.mockResolvedValue(['chapter-1.mp3', 'metadata.json'] as any);

      await metadataService.embedToFolder('/test/book');

      expect(mockNodeID3.write).toHaveBeenCalledWith(
        expect.objectContaining({
          comment: expect.objectContaining({
            text: 'Short description',
          }),
        }),
        expect.any(String)
      );
    });
  });

  describe('embedToFile', () => {
    it('should write ID3 tags to file', async () => {
      await metadataService.embedToFile('/test/file.mp3', {
        title: 'Test Title',
        artist: 'Test Artist',
        album: 'Test Album',
      });

      expect(mockNodeID3.write).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          artist: 'Test Artist',
          album: 'Test Album',
          genre: 'Audiobook',
        }),
        '/test/file.mp3'
      );
    });

    it('should include all optional metadata fields', async () => {
      const coverBuffer = Buffer.from('fake image data');

      await metadataService.embedToFile('/test/file.mp3', {
        title: 'Title',
        artist: 'Artist',
        album: 'Album',
        performerInfo: 'Narrator',
        trackNumber: '1/10',
        genre: 'Audiobook',
        year: '2024',
        comment: 'Test comment',
        coverBuffer,
      });

      expect(mockNodeID3.write).toHaveBeenCalledWith(
        expect.objectContaining({
          performerInfo: 'Narrator',
          trackNumber: '1/10',
          year: '2024',
          comment: expect.objectContaining({
            text: 'Test comment',
          }),
          image: expect.objectContaining({
            imageBuffer: coverBuffer,
          }),
        }),
        '/test/file.mp3'
      );
    });

    it('should throw error if write fails', async () => {
      (mockNodeID3.write as any).mockReturnValue(false);

      await expect(
        metadataService.embedToFile('/test/file.mp3', {
          title: 'Title',
          artist: 'Artist',
          album: 'Album',
        })
      ).rejects.toThrow('Failed to write ID3 tags');
    });
  });

  describe('readMetadata', () => {
    it('should read tags from file', async () => {
      const mockTags = {
        title: 'Test Title',
        artist: 'Test Artist',
        album: 'Test Album',
      };
      (mockNodeID3.read as any).mockReturnValue(mockTags);

      const result = await metadataService.readMetadata('/test/file.mp3');

      expect(result).toEqual(mockTags);
      expect(mockNodeID3.read).toHaveBeenCalledWith('/test/file.mp3');
    });

    it('should return null on error', async () => {
      mockNodeID3.read.mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = await metadataService.readMetadata('/test/file.mp3');

      expect(result).toBeNull();
    });
  });

  describe('removeMetadata', () => {
    it('should remove tags from file', async () => {
      await metadataService.removeMetadata('/test/file.mp3');

      expect(mockNodeID3.removeTags).toHaveBeenCalledWith('/test/file.mp3');
    });

    it('should throw error if removal fails', async () => {
      (mockNodeID3.removeTags as any).mockReturnValue(false);

      await expect(metadataService.removeMetadata('/test/file.mp3')).rejects.toThrow(
        'Failed to remove ID3 tags'
      );
    });
  });
});
