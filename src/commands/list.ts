/**
 * List command - Show all downloaded books
 */

import chalk from 'chalk';
import { logger } from '../utils/logger';
import { discoverBooks, formatTimeAgo, getDownloadsFolder } from '../utils/books';

export async function listBooks(): Promise<void> {
  try {
    const downloadsFolder = getDownloadsFolder();
    logger.info(`Scanning: ${chalk.cyan(downloadsFolder)}\n`);

    const books = await discoverBooks();

    if (books.length === 0) {
      console.log(chalk.yellow('No books found in downloads folder.'));
      console.log(
        `\nUse the Chrome extension to download books to: ${chalk.cyan(downloadsFolder)}`
      );
      return;
    }

    console.log(chalk.bold(`📚 Downloaded Books (${books.length}):\n`));

    books.forEach((book, index) => {
      const num = chalk.cyan(`${index + 1}.`);
      const title = chalk.bold(book.metadataJson?.metadata.title || book.name);
      const chapters = chalk.gray(`(${book.chapterCount} chapters)`);

      console.log(`${num} ${title} ${chapters}`);

      // Status indicators
      const statusParts = [];

      if (book.hasMetadata) {
        statusParts.push(chalk.gray('Has metadata'));
      }

      if (book.isTagged) {
        statusParts.push(chalk.green('✓ Tagged'));
      } else {
        statusParts.push(chalk.yellow('○ Not tagged'));
      }

      if (book.isMerged) {
        statusParts.push(chalk.green('✓ Merged'));
      } else {
        statusParts.push(chalk.gray('○ Not merged'));
      }

      console.log(`   ${statusParts.join(chalk.gray(' • '))}`);

      // Show author if available
      if (book.metadataJson?.metadata.authors) {
        const authors = book.metadataJson.metadata.authors.join(', ');
        console.log(`   ${chalk.gray(`by ${authors}`)}`);
      }

      // Show download time
      if (book.downloadedAt) {
        const timeAgo = formatTimeAgo(book.downloadedAt);
        console.log(`   ${chalk.gray(`Downloaded ${timeAgo}`)}`);
      }

      console.log(); // Blank line
    });

    // Summary
    const taggedCount = books.filter((b) => b.isTagged).length;
    const mergedCount = books.filter((b) => b.isMerged).length;

    console.log(chalk.bold('Summary:'));
    console.log(`  Total books: ${chalk.cyan(books.length.toString())}`);
    console.log(`  Tagged: ${chalk.cyan(`${taggedCount}/${books.length}`)}`);
    console.log(`  Merged: ${chalk.cyan(`${mergedCount}/${books.length}`)}`);

    // Next steps
    console.log(chalk.bold('\nNext steps:'));
    if (taggedCount < books.length) {
      console.log(`  Tag files: ${chalk.cyan('libby tag')}`);
    }
    if (mergedCount < books.length) {
      console.log(`  Merge chapters: ${chalk.cyan('libby merge')}`);
    }
  } catch (error) {
    logger.error('Failed to list books', error);
    throw error;
  }
}
