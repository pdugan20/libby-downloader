/**
 * Integration tests for list command
 */

import { listBooks } from '../../commands/list';
import { BookService } from '../../services/book-service';
import { createMockBooks } from '../setup/fixtures/books.fixture';

// Mock the BookService
jest.mock('../../services/book-service');

describe('listBooks command', () => {
  let mockBookService: jest.Mocked<BookService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBookService = new BookService() as jest.Mocked<BookService>;
    (BookService as jest.MockedClass<typeof BookService>).mockImplementation(() => mockBookService);
  });

  it('should display message when no books are found', async () => {
    mockBookService.getDownloadsFolder.mockReturnValue('/test/downloads');
    mockBookService.discoverBooks.mockResolvedValue([]);

    await listBooks();

    expect(mockBookService.discoverBooks).toHaveBeenCalled();
  });

  it('should list all discovered books', async () => {
    const books = createMockBooks(3);
    mockBookService.getDownloadsFolder.mockReturnValue('/test/downloads');
    mockBookService.discoverBooks.mockResolvedValue(books);
    mockBookService.getStatistics.mockReturnValue({
      total: 3,
      tagged: 2,
      untagged: 1,
      merged: 1,
      unmerged: 2,
      withMetadata: 3,
    });
    mockBookService.formatTimeAgo.mockReturnValue('2 days ago');

    await listBooks();

    expect(mockBookService.discoverBooks).toHaveBeenCalled();
    expect(mockBookService.getStatistics).toHaveBeenCalledWith(books);
    expect(mockBookService.formatTimeAgo).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockBookService.getDownloadsFolder.mockReturnValue('/test/downloads');
    mockBookService.discoverBooks.mockRejectedValue(new Error('Disk error'));

    await expect(listBooks()).rejects.toThrow('Disk error');
  });

  it('should call getStatistics for summary', async () => {
    const books = createMockBooks(5);
    mockBookService.getDownloadsFolder.mockReturnValue('/test/downloads');
    mockBookService.discoverBooks.mockResolvedValue(books);
    mockBookService.getStatistics.mockReturnValue({
      total: 5,
      tagged: 3,
      untagged: 2,
      merged: 2,
      unmerged: 3,
      withMetadata: 5,
    });
    mockBookService.formatTimeAgo.mockReturnValue('1 hour ago');

    await listBooks();

    expect(mockBookService.getStatistics).toHaveBeenCalledWith(books);
  });
});
