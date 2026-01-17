/**
 * Tests for BookPresenter
 */

import { BookPresenter } from '../../ui/presenters/book-presenter';
import { createMockBookInfo, createBookWithoutMetadata } from '../setup/fixtures/books.fixture';

describe('BookPresenter', () => {
  let presenter: BookPresenter;

  beforeEach(() => {
    presenter = new BookPresenter();
  });

  describe('getTitle', () => {
    it('should return title from metadata when available', () => {
      const book = createMockBookInfo({
        name: 'Folder Name',
        metadataJson: {
          metadata: {
            title: 'Book Title from Metadata',
            authors: ['Author'],
          },
          chapters: [],
        },
      });

      expect(presenter.getTitle(book)).toBe('Book Title from Metadata');
    });

    it('should return folder name when metadata is not available', () => {
      const book = createBookWithoutMetadata();

      expect(presenter.getTitle(book)).toBe(book.name);
    });
  });

  describe('getAuthors', () => {
    it('should return authors from metadata when available', () => {
      const book = createMockBookInfo({
        metadataJson: {
          metadata: {
            title: 'Title',
            authors: ['Author 1', 'Author 2'],
          },
          chapters: [],
        },
      });

      expect(presenter.getAuthors(book)).toEqual(['Author 1', 'Author 2']);
    });

    it('should return "Unknown" when metadata is not available', () => {
      const book = createBookWithoutMetadata();

      expect(presenter.getAuthors(book)).toEqual(['Unknown']);
    });
  });

  describe('getNarrator', () => {
    it('should return narrator from metadata when available', () => {
      const book = createMockBookInfo({
        metadataJson: {
          metadata: {
            title: 'Title',
            authors: ['Author'],
            narrator: 'Test Narrator',
          },
          chapters: [],
        },
      });

      expect(presenter.getNarrator(book)).toBe('Test Narrator');
    });

    it('should return undefined when narrator is not available', () => {
      const book = createBookWithoutMetadata();

      expect(presenter.getNarrator(book)).toBeUndefined();
    });
  });

  describe('getCoverUrl', () => {
    it('should return cover URL from metadata when available', () => {
      const book = createMockBookInfo({
        metadataJson: {
          metadata: {
            title: 'Title',
            authors: ['Author'],
            coverUrl: 'https://example.com/cover.jpg',
          },
          chapters: [],
        },
      });

      expect(presenter.getCoverUrl(book)).toBe('https://example.com/cover.jpg');
    });

    it('should return undefined when cover URL is not available', () => {
      const book = createBookWithoutMetadata();

      expect(presenter.getCoverUrl(book)).toBeUndefined();
    });
  });

  describe('getDisplayName', () => {
    it('should return title with chapter count', () => {
      const book = createMockBookInfo({
        chapterCount: 15,
        metadataJson: {
          metadata: {
            title: 'Great Book',
            authors: ['Author'],
          },
          chapters: [],
        },
      });

      expect(presenter.getDisplayName(book)).toBe('Great Book (15 chapters)');
    });

    it('should use folder name when metadata is not available', () => {
      const book = createBookWithoutMetadata();
      book.chapterCount = 10;

      expect(presenter.getDisplayName(book)).toBe(`${book.name} (10 chapters)`);
    });
  });

  describe('getAuthorsString', () => {
    it('should return authors as comma-separated string', () => {
      const book = createMockBookInfo({
        metadataJson: {
          metadata: {
            title: 'Title',
            authors: ['Author 1', 'Author 2', 'Author 3'],
          },
          chapters: [],
        },
      });

      expect(presenter.getAuthorsString(book)).toBe('Author 1, Author 2, Author 3');
    });

    it('should return "Unknown" for books without metadata', () => {
      const book = createBookWithoutMetadata();

      expect(presenter.getAuthorsString(book)).toBe('Unknown');
    });
  });

  describe('getShortInfo', () => {
    it('should return formatted short info', () => {
      const book = createMockBookInfo({
        metadataJson: {
          metadata: {
            title: 'Great Book',
            authors: ['John Doe', 'Jane Smith'],
          },
          chapters: [],
        },
      });

      expect(presenter.getShortInfo(book)).toBe('Great Book by John Doe, Jane Smith');
    });
  });
});
