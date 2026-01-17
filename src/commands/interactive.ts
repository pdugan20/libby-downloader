/**
 * Interactive CLI - Main menu interface
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { BookInfo } from '../utils/books';
import { tagFiles } from './tag';
import { listBooks } from './list';
import { BookService } from '../services/book-service';
import { BookSelector } from '../ui/prompts/book-selector';
import { BookPresenter } from '../ui/presenters/book-presenter';
import { StatusPresenter } from '../ui/presenters/status-presenter';

enum MainAction {
  TAG = 'Tag MP3 files (add metadata)',
  MERGE = 'Merge chapters into single file',
  LIST = 'List all downloaded books',
  DETAILS = 'View book details',
  EXIT = 'Exit',
}

/**
 * Main interactive menu
 */
export async function runInteractive(): Promise<void> {
  const bookService = new BookService();
  const bookSelector = new BookSelector();
  const bookPresenter = new BookPresenter();
  const statusPresenter = new StatusPresenter();

  console.log(chalk.bold.cyan('\n📚 Libby Downloader\n'));

  // Check for books
  const books = await bookService.discoverBooks();

  if (books.length === 0) {
    console.log(chalk.yellow('No books found in downloads folder.'));
    console.log(
      chalk.gray('\nDownload books using the Chrome extension, then run this command again.\n')
    );
    return;
  }

  // Show quick summary
  const stats = bookService.getStatistics(books);
  console.log(chalk.gray(`Found ${stats.total} books`));
  console.log(chalk.gray(`  Tagged: ${stats.tagged}/${stats.total}`));
  console.log(chalk.gray(`  Merged: ${stats.merged}/${stats.total}\n`));

  // Main menu loop
  let shouldContinue = true;

  while (shouldContinue) {
    const { action } = await inquirer.prompt<{ action: MainAction }>([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          MainAction.TAG,
          MainAction.MERGE,
          MainAction.LIST,
          MainAction.DETAILS,
          new inquirer.Separator(),
          MainAction.EXIT,
        ],
      },
    ]);

    switch (action) {
      case MainAction.TAG:
        await handleTagAction(books, bookSelector, bookPresenter);
        break;

      case MainAction.MERGE:
        await handleMergeAction(books, bookSelector, bookPresenter);
        break;

      case MainAction.LIST:
        console.log(); // Blank line
        await listBooks();
        break;

      case MainAction.DETAILS:
        await handleDetailsAction(books, bookSelector, bookPresenter, statusPresenter);
        break;

      case MainAction.EXIT:
        console.log(chalk.cyan('\n👋 Goodbye!\n'));
        shouldContinue = false;
        break;
    }

    if (shouldContinue) {
      console.log(); // Blank line between actions
    }
  }
}

/**
 * Handle tag action - select book(s) to tag
 */
async function handleTagAction(
  books: BookInfo[],
  bookSelector: BookSelector,
  bookPresenter: BookPresenter
): Promise<void> {
  const selected = await bookSelector.selectBook(books, {
    message: 'Which book do you want to tag?',
    filter: (b) => !b.isTagged,
    allowAll: true,
    allButtonText: `Tag all untagged books`,
  });

  if (!selected) {
    return;
  }

  // Check if all books are tagged
  const untaggedBooks = books.filter((b) => !b.isTagged);
  if (untaggedBooks.length === 0) {
    console.log(chalk.green('\n✓ All books are already tagged!\n'));
    return;
  }

  // Handle "ALL" selection
  if (Array.isArray(selected)) {
    console.log(chalk.cyan(`\nTagging ${selected.length} books...\n`));

    for (const book of selected) {
      console.log(chalk.bold(`\n📖 ${bookPresenter.getTitle(book)}`));
      await tagFiles(book.path, {});
    }

    console.log(chalk.green(`\n✓ Tagged ${selected.length} books successfully!\n`));
  } else {
    // Tag single book
    console.log(chalk.bold(`\n📖 ${bookPresenter.getTitle(selected)}\n`));
    await tagFiles(selected.path, {});
    console.log();
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
    console.log(chalk.green('\n✓ All books are already merged!\n'));
    return;
  }

  // Warn if books aren't tagged
  const untaggedCount = unmergedBooks.filter((b) => !b.isTagged).length;
  if (untaggedCount > 0) {
    console.log(
      chalk.yellow(
        `\n⚠️  ${untaggedCount} book(s) are not tagged yet. Consider running "Tag MP3 files" first for better metadata.\n`
      )
    );
  }

  const selected = await bookSelector.selectBook(books, {
    message: 'Which book do you want to merge?',
    filter: (b) => !b.isMerged,
    showStatus: true,
  });

  if (!selected || Array.isArray(selected)) {
    return;
  }

  console.log(chalk.bold(`\n📖 ${bookPresenter.getTitle(selected)}\n`));
  console.log(chalk.yellow('Note: Merge functionality coming soon!\n'));

  // TODO: Implement merge
  // await mergeBook(selected.path);
}

/**
 * Handle details action - show detailed info about a book
 */
async function handleDetailsAction(
  books: BookInfo[],
  bookSelector: BookSelector,
  bookPresenter: BookPresenter,
  statusPresenter: StatusPresenter
): Promise<void> {
  const selected = await bookSelector.selectBook(books, {
    message: 'Which book do you want to view?',
  });

  if (!selected || Array.isArray(selected)) {
    return;
  }

  console.log();
  console.log(chalk.bold.cyan('📖 ' + bookPresenter.getTitle(selected)));
  console.log();

  // Show metadata if available
  const authors = bookPresenter.getAuthors(selected);
  const narrator = bookPresenter.getNarrator(selected);
  const coverUrl = bookPresenter.getCoverUrl(selected);

  if (authors.length > 0 && authors[0] !== 'Unknown') {
    console.log(chalk.gray('Author:    ') + authors.join(', '));
  }

  if (narrator) {
    console.log(chalk.gray('Narrator:  ') + narrator);
  }

  console.log(chalk.gray('Chapters:  ') + selected.chapterCount);

  if (coverUrl) {
    console.log(chalk.gray('Cover:     ') + chalk.blue(coverUrl));
  }

  // Show status
  console.log();
  console.log(chalk.gray('Status:'));
  console.log(`  Metadata: ${statusPresenter.formatMetadataStatus(selected.hasMetadata)}`);
  console.log(`  Tagged:   ${statusPresenter.formatTaggedStatus(selected.isTagged)}`);
  console.log(`  Merged:   ${statusPresenter.formatMergedStatus(selected.isMerged)}`);

  console.log();
  console.log(chalk.gray('Location:  ') + selected.path);
  console.log();
}
