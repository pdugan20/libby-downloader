/**
 * Tests for download tracker
 */

import type { BookData } from '../../types/extension-book';
import { DownloadTracker } from '../../background/download-tracker';

describe('DownloadTracker', () => {
  let tracker: DownloadTracker;

  beforeEach(() => {
    tracker = new DownloadTracker();
  });

  const mockBookData: BookData = {
    metadata: {
      title: 'Test Book',
      authors: ['Test Author'],
    },
    chapters: [
      { index: 0, title: 'Ch1', url: 'http://test.com/1.mp3', duration: 100 },
      { index: 1, title: 'Ch2', url: 'http://test.com/2.mp3', duration: 100 },
    ],
  };

  describe('createDownload', () => {
    it('should create a new download entry', () => {
      const bookId = tracker.createDownload(mockBookData);

      expect(bookId).toBeTruthy();
      expect(typeof bookId).toBe('string');

      const status = tracker.getDownloadStatus(bookId);
      expect(status).toBeTruthy();
      expect(status?.metadata.title).toBe('Test Book');
      expect(status?.totalChapters).toBe(2);
      expect(status?.completedChapters).toBe(0);
      expect(status?.failedChapters).toBe(0);
      expect(status?.status).toBe('downloading');
    });

    it('should generate unique book IDs', async () => {
      const bookId1 = tracker.createDownload(mockBookData);
      // Wait 10ms to ensure different timestamp (1ms was too unreliable in CI)
      await new Promise((resolve) => setTimeout(resolve, 10));
      const bookId2 = tracker.createDownload(mockBookData);

      expect(bookId1).not.toBe(bookId2);
    });
  });

  describe('updateProgress', () => {
    it('should update download progress', () => {
      const bookId = tracker.createDownload(mockBookData);

      tracker.updateProgress(bookId, 1, 0);

      const status = tracker.getDownloadStatus(bookId);
      expect(status?.completedChapters).toBe(1);
      expect(status?.failedChapters).toBe(0);
    });

    it('should handle failed chapters', () => {
      const bookId = tracker.createDownload(mockBookData);

      tracker.updateProgress(bookId, 1, 1);

      const status = tracker.getDownloadStatus(bookId);
      expect(status?.completedChapters).toBe(1);
      expect(status?.failedChapters).toBe(1);
    });

    it('should handle non-existent book ID gracefully', () => {
      expect(() => tracker.updateProgress('fake-id', 1, 0)).not.toThrow();
    });
  });

  describe('completeDownload', () => {
    it('should mark download as complete', () => {
      const bookId = tracker.createDownload(mockBookData);

      tracker.completeDownload(bookId, {
        completed: 2,
        failed: 0,
        total: 2,
      });

      const status = tracker.getDownloadStatus(bookId);
      expect(status?.status).toBe('complete');
      expect(status?.completedChapters).toBe(2);
      expect(status?.endTime).toBeTruthy();
    });

    it('should handle partial completion', () => {
      const bookId = tracker.createDownload(mockBookData);

      tracker.completeDownload(bookId, {
        completed: 1,
        failed: 1,
        total: 2,
      });

      const status = tracker.getDownloadStatus(bookId);
      expect(status?.completedChapters).toBe(1);
      expect(status?.failedChapters).toBe(1);
    });
  });

  describe('getDownloadStatus', () => {
    it('should return null for non-existent book ID', () => {
      const status = tracker.getDownloadStatus('fake-id');
      expect(status).toBeNull();
    });

    it('should return download status', () => {
      const bookId = tracker.createDownload(mockBookData);
      const status = tracker.getDownloadStatus(bookId);

      expect(status).toBeTruthy();
      expect(status?.bookId).toBe(bookId);
    });
  });

  describe('removeDownload', () => {
    it('should remove download from tracker', () => {
      const bookId = tracker.createDownload(mockBookData);

      tracker.removeDownload(bookId);

      const status = tracker.getDownloadStatus(bookId);
      expect(status).toBeNull();
    });

    it('should handle non-existent book ID gracefully', () => {
      expect(() => tracker.removeDownload('fake-id')).not.toThrow();
    });
  });
});
