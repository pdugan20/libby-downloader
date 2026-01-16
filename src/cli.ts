#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as os from 'os';
import { BrowserManager } from './browser/manager';
import { LibbyAuth } from './auth/libby-auth';
import { LibbyAPI } from './downloader/libby-api';
import { ChapterDownloader } from './downloader/chapter-downloader';
import { FFmpegProcessor } from './processor/ffmpeg-processor';
import { MetadataEmbedder } from './metadata/embedder';
import { RateLimiter } from './utils/rate-limiter';
import { logger, LogLevel } from './utils/logger';
import { ensureDir, sanitizeFilename } from './utils/fs';
import chalk from 'chalk';
import ora from 'ora';

const program = new Command();

program
  .name('libby')
  .description('Download audiobooks from Libby with realistic user simulation')
  .version('1.0.0');

// Login command
program
  .command('login')
  .description('Log in to your Libby account')
  .option('--headless', 'Run browser in headless mode', false)
  .action(async (options) => {
    const browserManager = new BrowserManager({ headless: options.headless });

    try {
      await browserManager.launch();
      const auth = new LibbyAuth(browserManager);

      const isLoggedIn = await auth.isLoggedIn();

      if (isLoggedIn) {
        logger.success('Already logged in to Libby');
      } else {
        await auth.login();
      }
    } catch (error) {
      logger.error('Login failed', error);
      process.exit(1);
    } finally {
      await browserManager.close();
    }
  });

// List books command
program
  .command('list')
  .description('List your borrowed audiobooks')
  .option('--headless', 'Run browser in headless mode', false)
  .action(async (options) => {
    const browserManager = new BrowserManager({ headless: options.headless });

    try {
      await browserManager.launch();
      const auth = new LibbyAuth(browserManager);
      const api = new LibbyAPI(browserManager);

      const isLoggedIn = await auth.isLoggedIn();
      if (!isLoggedIn) {
        logger.error('Not logged in. Please run: libby login');
        process.exit(1);
      }

      const spinner = ora('Fetching borrowed books').start();
      const books = await api.getBorrowedBooks();
      spinner.stop();

      if (books.length === 0) {
        logger.info('No borrowed audiobooks found');
        return;
      }

      console.log(chalk.bold('\nYour Borrowed Audiobooks:\n'));
      books.forEach((book, index) => {
        console.log(
          `${chalk.cyan(`${index + 1}.`)} ${chalk.bold(book.title)} ${chalk.gray(`(${book.id})`)}`
        );
        if (book.authors.length > 0) {
          console.log(chalk.gray(`   by ${book.authors.join(', ')}`));
        }
      });
      console.log();
    } catch (error) {
      logger.error('Failed to list books', error);
      process.exit(1);
    } finally {
      await browserManager.close();
    }
  });

// Download command
program
  .command('download <book-id>')
  .description('Download an audiobook by ID')
  .option('-o, --output <dir>', 'Output directory', path.join(os.homedir(), 'Downloads', 'Libby'))
  .option('--mode <mode>', 'Download mode: safe, balanced, or aggressive', 'balanced')
  .option('--no-merge', 'Do not merge chapters into single file')
  .option('--no-metadata', 'Do not embed metadata')
  .option('--headless', 'Run browser in headless mode', false)
  .action(async (bookId, options) => {
    const mode = ['safe', 'balanced', 'aggressive'].includes(options.mode)
      ? options.mode
      : 'balanced';

    const browserManager = new BrowserManager({ headless: options.headless });
    const rateLimiter = new RateLimiter(mode as 'safe' | 'balanced' | 'aggressive');

    try {
      // Show risk warning
      rateLimiter.showRiskWarning();

      await browserManager.launch();
      const auth = new LibbyAuth(browserManager);
      const api = new LibbyAPI(browserManager);
      const downloader = new ChapterDownloader(browserManager, rateLimiter);
      const processor = new FFmpegProcessor();
      const embedder = new MetadataEmbedder();

      // Check login
      const isLoggedIn = await auth.isLoggedIn();
      if (!isLoggedIn) {
        logger.error('Not logged in. Please run: libby login');
        process.exit(1);
      }

      // Check FFmpeg
      if (options.merge) {
        const hasFFmpeg = await processor.checkFFmpeg();
        if (!hasFFmpeg) {
          logger.error('FFmpeg is required for merging chapters. Please install FFmpeg.');
          process.exit(1);
        }
      }

      // Open book and get metadata
      let spinner = ora('Opening book').start();
      await api.openBook(bookId);
      spinner.succeed('Book opened');

      spinner = ora('Extracting metadata').start();
      const bookMetadata = await api.getBookMetadata();
      if (!bookMetadata) {
        spinner.fail('Failed to extract book metadata');
        process.exit(1);
      }
      spinner.succeed(`Found: ${bookMetadata.title}`);

      spinner = ora('Extracting chapters').start();
      const chapters = await api.getChapters();
      if (chapters.length === 0) {
        spinner.fail('No chapters found');
        process.exit(1);
      }
      spinner.succeed(`Found ${chapters.length} chapters`);

      // Download cover
      let coverPath: string | undefined;
      if (bookMetadata.coverUrl) {
        spinner = ora('Downloading cover art').start();
        const coverBuffer = await api.downloadCover(bookMetadata.coverUrl);
        if (coverBuffer) {
          const outputDir = path.join(options.output, sanitizeFilename(bookMetadata.title));
          await ensureDir(outputDir);
          coverPath = path.join(outputDir, 'cover.jpg');
          const fs = await import('fs/promises');
          await fs.writeFile(coverPath, coverBuffer);
          spinner.succeed('Cover art downloaded');
        } else {
          spinner.fail('Failed to download cover art');
        }
      }

      // Download chapters
      console.log(chalk.bold('\nDownloading chapters...'));
      const downloadedFiles = await downloader.downloadChapters(
        chapters,
        options.output,
        bookMetadata.title,
        (progress) => {
          console.log(
            `Progress: ${progress.downloadedChapters}/${progress.totalChapters} - ${progress.currentChapter || 'Processing'}`
          );
        }
      );

      // Merge chapters if requested
      if (options.merge && downloadedFiles.length > 1) {
        const outputDir = path.join(options.output, sanitizeFilename(bookMetadata.title));
        const mergedPath = path.join(outputDir, `${sanitizeFilename(bookMetadata.title)}.mp3`);

        spinner = ora('Merging chapters').start();
        await processor.mergeChapters(downloadedFiles, mergedPath, {
          title: bookMetadata.title,
          artist: bookMetadata.authors.join(', '),
          album: bookMetadata.title,
          genre: 'Audiobook',
        });
        spinner.succeed('Chapters merged');

        // Add chapter markers
        if (chapters.length > 1) {
          const tempPath = mergedPath + '.temp.mp3';
          spinner = ora('Adding chapter markers').start();
          await processor.addChapterMarkers(mergedPath, tempPath, chapters);
          const fs = await import('fs/promises');
          await fs.unlink(mergedPath);
          await fs.rename(tempPath, mergedPath);
          spinner.succeed('Chapter markers added');
        }

        // Embed metadata
        if (options.metadata && coverPath) {
          spinner = ora('Embedding metadata').start();
          await embedder.embedMetadata(mergedPath, {
            title: bookMetadata.title,
            artist: bookMetadata.authors.join(', '),
            album: bookMetadata.title,
            genre: 'Audiobook',
            comment: bookMetadata.description,
            image: coverPath,
          });
          spinner.succeed('Metadata embedded');
        }

        logger.success(`\nAudiobook downloaded successfully: ${mergedPath}`);
      } else {
        logger.success(`\nChapters downloaded successfully to: ${options.output}`);
      }

      rateLimiter.incrementBookCounter();
    } catch (error) {
      logger.error('Download failed', error);
      process.exit(1);
    } finally {
      await browserManager.close();
    }
  });

// Logout command
program
  .command('logout')
  .description('Log out from Libby')
  .option('--headless', 'Run browser in headless mode', false)
  .action(async (options) => {
    const browserManager = new BrowserManager({ headless: options.headless });

    try {
      await browserManager.launch();
      const auth = new LibbyAuth(browserManager);
      await auth.logout();
      logger.success('Logged out successfully');
    } catch (error) {
      logger.error('Logout failed', error);
      process.exit(1);
    } finally {
      await browserManager.close();
    }
  });

// Global options
program.option('-v, --verbose', 'Enable verbose logging').hook('preAction', (thisCommand) => {
  const options = thisCommand.opts();
  if (options.verbose) {
    logger.setLevel(LogLevel.DEBUG);
  }
});

program.parse();
