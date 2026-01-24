/**
 * Integration tests for interactive command
 */

import { runInteractive } from '../../commands/interactive';
import { BookService } from '../../services/book-service';
import { tagFiles } from '../../commands/tag';
import { mergeBook } from '../../commands/merge';
import { listBooks } from '../../commands/list';
import { createMockBooks } from '../setup/fixtures/books.fixture';

// Mock dependencies
jest.mock('../../services/book-service');
jest.mock('../../commands/tag');
jest.mock('../../commands/merge');
jest.mock('../../commands/list');
jest.mock('inquirer', () => ({
  prompt: jest.fn(),
  Separator: class {
    constructor() {}
  },
}));

import inquirer from 'inquirer';

describe('runInteractive command', () => {
  let mockBookService: jest.Mocked<BookService>;
  const mockPrompt = inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>;
  const mockTagFiles = tagFiles as jest.MockedFunction<typeof tagFiles>;
  const mockMergeBook = mergeBook as jest.MockedFunction<typeof mergeBook>;
  const mockListBooks = listBooks as jest.MockedFunction<typeof listBooks>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBookService = new BookService() as jest.Mocked<BookService>;
    (BookService as jest.MockedClass<typeof BookService>).mockImplementation(() => mockBookService);
  });

  it('should exit if no books are found', async () => {
    mockBookService.discoverBooks.mockResolvedValue([]);

    await runInteractive();

    expect(mockBookService.discoverBooks).toHaveBeenCalled();
    expect(mockPrompt).not.toHaveBeenCalled();
  });

  it('should display statistics and main menu', async () => {
    const books = createMockBooks(3);
    mockBookService.discoverBooks.mockResolvedValue(books);
    mockBookService.getStatistics.mockReturnValue({
      total: 3,
      tagged: 2,
      untagged: 1,
      merged: 0,
      unmerged: 3,
      withMetadata: 3,
    });

    // Exit immediately
    mockPrompt.mockResolvedValue({ action: 'Exit' });

    await runInteractive();

    expect(mockBookService.getStatistics).toHaveBeenCalledWith(books);
    expect(mockPrompt).toHaveBeenCalled();
  });

  it('should handle EXIT action', async () => {
    const books = createMockBooks(2);
    mockBookService.discoverBooks.mockResolvedValue(books);
    mockBookService.getStatistics.mockReturnValue({
      total: 2,
      tagged: 1,
      untagged: 1,
      merged: 0,
      unmerged: 2,
      withMetadata: 2,
    });

    mockPrompt.mockResolvedValue({ action: 'Exit' });

    await runInteractive();

    expect(mockPrompt).toHaveBeenCalledTimes(1);
  });

  it('should handle LIST action', async () => {
    const books = createMockBooks(2);
    mockBookService.discoverBooks.mockResolvedValue(books);
    mockBookService.getStatistics.mockReturnValue({
      total: 2,
      tagged: 1,
      untagged: 1,
      merged: 0,
      unmerged: 2,
      withMetadata: 2,
    });

    mockPrompt
      .mockResolvedValueOnce({ action: 'List all downloaded books' })
      .mockResolvedValueOnce({ action: 'Exit' });

    mockListBooks.mockResolvedValue();

    await runInteractive();

    expect(mockListBooks).toHaveBeenCalled();
    expect(mockPrompt).toHaveBeenCalledTimes(2);
  });

  it('should show message when all books are tagged', async () => {
    const books = createMockBooks(3).map((b) => ({ ...b, isTagged: true }));
    mockBookService.discoverBooks.mockResolvedValue(books);
    mockBookService.getStatistics.mockReturnValue({
      total: 3,
      tagged: 3,
      untagged: 0,
      merged: 0,
      unmerged: 3,
      withMetadata: 3,
    });

    mockPrompt
      .mockResolvedValueOnce({ action: 'Tag MP3 files (add metadata)' })
      .mockResolvedValueOnce({ action: 'Exit' });

    await runInteractive();

    // Should not call tagFiles
    expect(mockTagFiles).not.toHaveBeenCalled();
  });

  it('should show message when all books are merged', async () => {
    const books = createMockBooks(3).map((b) => ({ ...b, isMerged: true }));
    mockBookService.discoverBooks.mockResolvedValue(books);
    mockBookService.getStatistics.mockReturnValue({
      total: 3,
      tagged: 2,
      untagged: 1,
      merged: 3,
      unmerged: 0,
      withMetadata: 3,
    });

    mockPrompt
      .mockResolvedValueOnce({ action: 'Merge chapters into single file' })
      .mockResolvedValueOnce({ action: 'Exit' });

    await runInteractive();

    // All books already merged, so merge command should not be called
    expect(mockMergeBook).not.toHaveBeenCalled();
  });

  it('should loop until user exits', async () => {
    const books = createMockBooks(2);
    mockBookService.discoverBooks.mockResolvedValue(books);
    mockBookService.getStatistics.mockReturnValue({
      total: 2,
      tagged: 1,
      untagged: 1,
      merged: 0,
      unmerged: 2,
      withMetadata: 2,
    });

    mockPrompt
      .mockResolvedValueOnce({ action: 'List all downloaded books' })
      .mockResolvedValueOnce({ action: 'List all downloaded books' })
      .mockResolvedValueOnce({ action: 'Exit' });

    mockListBooks.mockResolvedValue();

    await runInteractive();

    expect(mockPrompt).toHaveBeenCalledTimes(3);
    expect(mockListBooks).toHaveBeenCalledTimes(2);
  });
});
