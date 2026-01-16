import {
  validateBookId,
  validateMode,
  validateFilePath,
  validateDownloadInputs,
  sanitizeInput,
} from '../validator';
import { ValidationError, ErrorCode } from '../../core/errors';

describe('validator utilities', () => {
  describe('validateBookId', () => {
    it('should accept valid book IDs', () => {
      expect(() => validateBookId('abc-123')).not.toThrow();
      expect(() => validateBookId('book123')).not.toThrow();
      expect(() => validateBookId('ABC-DEF-123')).not.toThrow();
      expect(() => validateBookId('a1b2c3-d4e5')).not.toThrow();
    });

    it('should reject empty book IDs', () => {
      expect(() => validateBookId('')).toThrow(ValidationError);
      expect(() => validateBookId('   ')).toThrow(ValidationError);
    });

    it('should reject book IDs with invalid characters', () => {
      expect(() => validateBookId('book@123')).toThrow(ValidationError);
      expect(() => validateBookId('book_123')).toThrow(ValidationError);
      expect(() => validateBookId('book 123')).toThrow(ValidationError);
      expect(() => validateBookId('book/123')).toThrow(ValidationError);
      expect(() => validateBookId('../book')).toThrow(ValidationError);
    });

    it('should reject book IDs that are too short', () => {
      expect(() => validateBookId('ab')).toThrow(ValidationError);
      expect(() => validateBookId('a')).toThrow(ValidationError);
    });

    it('should reject book IDs that are too long', () => {
      const longId = 'a'.repeat(101);
      expect(() => validateBookId(longId)).toThrow(ValidationError);
    });

    it('should throw ValidationError with correct error code', () => {
      try {
        validateBookId('invalid@book');
        fail('Expected ValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe(ErrorCode.INVALID_BOOK_ID);
      }
    });
  });

  describe('validateMode', () => {
    it('should accept valid modes', () => {
      expect(() => validateMode('safe')).not.toThrow();
      expect(() => validateMode('balanced')).not.toThrow();
      expect(() => validateMode('aggressive')).not.toThrow();
    });

    it('should reject invalid modes', () => {
      expect(() => validateMode('invalid')).toThrow(ValidationError);
      expect(() => validateMode('fast')).toThrow(ValidationError);
      expect(() => validateMode('SAFE')).toThrow(ValidationError);
      expect(() => validateMode('')).toThrow(ValidationError);
    });

    it('should throw ValidationError with correct error code', () => {
      try {
        validateMode('invalid');
        fail('Expected ValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe(ErrorCode.INVALID_MODE);
      }
    });
  });

  describe('validateFilePath', () => {
    it('should accept valid file paths', () => {
      expect(() => validateFilePath('/home/user/downloads')).not.toThrow();
      expect(() => validateFilePath('/tmp/libby')).not.toThrow();
      expect(() => validateFilePath('relative/path')).not.toThrow();
    });

    it('should reject empty paths', () => {
      expect(() => validateFilePath('')).toThrow(ValidationError);
      expect(() => validateFilePath('   ')).toThrow(ValidationError);
    });

    it('should reject paths with null bytes', () => {
      expect(() => validateFilePath('/path/with\0null')).toThrow(ValidationError);
    });

    it('should reject path traversal attempts', () => {
      expect(() => validateFilePath('/path/../../../etc/passwd')).toThrow(ValidationError);
      expect(() => validateFilePath('../../../etc/passwd')).toThrow(ValidationError);
    });

    it('should use custom label in error messages', () => {
      try {
        validateFilePath('', 'Custom Path');
        fail('Expected ValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Custom Path');
      }
    });
  });

  describe('validateDownloadInputs', () => {
    const validInputs = {
      bookId: 'valid-book-123',
      outputDir: '/tmp/downloads',
      mode: 'balanced',
      merge: true,
      metadata: true,
      headless: false,
    };

    it('should accept valid inputs', () => {
      expect(() => validateDownloadInputs(validInputs)).not.toThrow();
    });

    it('should reject invalid book ID', () => {
      expect(() => validateDownloadInputs({ ...validInputs, bookId: 'invalid@book' })).toThrow(
        ValidationError
      );
    });

    it('should reject invalid mode', () => {
      expect(() => validateDownloadInputs({ ...validInputs, mode: 'invalid' })).toThrow(
        ValidationError
      );
    });

    it('should reject invalid output directory', () => {
      expect(() => validateDownloadInputs({ ...validInputs, outputDir: '' })).toThrow(
        ValidationError
      );
    });

    it('should reject path traversal in output directory', () => {
      expect(() =>
        validateDownloadInputs({ ...validInputs, outputDir: '/path/../../../etc' })
      ).toThrow(ValidationError);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
      expect(sanitizeInput('hello\n')).toBe('hello');
      expect(sanitizeInput('\t hello \t')).toBe('hello');
    });

    it('should return empty string for non-string inputs', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
      expect(sanitizeInput(123 as any)).toBe('');
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });
  });
});
