/**
 * BookSelector - Reusable book selection UI component using @clack/prompts
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { BookInfo } from '../../types/book';
import { BookPresenter } from '../presenters/book-presenter';

export interface BookSelectionOptions {
  message: string;
  filter?: (book: BookInfo) => boolean;
  allowAll?: boolean;
  allButtonText?: string;
  showStatus?: boolean;
}

export type BookSelectionResult = BookInfo | BookInfo[] | null;

export class BookSelector {
  private presenter: BookPresenter;

  constructor() {
    this.presenter = new BookPresenter();
  }

  /**
   * Select a single book or all books from a list
   */
  async selectBook(books: BookInfo[], options: BookSelectionOptions): Promise<BookSelectionResult> {
    const filteredBooks = options.filter ? books.filter(options.filter) : books;

    if (filteredBooks.length === 0) {
      return null;
    }

    // Build string-keyed options with a lookup map
    const bookMap = new Map<string, BookInfo>();
    const selectOptions: { value: string; label: string; hint?: string }[] = [];

    filteredBooks.forEach((book, i) => {
      const key = `book_${i}`;
      bookMap.set(key, book);
      const label = this.presenter.getDisplayName(book);

      if (options.showStatus) {
        const status = book.isTagged ? chalk.green('tagged') : chalk.yellow('untagged');
        selectOptions.push({ value: key, label, hint: status });
      } else {
        selectOptions.push({ value: key, label });
      }
    });

    if (options.allowAll) {
      const allText = options.allButtonText || `All ${filteredBooks.length} books`;
      selectOptions.push({ value: '__ALL__', label: allText });
    }

    selectOptions.push({ value: '__CANCEL__', label: chalk.dim('Cancel') });

    const result = await p.select({
      message: options.message,
      options: selectOptions,
    });

    if (p.isCancel(result) || result === '__CANCEL__') {
      return null;
    }

    if (result === '__ALL__') {
      return filteredBooks;
    }

    return bookMap.get(result) || null;
  }
}
