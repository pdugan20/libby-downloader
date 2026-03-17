/**
 * Tests for BookSelector
 */

import { BookSelector } from '../../ui/prompts/book-selector';
import { createMockBooks } from '../setup/fixtures/books.fixture';

// Mock @clack/prompts
jest.mock('@clack/prompts', () => ({
  select: jest.fn(),
  isCancel: jest.fn(() => false),
}));

import * as p from '@clack/prompts';

describe('BookSelector', () => {
  let selector: BookSelector;
  const mockSelect = p.select as jest.MockedFunction<typeof p.select>;
  const mockIsCancel = p.isCancel as jest.MockedFunction<typeof p.isCancel>;

  beforeEach(() => {
    selector = new BookSelector();
    jest.clearAllMocks();
    mockIsCancel.mockReturnValue(false);
  });

  describe('selectBook', () => {
    it('should return null if no books match filter', async () => {
      const books = createMockBooks(3);

      const result = await selector.selectBook(books, {
        message: 'Select a book',
        filter: () => false,
      });

      expect(result).toBeNull();
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it('should return null when user selects cancel', async () => {
      const books = createMockBooks(3);
      mockSelect.mockResolvedValue('__CANCEL__');

      const result = await selector.selectBook(books, {
        message: 'Select a book',
      });

      expect(result).toBeNull();
    });

    it('should return null when user presses Ctrl+C', async () => {
      const books = createMockBooks(3);
      mockSelect.mockResolvedValue(Symbol('cancel'));
      mockIsCancel.mockReturnValue(true);

      const result = await selector.selectBook(books, {
        message: 'Select a book',
      });

      expect(result).toBeNull();
    });

    it('should return selected book', async () => {
      const books = createMockBooks(3);
      mockSelect.mockResolvedValue('book_1');

      const result = await selector.selectBook(books, {
        message: 'Select a book',
      });

      expect(result).toEqual(books[1]);
    });

    it('should return all filtered books when ALL is selected', async () => {
      const books = createMockBooks(5);
      mockSelect.mockResolvedValue('__ALL__');

      const result = await selector.selectBook(books, {
        message: 'Select books',
        filter: (b) => !b.isTagged,
        allowAll: true,
      });

      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).every((b) => !b.isTagged)).toBe(true);
    });

    it('should filter books before displaying', async () => {
      const books = createMockBooks(10);
      mockSelect.mockResolvedValue('__CANCEL__');

      await selector.selectBook(books, {
        message: 'Select untagged book',
        filter: (b) => !b.isTagged,
      });

      expect(mockSelect).toHaveBeenCalled();
      const call = mockSelect.mock.calls[0][0] as any;
      const options = call.options;

      // Should have untagged books + cancel option
      const bookOptions = options.filter((o: any) => typeof o.value !== 'string');
      expect(bookOptions.every((o: any) => !o.value.isTagged)).toBe(true);
    });

    it('should show status hints when requested', async () => {
      const books = createMockBooks(3);
      mockSelect.mockResolvedValue('__CANCEL__');

      await selector.selectBook(books, {
        message: 'Select a book',
        showStatus: true,
      });

      const call = mockSelect.mock.calls[0][0] as any;
      const options = call.options;
      const firstBookOption = options[0];

      expect(firstBookOption.hint).toBeDefined();
    });

    it('should include "All" option when allowAll is true', async () => {
      const books = createMockBooks(3);
      mockSelect.mockResolvedValue('__CANCEL__');

      await selector.selectBook(books, {
        message: 'Select books',
        allowAll: true,
        allButtonText: 'Process all books',
      });

      const call = mockSelect.mock.calls[0][0] as any;
      const options = call.options;

      const allOption = options.find((o: any) => o.value === '__ALL__');
      expect(allOption).toBeDefined();
      expect(allOption.label).toContain('Process all books');
    });

    it('should always include cancel option', async () => {
      const books = createMockBooks(3);
      mockSelect.mockResolvedValue('__CANCEL__');

      await selector.selectBook(books, {
        message: 'Select a book',
      });

      const call = mockSelect.mock.calls[0][0] as any;
      const options = call.options;

      const cancelOption = options.find((o: any) => o.value === '__CANCEL__');
      expect(cancelOption).toBeDefined();
    });
  });
});
