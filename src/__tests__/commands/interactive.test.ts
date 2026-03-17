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
jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  select: jest.fn(),
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    message: jest.fn(),
  })),
  log: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    step: jest.fn(),
    message: jest.fn(),
  },
  note: jest.fn(),
  isCancel: jest.fn(() => false),
}));

import * as p from '@clack/prompts';

describe('runInteractive command', () => {
  let mockBookService: jest.Mocked<BookService>;
  const mockSelect = p.select as jest.MockedFunction<typeof p.select>;
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
    expect(mockSelect).not.toHaveBeenCalled();
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

    mockSelect.mockResolvedValue('exit');

    await runInteractive();

    expect(mockBookService.getStatistics).toHaveBeenCalledWith(books);
    expect(mockSelect).toHaveBeenCalled();
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

    mockSelect.mockResolvedValue('exit');

    await runInteractive();

    expect(mockSelect).toHaveBeenCalledTimes(1);
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

    mockSelect.mockResolvedValueOnce('list').mockResolvedValueOnce('exit');

    mockListBooks.mockResolvedValue();

    await runInteractive();

    expect(mockListBooks).toHaveBeenCalled();
    expect(mockSelect).toHaveBeenCalledTimes(2);
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

    // First select: tag action, second select (for book): cancel
    mockSelect.mockResolvedValueOnce('tag').mockResolvedValueOnce('exit');

    await runInteractive();

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

    mockSelect.mockResolvedValueOnce('merge').mockResolvedValueOnce('exit');

    await runInteractive();

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

    mockSelect
      .mockResolvedValueOnce('list')
      .mockResolvedValueOnce('list')
      .mockResolvedValueOnce('exit');

    mockListBooks.mockResolvedValue();

    await runInteractive();

    expect(mockSelect).toHaveBeenCalledTimes(3);
    expect(mockListBooks).toHaveBeenCalledTimes(2);
  });
});
