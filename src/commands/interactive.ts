/**
 * Interactive CLI - Main menu interface using @clack/prompts
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { BookInfo } from '../types/book';
import { tagFiles } from './tag';
import { listBooks } from './list';
import { BookService } from '../services/book-service';
import { BookSelector } from '../ui/prompts/book-selector';
import { BookPresenter } from '../ui/presenters/book-presenter';

const ACTION_TAG = 'tag';
const ACTION_MERGE = 'merge';
const ACTION_LIST = 'list';
const ACTION_DETAILS = 'details';
const ACTION_EXIT = 'exit';

/**
 * Main interactive menu
 */
export async function runInteractive(dataDir?: string): Promise<void> {
  const bookService = new BookService(dataDir);
  const bookSelector = new BookSelector();
  const bookPresenter = new BookPresenter();

  p.intro('Libby Downloader');

  let shouldContinue = true;

  while (shouldContinue) {
    const books = await bookService.discoverBooks();

    if (books.length === 0) {
      p.log.warn('No books found in downloads folder.');
      p.log.message(
        chalk.dim('Download books using the Chrome extension, then run this command again.')
      );
      break;
    }

    const stats = bookService.getStatistics(books);
    p.log.info(
      `${chalk.cyan(stats.total.toString())} books  /  Tagged: ${stats.tagged}/${stats.total}  /  Merged: ${stats.merged}/${stats.total}`
    );

    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: ACTION_TAG, label: 'Tag MP3 files', hint: 'add metadata' },
        { value: ACTION_MERGE, label: 'Merge chapters', hint: 'create M4B audiobook' },
        { value: ACTION_LIST, label: 'List all books' },
        { value: ACTION_DETAILS, label: 'View book details' },
        { value: ACTION_EXIT, label: chalk.dim('Exit') },
      ],
    });

    if (p.isCancel(action) || action === ACTION_EXIT) {
      shouldContinue = false;
      break;
    }

    switch (action) {
      case ACTION_TAG:
        await handleTagAction(books, bookSelector, bookPresenter);
        break;

      case ACTION_MERGE:
        await handleMergeAction(books, bookSelector, bookPresenter);
        break;

      case ACTION_LIST:
        await listBooks(dataDir);
        break;

      case ACTION_DETAILS:
        await handleDetailsAction(books, bookSelector, bookPresenter);
        break;
    }
  }

  p.outro('Goodbye!');
}

/**
 * Handle tag action - select book(s) to tag
 */
async function handleTagAction(
  books: BookInfo[],
  bookSelector: BookSelector,
  bookPresenter: BookPresenter
): Promise<void> {
  const untaggedBooks = books.filter((b) => !b.isTagged);
  if (untaggedBooks.length === 0) {
    p.log.success('All books are already tagged!');
    return;
  }

  const selected = await bookSelector.selectBook(books, {
    message: 'Which book do you want to tag?',
    filter: (b) => !b.isTagged,
    allowAll: true,
    allButtonText: `Tag all ${untaggedBooks.length} untagged books`,
  });

  if (!selected) return;

  if (Array.isArray(selected)) {
    for (const book of selected) {
      p.log.step(bookPresenter.getTitle(book));
      await tagFiles(book.path, {});
    }
    p.log.success(`Tagged ${selected.length} books`);
  } else {
    p.log.step(bookPresenter.getTitle(selected));
    await tagFiles(selected.path, {});
  }
}

/**
 * Handle merge action - select book to merge
 */
async function handleMergeAction(
  books: BookInfo[],
  bookSelector: BookSelector,
  bookPresenter: BookPresenter
): Promise<void> {
  const unmergedBooks = books.filter((b) => !b.isMerged);

  if (unmergedBooks.length === 0) {
    p.log.success('All books are already merged!');
    return;
  }

  const untaggedCount = unmergedBooks.filter((b) => !b.isTagged).length;
  if (untaggedCount > 0) {
    p.log.warn(
      `${untaggedCount} book(s) are not tagged yet. Consider tagging first for better metadata.`
    );
  }

  const selected = await bookSelector.selectBook(books, {
    message: 'Which book do you want to merge?',
    filter: (b) => !b.isMerged,
    showStatus: true,
  });

  if (!selected || Array.isArray(selected)) return;

  p.log.step(bookPresenter.getTitle(selected));

  const { mergeBook } = await import('./merge');
  await mergeBook(selected.path);
}

/**
 * Handle details action - show detailed info about a book
 */
async function handleDetailsAction(
  books: BookInfo[],
  bookSelector: BookSelector,
  bookPresenter: BookPresenter
): Promise<void> {
  const selected = await bookSelector.selectBook(books, {
    message: 'Which book do you want to view?',
  });

  if (!selected || Array.isArray(selected)) return;

  const authors = bookPresenter.getAuthors(selected);
  const narrator = bookPresenter.getNarrator(selected);
  const coverUrl = bookPresenter.getCoverUrl(selected);

  const lines: string[] = [];

  if (authors.length > 0 && authors[0] !== 'Unknown') {
    lines.push(`Author:    ${authors.join(', ')}`);
  }
  if (narrator) {
    lines.push(`Narrator:  ${narrator}`);
  }
  lines.push(`Chapters:  ${selected.chapterCount}`);
  if (coverUrl) {
    lines.push(`Cover:     ${chalk.blue(coverUrl)}`);
  }

  lines.push('');
  lines.push(`Metadata:  ${selected.hasMetadata ? chalk.green('yes') : chalk.yellow('no')}`);
  lines.push(`Tagged:    ${selected.isTagged ? chalk.green('yes') : chalk.yellow('no')}`);
  lines.push(`Merged:    ${selected.isMerged ? chalk.green('yes') : chalk.yellow('no')}`);

  lines.push('');
  lines.push(chalk.dim(selected.path));

  p.note(lines.join('\n'), bookPresenter.getTitle(selected));
}
