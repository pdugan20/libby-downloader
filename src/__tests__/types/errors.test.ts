/**
 * Tests for custom error types
 */

import {
  DownloadError,
  ExtractionError,
  IframeError,
  LibbyDownloaderError,
  TimeoutError,
  ValidationError,
} from '../../types/errors';

describe('LibbyDownloaderError', () => {
  it('should create error with message', () => {
    const error = new LibbyDownloaderError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('LibbyDownloaderError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(LibbyDownloaderError);
  });

  it('should have correct prototype chain', () => {
    const error = new LibbyDownloaderError('Test');
    expect(Object.getPrototypeOf(error)).toBe(LibbyDownloaderError.prototype);
  });
});

describe('ExtractionError', () => {
  it('should create error without cause', () => {
    const error = new ExtractionError('Extraction failed');
    expect(error.message).toBe('Extraction failed');
    expect(error.name).toBe('ExtractionError');
    expect(error.cause).toBeUndefined();
    expect(error).toBeInstanceOf(LibbyDownloaderError);
  });

  it('should create error with cause', () => {
    const cause = new Error('Original error');
    const error = new ExtractionError('Extraction failed', cause);
    expect(error.cause).toBe(cause);
  });
});

describe('ValidationError', () => {
  it('should create error without invalid data', () => {
    const error = new ValidationError('Validation failed');
    expect(error.message).toBe('Validation failed');
    expect(error.name).toBe('ValidationError');
    expect(error.invalidData).toBeUndefined();
  });

  it('should create error with invalid data', () => {
    const invalidData = { foo: 'bar' };
    const error = new ValidationError('Validation failed', invalidData);
    expect(error.invalidData).toBe(invalidData);
  });
});

describe('DownloadError', () => {
  it('should create error with chapter index', () => {
    const error = new DownloadError('Download failed', 5);
    expect(error.message).toBe('Download failed');
    expect(error.name).toBe('DownloadError');
    expect(error.chapterIndex).toBe(5);
    expect(error.cause).toBeUndefined();
  });

  it('should create error with cause', () => {
    const cause = new Error('Network error');
    const error = new DownloadError('Download failed', 3, cause);
    expect(error.chapterIndex).toBe(3);
    expect(error.cause).toBe(cause);
  });

  it('should create error without chapter index', () => {
    const error = new DownloadError('Download failed');
    expect(error.chapterIndex).toBeUndefined();
  });
});

describe('IframeError', () => {
  it('should create error without origin', () => {
    const error = new IframeError('Iframe error');
    expect(error.message).toBe('Iframe error');
    expect(error.name).toBe('IframeError');
    expect(error.origin).toBeUndefined();
  });

  it('should create error with origin', () => {
    const error = new IframeError('Iframe error', 'https://evil.com');
    expect(error.origin).toBe('https://evil.com');
  });
});

describe('TimeoutError', () => {
  it('should create error without timeout duration', () => {
    const error = new TimeoutError('Timeout');
    expect(error.message).toBe('Timeout');
    expect(error.name).toBe('TimeoutError');
    expect(error.timeoutMs).toBeUndefined();
  });

  it('should create error with timeout duration', () => {
    const error = new TimeoutError('Timeout', 5000);
    expect(error.timeoutMs).toBe(5000);
  });
});
