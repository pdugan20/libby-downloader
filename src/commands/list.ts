/**
 * List command - Show all downloaded books
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { BookService } from '../services/book-service';
import { BookPresenter } from '../ui/presenters/book-presenter';

export async function listBooks(dataDir?: string): Promise<void> {
  const bookService = new BookService(dataDir);
  const bookPresenter = new BookPresenter();
  const downloadsFolder = bookService.getDownloadsFolder();

  const s = p.spinner();
  s.start('Scanning for books...');
  const books = await bookService.discoverBooks();
  s.stop(`Scanned ${chalk.cyan(downloadsFolder)}`);

  if (books.length === 0) {
    p.log.warn('No books found in downloads folder.');
    p.log.message(`Use the Chrome extension to download books to:\n${chalk.cyan(downloadsFolder)}`);
    return;
  }

  p.log.step(`Downloaded Books (${books.length})`);

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const num = chalk.dim(`${i + 1}.`);
    const title = chalk.bold(bookPresenter.getTitle(book));
    const chapters = chalk.dim(`(${book.chapterCount} chapters)`);

    const statusParts = [];
    if (book.hasMetadata) statusParts.push(chalk.dim('metadata'));
    statusParts.push(book.isTagged ? chalk.green('tagged') : chalk.yellow('untagged'));
    statusParts.push(book.isMerged ? chalk.green('merged') : chalk.dim('unmerged'));
    const status = statusParts.join(chalk.dim(' / '));

    const authors = bookPresenter.getAuthors(book);
    const authorLine =
      authors.length > 0 && authors[0] !== 'Unknown' ? chalk.dim(` by ${authors.join(', ')}`) : '';

    const timeAgo = book.downloadedAt
      ? chalk.dim(` - ${bookService.formatTimeAgo(book.downloadedAt)}`)
      : '';

    p.log.message(`${num} ${title} ${chapters}${authorLine}${timeAgo}\n   ${status}`);
  }

  // Summary
  const stats = bookService.getStatistics(books);
  const summaryLines = [
    `Total: ${chalk.cyan(stats.total.toString())}`,
    `Tagged: ${chalk.cyan(`${stats.tagged}/${stats.total}`)}`,
    `Merged: ${chalk.cyan(`${stats.merged}/${stats.total}`)}`,
  ];

  const nextSteps = [];
  if (stats.tagged < stats.total) nextSteps.push(`Tag files: ${chalk.cyan('libby tag')}`);
  if (stats.merged < stats.total) nextSteps.push(`Merge chapters: ${chalk.cyan('libby merge')}`);

  if (nextSteps.length > 0) {
    summaryLines.push('', ...nextSteps);
  }

  p.note(summaryLines.join('\n'), 'Summary');
}
