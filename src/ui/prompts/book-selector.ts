/**
 * BookSelector - Reusable book selection UI component
 * Eliminates 120+ lines of duplication in interactive.ts
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { BookInfo } from '../../utils/books';
import { BookPresenter } from '../presenters/book-presenter';

export interface BookSelectionOptions {
  message: string;
  filter?: (book: BookInfo) => boolean;
  allowAll?: boolean;
  allButtonText?: string;
  showStatus?: boolean;
  pageSize?: number;
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
    // Apply filter if provided
    const filteredBooks = options.filter ? books.filter(options.filter) : books;

    if (filteredBooks.length === 0) {
      return null;
    }

    // Build choices
    const choices: any[] = filteredBooks.map((book) => {
      let name = this.presenter.getDisplayName(book);

      // Add status indicator if requested
      if (options.showStatus) {
        const status = book.isTagged ? chalk.green('✓') : chalk.yellow('○');
        name = `${status} ${name}`;
      }

      return {
        name,
        value: book,
        short: book.name,
      };
    });

    // Add "All" option if requested
    if (options.allowAll) {
      choices.push(new inquirer.Separator());
      const allText = options.allButtonText || `Tag all ${filteredBooks.length} books`;
      choices.push({
        name: chalk.cyan(`[${allText}]`),
        value: 'ALL',
        short: 'All books',
      });
    }

    // Add cancel option
    choices.push({
      name: chalk.gray('[Cancel]'),
      value: 'CANCEL',
      short: 'Cancel',
    });

    // Prompt for selection
    const { selectedBook } = await inquirer.prompt<{ selectedBook: BookInfo | string }>([
      {
        type: 'list',
        name: 'selectedBook',
        message: options.message,
        choices,
        pageSize: options.pageSize || 15,
      },
    ]);

    // Handle special values
    if (selectedBook === 'CANCEL') {
      return null;
    }

    if (selectedBook === 'ALL') {
      return filteredBooks;
    }

    return selectedBook as BookInfo;
  }

  /**
   * Select multiple books from a list (checkbox)
   */
  async selectBooks(
    books: BookInfo[],
    options: Omit<BookSelectionOptions, 'allowAll' | 'allButtonText'>
  ): Promise<BookInfo[]> {
    // Apply filter if provided
    const filteredBooks = options.filter ? books.filter(options.filter) : books;

    if (filteredBooks.length === 0) {
      return [];
    }

    // Build choices
    const choices = filteredBooks.map((book) => {
      let name = this.presenter.getDisplayName(book);

      // Add status indicator if requested
      if (options.showStatus) {
        const status = book.isTagged ? chalk.green('✓') : chalk.yellow('○');
        name = `${status} ${name}`;
      }

      return {
        name,
        value: book,
        short: book.name,
      };
    });

    // Prompt for selection
    const { selectedBooks } = await inquirer.prompt<{ selectedBooks: BookInfo[] }>([
      {
        type: 'checkbox',
        name: 'selectedBooks',
        message: options.message,
        choices,
        pageSize: options.pageSize || 15,
      },
    ]);

    return selectedBooks;
  }
}
