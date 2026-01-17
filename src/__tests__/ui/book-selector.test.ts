/**
 * Tests for BookSelector
 */

import { BookSelector } from '../../ui/prompts/book-selector';
import { createMockBooks } from '../setup/fixtures/books.fixture';

// Mock inquirer
jest.mock('inquirer', () => {
  const Separator = class {
    constructor(public line?: string) {}
  };

  return {
    prompt: jest.fn(),
    Separator,
  };
});

import inquirer from 'inquirer';

describe('BookSelector', () => {
  let selector: BookSelector;
  const mockPrompt = inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>;

  beforeEach(() => {
    selector = new BookSelector();
    jest.clearAllMocks();
  });

  describe('selectBook', () => {
    it('should return null if no books match filter', async () => {
      const books = createMockBooks(3);

      const result = await selector.selectBook(books, {
        message: 'Select a book',
        filter: () => false,
      });

      expect(result).toBeNull();
      expect(mockPrompt).not.toHaveBeenCalled();
    });

    it('should return null when user selects cancel', async () => {
      const books = createMockBooks(3);
      mockPrompt.mockResolvedValue({ selectedBook: 'CANCEL' });

      const result = await selector.selectBook(books, {
        message: 'Select a book',
      });

      expect(result).toBeNull();
    });

    it('should return selected book', async () => {
      const books = createMockBooks(3);
      mockPrompt.mockResolvedValue({ selectedBook: books[1] });

      const result = await selector.selectBook(books, {
        message: 'Select a book',
      });

      expect(result).toBe(books[1]);
    });

    it('should return all filtered books when ALL is selected', async () => {
      const books = createMockBooks(5);
      mockPrompt.mockResolvedValue({ selectedBook: 'ALL' });

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
      mockPrompt.mockResolvedValue({ selectedBook: 'CANCEL' });

      await selector.selectBook(books, {
        message: 'Select untagged book',
        filter: (b) => !b.isTagged,
      });

      expect(mockPrompt).toHaveBeenCalled();
      const call = mockPrompt.mock.calls[0][0] as any;
      const choices = call[0].choices;

      // Should only show untagged books
      const bookChoices = choices.filter((c: any) => typeof c === 'object' && c.value?.name);
      expect(bookChoices.every((c: any) => !c.value.isTagged)).toBe(true);
    });

    it('should show status indicators when requested', async () => {
      const books = createMockBooks(3);
      mockPrompt.mockResolvedValue({ selectedBook: 'CANCEL' });

      await selector.selectBook(books, {
        message: 'Select a book',
        showStatus: true,
      });

      const call = mockPrompt.mock.calls[0][0] as any;
      const choices = call[0].choices;
      const firstChoice = choices[0];

      // Should include status indicator in name
      expect(firstChoice.name).toMatch(/[✓○]/);
    });

    it('should include "All" option when allowAll is true', async () => {
      const books = createMockBooks(3);
      mockPrompt.mockResolvedValue({ selectedBook: 'CANCEL' });

      await selector.selectBook(books, {
        message: 'Select books',
        allowAll: true,
        allButtonText: 'Process all books',
      });

      const call = mockPrompt.mock.calls[0][0] as any;
      const choices = call[0].choices;

      const allChoice = choices.find((c: any) => c.value === 'ALL');
      expect(allChoice).toBeDefined();
      expect(allChoice.name).toContain('Process all books');
    });

    it('should use custom page size', async () => {
      const books = createMockBooks(20);
      mockPrompt.mockResolvedValue({ selectedBook: 'CANCEL' });

      await selector.selectBook(books, {
        message: 'Select a book',
        pageSize: 20,
      });

      const call = mockPrompt.mock.calls[0][0] as any;
      expect(call[0].pageSize).toBe(20);
    });

    it('should always include cancel option', async () => {
      const books = createMockBooks(3);
      mockPrompt.mockResolvedValue({ selectedBook: 'CANCEL' });

      await selector.selectBook(books, {
        message: 'Select a book',
      });

      const call = mockPrompt.mock.calls[0][0] as any;
      const choices = call[0].choices;

      const cancelChoice = choices.find((c: any) => c.value === 'CANCEL');
      expect(cancelChoice).toBeDefined();
    });
  });

  describe('selectBooks', () => {
    it('should return empty array if no books match filter', async () => {
      const books = createMockBooks(3);

      const result = await selector.selectBooks(books, {
        message: 'Select books',
        filter: () => false,
      });

      expect(result).toEqual([]);
      expect(mockPrompt).not.toHaveBeenCalled();
    });

    it('should return selected books', async () => {
      const books = createMockBooks(5);
      const selected = [books[0], books[2], books[4]];
      mockPrompt.mockResolvedValue({ selectedBooks: selected });

      const result = await selector.selectBooks(books, {
        message: 'Select books',
      });

      expect(result).toEqual(selected);
    });

    it('should filter books before displaying', async () => {
      const books = createMockBooks(10);
      mockPrompt.mockResolvedValue({ selectedBooks: [] });

      await selector.selectBooks(books, {
        message: 'Select tagged books',
        filter: (b) => b.isTagged,
      });

      const call = mockPrompt.mock.calls[0][0] as any;
      const choices = call[0].choices;

      // Should only show tagged books
      expect(choices.every((c: any) => c.value.isTagged)).toBe(true);
    });

    it('should use checkbox type for multi-select', async () => {
      const books = createMockBooks(3);
      mockPrompt.mockResolvedValue({ selectedBooks: [] });

      await selector.selectBooks(books, {
        message: 'Select books',
      });

      const call = mockPrompt.mock.calls[0][0] as any;
      expect(call[0].type).toBe('checkbox');
    });
  });
});
