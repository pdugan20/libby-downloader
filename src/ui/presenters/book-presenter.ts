/**
 * BookPresenter - Centralized book display formatting
 */

import { BookInfo } from '../../utils/books';

export class BookPresenter {
  /**
   * Get the title of a book (prefer metadata, fallback to folder name)
   */
  getTitle(book: BookInfo): string {
    return book.metadataJson?.metadata.title || book.name;
  }

  /**
   * Get the authors of a book
   */
  getAuthors(book: BookInfo): string[] {
    return book.metadataJson?.metadata.authors || ['Unknown'];
  }

  /**
   * Get the narrator of a book
   */
  getNarrator(book: BookInfo): string | undefined {
    return book.metadataJson?.metadata.narrator;
  }

  /**
   * Get the cover URL of a book
   */
  getCoverUrl(book: BookInfo): string | undefined {
    return book.metadataJson?.metadata.coverUrl;
  }

  /**
   * Get display name for book (title + chapter count)
   */
  getDisplayName(book: BookInfo): string {
    const title = this.getTitle(book);
    return `${title} (${book.chapterCount} chapters)`;
  }

  /**
   * Get authors as comma-separated string
   */
  getAuthorsString(book: BookInfo): string {
    return this.getAuthors(book).join(', ');
  }

  /**
   * Get short description for book details
   */
  getShortInfo(book: BookInfo): string {
    const title = this.getTitle(book);
    const authors = this.getAuthorsString(book);
    return `${title} by ${authors}`;
  }
}
