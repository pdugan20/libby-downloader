/**
 * Tests for download service
 */

import type { Chapter } from '../../types/extension-book';
import { DownloadService } from '../../background/download-service';
import '../mocks/chrome.mock';

describe('DownloadService', () => {
  let service: DownloadService;

  beforeEach(() => {
    service = new DownloadService();
    jest.clearAllMocks();
  });

  describe('downloadChapter', () => {
    const mockChapter: Chapter = {
      index: 0,
      title: 'Chapter 1',
      url: 'https://example.com/chapter1.mp3',
      duration: 1800,
    };

    it('should download a chapter successfully', async () => {
      const result = await service.downloadChapter(mockChapter, 'Test Book', 0);

      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: 'https://example.com/chapter1.mp3',
        filename: 'libby-downloads/Test Book/chapter-001.mp3',
        saveAs: false,
      });

      expect(result).toEqual({
        downloadId: 1,
        filepath: '/path/to/file.mp3',
        chapterIndex: 0,
      });
    });

    it('should format chapter numbers with leading zeros', async () => {
      await service.downloadChapter(mockChapter, 'Test Book', 99);

      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'libby-downloads/Test Book/chapter-100.mp3',
        })
      );
    });

    it('should sanitize book title in filename', async () => {
      await service.downloadChapter(mockChapter, 'Book/With:Invalid*Chars', 0);

      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.stringContaining('Book-With-Invalid-Chars'),
        })
      );
    });

    it('should handle download failures', async () => {
      (chrome.downloads.download as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.downloadChapter(mockChapter, 'Test Book', 0)).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('downloadAllChapters', () => {
    const mockChapters: Chapter[] = [
      {
        index: 0,
        title: 'Chapter 1',
        url: 'https://example.com/chapter1.mp3',
        duration: 1800,
      },
      {
        index: 1,
        title: 'Chapter 2',
        url: 'https://example.com/chapter2.mp3',
        duration: 1800,
      },
    ];

    it('should download all chapters successfully', async () => {
      const progressCallback = jest.fn();
      const result = await service.downloadAllChapters(mockChapters, 'Test Book', progressCallback);

      expect(result.completed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(2);
      expect(result.downloadIds).toHaveLength(2);
      expect(result.errors).toHaveLength(0);

      expect(progressCallback).toHaveBeenCalledWith(1, 2);
      expect(progressCallback).toHaveBeenCalledWith(2, 2);
    });

    it('should continue on individual chapter failure', async () => {
      (chrome.downloads.download as jest.Mock)
        .mockResolvedValueOnce(1) // First chapter succeeds
        .mockRejectedValueOnce(new Error('Failed')); // Second chapter fails

      const result = await service.downloadAllChapters(mockChapters, 'Test Book');

      expect(result.completed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].chapterIndex).toBe(1);
    });

    it('should work without progress callback', async () => {
      const result = await service.downloadAllChapters(mockChapters, 'Test Book');

      expect(result.completed).toBe(2);
      expect(result.failed).toBe(0);
    });
  });
});
