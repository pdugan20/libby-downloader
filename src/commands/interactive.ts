/**
 * Interactive CLI - Main menu interface
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { discoverBooks, BookInfo } from '../utils/books';
import { tagFiles } from './tag';
import { listBooks } from './list';

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
  console.log(chalk.bold.cyan('\n📚 Libby Downloader\n'));

  // Check for books
  const books = await discoverBooks();

  if (books.length === 0) {
    console.log(chalk.yellow('No books found in downloads folder.'));
    console.log(
      chalk.gray('\nDownload books using the Chrome extension, then run this command again.\n')
    );
    return;
  }

  // Show quick summary
  const taggedCount = books.filter((b) => b.isTagged).length;
  const mergedCount = books.filter((b) => b.isMerged).length;

  console.log(chalk.gray(`Found ${books.length} books`));
  console.log(chalk.gray(`  Tagged: ${taggedCount}/${books.length}`));
  console.log(chalk.gray(`  Merged: ${mergedCount}/${books.length}\n`));

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
        await handleTagAction(books);
        break;

      case MainAction.MERGE:
        await handleMergeAction(books);
        break;

      case MainAction.LIST:
        console.log(); // Blank line
        await listBooks();
        break;

      case MainAction.DETAILS:
        await handleDetailsAction(books);
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
async function handleTagAction(books: BookInfo[]): Promise<void> {
  const untaggedBooks = books.filter((b) => !b.isTagged);

  if (untaggedBooks.length === 0) {
    console.log(chalk.green('\n✓ All books are already tagged!\n'));
    return;
  }

  // Build choices
  const choices: any[] = untaggedBooks.map((book) => ({
    name: `${book.metadataJson?.metadata.title || book.name} (${book.chapterCount} chapters)`,
    value: book,
    short: book.name,
  }));

  choices.push(new inquirer.Separator());
  choices.push({
    name: chalk.cyan(`[Tag all ${untaggedBooks.length} untagged books]`),
    value: 'ALL',
    short: 'All books',
  });
  choices.push({
    name: chalk.gray('[Cancel]'),
    value: 'CANCEL',
    short: 'Cancel',
  });

  const { selectedBook } = await inquirer.prompt<{ selectedBook: BookInfo | string }>([
    {
      type: 'list',
      name: 'selectedBook',
      message: 'Which book do you want to tag?',
      choices,
      pageSize: 15,
    },
  ]);

  if (selectedBook === 'CANCEL') {
    return;
  }

  if (selectedBook === 'ALL') {
    // Tag all untagged books
    console.log(chalk.cyan(`\nTagging ${untaggedBooks.length} books...\n`));

    for (const book of untaggedBooks) {
      console.log(chalk.bold(`\n📖 ${book.metadataJson?.metadata.title || book.name}`));
      await tagFiles(book.path, {});
    }

    console.log(chalk.green(`\n✓ Tagged ${untaggedBooks.length} books successfully!\n`));
  } else {
    // Tag single book
    const book = selectedBook as BookInfo;
    console.log(chalk.bold(`\n📖 ${book.metadataJson?.metadata.title || book.name}\n`));
    await tagFiles(book.path, {});
    console.log();
  }
}

/**
 * Handle merge action - select book to merge
 */
async function handleMergeAction(books: BookInfo[]): Promise<void> {
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

  // Build choices
  const choices: any[] = unmergedBooks.map((book) => {
    const status = book.isTagged ? chalk.green('✓') : chalk.yellow('○');
    return {
      name: `${status} ${book.metadataJson?.metadata.title || book.name} (${book.chapterCount} chapters)`,
      value: book,
      short: book.name,
    };
  });

  choices.push(new inquirer.Separator());
  choices.push({
    name: chalk.gray('[Cancel]'),
    value: 'CANCEL',
    short: 'Cancel',
  });

  const { selectedBook } = await inquirer.prompt<{ selectedBook: BookInfo | string }>([
    {
      type: 'list',
      name: 'selectedBook',
      message: 'Which book do you want to merge?',
      choices,
      pageSize: 15,
    },
  ]);

  if (selectedBook === 'CANCEL') {
    return;
  }

  const book = selectedBook as BookInfo;
  console.log(chalk.bold(`\n📖 ${book.metadataJson?.metadata.title || book.name}\n`));
  console.log(chalk.yellow('Note: Merge functionality coming soon!\n'));

  // TODO: Implement merge
  // await mergeBook(book.path);
}

/**
 * Handle details action - show detailed info about a book
 */
async function handleDetailsAction(books: BookInfo[]): Promise<void> {
  const choices: any[] = books.map((book) => ({
    name: book.metadataJson?.metadata.title || book.name,
    value: book,
    short: book.name,
  }));

  choices.push(new inquirer.Separator());
  choices.push({
    name: chalk.gray('[Cancel]'),
    value: 'CANCEL',
    short: 'Cancel',
  });

  const { selectedBook } = await inquirer.prompt<{ selectedBook: BookInfo | string }>([
    {
      type: 'list',
      name: 'selectedBook',
      message: 'Which book do you want to view?',
      choices,
      pageSize: 15,
    },
  ]);

  if (selectedBook === 'CANCEL') {
    return;
  }

  const book = selectedBook as BookInfo;

  console.log();
  console.log(chalk.bold.cyan('📖 ' + (book.metadataJson?.metadata.title || book.name)));
  console.log();

  if (book.metadataJson?.metadata) {
    const meta = book.metadataJson.metadata;

    if (meta.authors?.length) {
      console.log(chalk.gray('Author:    ') + meta.authors.join(', '));
    }

    if (meta.narrator) {
      console.log(chalk.gray('Narrator:  ') + meta.narrator);
    }

    console.log(chalk.gray('Chapters:  ') + book.chapterCount);

    if (meta.coverUrl) {
      console.log(chalk.gray('Cover:     ') + chalk.blue(meta.coverUrl));
    }
  } else {
    console.log(chalk.gray('Chapters:  ') + book.chapterCount);
  }

  console.log();
  console.log(chalk.gray('Status:'));
  console.log(`  Metadata: ${book.hasMetadata ? chalk.green('✓ Yes') : chalk.yellow('○ No')}`);
  console.log(`  Tagged:   ${book.isTagged ? chalk.green('✓ Yes') : chalk.yellow('○ No')}`);
  console.log(`  Merged:   ${book.isMerged ? chalk.green('✓ Yes') : chalk.yellow('○ No')}`);

  console.log();
  console.log(chalk.gray('Location:  ') + book.path);
  console.log();
}
