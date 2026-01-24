/**
 * Tests for shared validators
 */

import type { BookData } from '../../types/extension-book';
import { sanitizeFilename, validateBookData, validateOrigin } from '../../shared/validators';

describe('validateOrigin', () => {
  beforeEach(() => {
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://libbyapp.com' },
      writable: true,
    });
  });

  it('should accept current window origin', () => {
    expect(validateOrigin('https://libbyapp.com')).toBe(true);
  });

  it('should accept valid listen.libbyapp.com origin', () => {
    expect(validateOrigin('https://listen.libbyapp.com')).toBe(true);
  });

  it('should accept listen.libbyapp.com with subdomain', () => {
    expect(validateOrigin('https://dewey-abc123.listen.libbyapp.com')).toBe(true);
  });

  it('should accept valid thunder.libbyapp.com origin', () => {
    expect(validateOrigin('https://thunder.libbyapp.com')).toBe(true);
  });

  it('should accept thunder.libbyapp.com with subdomain', () => {
    expect(validateOrigin('https://test-123.thunder.libbyapp.com')).toBe(true);
  });

  it('should reject invalid origins', () => {
    expect(validateOrigin('https://evil.com')).toBe(false);
    expect(validateOrigin('https://libbyapp.com.evil.com')).toBe(false);
    expect(validateOrigin('http://listen.libbyapp.com')).toBe(false); // http not https
  });
});

describe('validateBookData', () => {
  const validBookData: BookData = {
    metadata: {
      title: 'Test Book',
      authors: ['Test Author'],
      narrators: ['Test Narrator'],
      duration: 3600,
      coverUrl: 'https://example.com/cover.jpg',
    },
    chapters: [
      {
        index: 0,
        title: 'Chapter 1',
        url: 'https://example.com/chapter1.mp3',
        duration: 1800,
        startTime: 0,
      },
    ],
  };

  it('should accept valid book data', () => {
    expect(validateBookData(validBookData)).toBe(true);
  });

  it('should reject null or undefined', () => {
    expect(validateBookData(null)).toBe(false);
    expect(validateBookData(undefined)).toBe(false);
  });

  it('should reject non-object data', () => {
    expect(validateBookData('string')).toBe(false);
    expect(validateBookData(123)).toBe(false);
  });

  it('should reject data without metadata', () => {
    expect(validateBookData({ chapters: [] })).toBe(false);
  });

  it('should reject data with invalid metadata', () => {
    expect(validateBookData({ metadata: 'string', chapters: [] })).toBe(false);
  });

  it('should reject metadata without title', () => {
    expect(
      validateBookData({
        metadata: { authors: ['Author'] },
        chapters: [],
      })
    ).toBe(false);
  });

  it('should reject metadata without authors', () => {
    expect(
      validateBookData({
        metadata: { title: 'Book', authors: [] },
        chapters: [],
      })
    ).toBe(false);
  });

  it('should reject data without chapters', () => {
    expect(
      validateBookData({
        metadata: { title: 'Book', authors: ['Author'] },
      })
    ).toBe(false);
  });

  it('should reject data with empty chapters array', () => {
    expect(
      validateBookData({
        metadata: { title: 'Book', authors: ['Author'] },
        chapters: [],
      })
    ).toBe(false);
  });

  it('should reject chapters without required fields', () => {
    expect(
      validateBookData({
        metadata: { title: 'Book', authors: ['Author'] },
        chapters: [{ index: 0 }],
      })
    ).toBe(false);
  });

  it('should accept minimal valid book data', () => {
    const minimalData: BookData = {
      metadata: {
        title: 'Test',
        authors: ['Author'],
      },
      chapters: [
        {
          index: 0,
          title: 'Ch1',
          url: 'http://test.com/1.mp3',
          duration: 100,
        },
      ],
    };
    expect(validateBookData(minimalData)).toBe(true);
  });
});

describe('sanitizeFilename', () => {
  it('should remove invalid characters', () => {
    expect(sanitizeFilename('file/name')).toBe('file-name');
    expect(sanitizeFilename('file\\name')).toBe('file-name');
    expect(sanitizeFilename('file?name')).toBe('file-name');
    expect(sanitizeFilename('file*name')).toBe('file-name');
    expect(sanitizeFilename('file:name')).toBe('file-name');
    expect(sanitizeFilename('file|name')).toBe('file-name');
    expect(sanitizeFilename('file"name')).toBe('file-name');
    expect(sanitizeFilename('file<name>')).toBe('file-name-');
  });

  it('should truncate long filenames', () => {
    const longName = 'a'.repeat(300);
    expect(sanitizeFilename(longName).length).toBe(200);
  });

  it('should handle already valid filenames', () => {
    expect(sanitizeFilename('valid-filename.txt')).toBe('valid-filename.txt');
  });

  it('should handle empty strings', () => {
    expect(sanitizeFilename('')).toBe('');
  });
});
