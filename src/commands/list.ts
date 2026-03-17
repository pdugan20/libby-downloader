/**
 * List command - Show all downloaded books
 */

import chalk from 'chalk';
import { logger } from '../utils/logger';
import { BookService } from '../services/book-service';
import { BookPresenter } from '../ui/presenters/book-presenter';

export async function listBooks(dataDir?: string): Promise<void> {
  try {
    const bookService = new BookService(dataDir);
    const bookPresenter = new BookPresenter();

    const downloadsFolder = bookService.getDownloadsFolder();
    logger.info(`Scanning: ${chalk.cyan(downloadsFolder)}\n`);

    const books = await bookService.discoverBooks();

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
      const title = chalk.bold(bookPresenter.getTitle(book));
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
      const authors = bookPresenter.getAuthors(book);
      if (authors.length > 0 && authors[0] !== 'Unknown') {
        console.log(`   ${chalk.gray(`by ${authors.join(', ')}`)}`);
      }

      // Show download time
      if (book.downloadedAt) {
        const timeAgo = bookService.formatTimeAgo(book.downloadedAt);
        console.log(`   ${chalk.gray(`Downloaded ${timeAgo}`)}`);
      }

      console.log(); // Blank line
    });

    // Summary
    const stats = bookService.getStatistics(books);

    console.log(chalk.bold('Summary:'));
    console.log(`  Total books: ${chalk.cyan(stats.total.toString())}`);
    console.log(`  Tagged: ${chalk.cyan(`${stats.tagged}/${stats.total}`)}`);
    console.log(`  Merged: ${chalk.cyan(`${stats.merged}/${stats.total}`)}`);

    // Next steps
    console.log(chalk.bold('\nNext steps:'));
    if (stats.tagged < stats.total) {
      console.log(`  Tag files: ${chalk.cyan('libby tag')}`);
    }
    if (stats.merged < stats.total) {
      console.log(`  Merge chapters: ${chalk.cyan('libby merge')}`);
    }
  } catch (error) {
    logger.error('Failed to list books', error);
    throw error;
  }
}
