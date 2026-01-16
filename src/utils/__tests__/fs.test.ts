import { sanitizeFilename, formatBytes } from '../fs';

describe('filesystem utilities', () => {
  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeFilename('file<>:"/\\|?*name')).toBe('filename');
    });

    it('should normalize whitespace', () => {
      expect(sanitizeFilename('file   name')).toBe('file name');
    });

    it('should limit length', () => {
      const longName = 'a'.repeat(300);
      expect(sanitizeFilename(longName).length).toBe(200);
    });

    it('should trim leading and trailing spaces', () => {
      expect(sanitizeFilename('  filename  ')).toBe('filename');
    });

    it('should handle empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('should handle only invalid characters', () => {
      expect(sanitizeFilename('<>:"/\\|?*')).toBe('');
    });

    it('should preserve valid characters', () => {
      expect(sanitizeFilename('My-File_Name.123.mp3')).toBe('My-File_Name.123.mp3');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1572864)).toBe('1.5 MB');
    });

    it('should handle large values', () => {
      expect(formatBytes(5368709120)).toBe('5 GB');
    });

    it('should handle small values', () => {
      expect(formatBytes(512)).toBe('512 Bytes');
      expect(formatBytes(1)).toBe('1 Bytes');
    });
  });
});
