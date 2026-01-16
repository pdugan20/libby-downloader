#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as os from 'os';
import { BrowserManager } from './browser/manager';
import { LibbyAuth } from './auth/libby-auth';
import { LibbyAPI } from './downloader/libby-api';
import { logger, LogLevel } from './utils/logger';
import { DownloadOrchestrator } from './core/orchestrator';
import { LibbyError, AuthenticationError } from './core/errors';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Handle CLI errors with proper formatting and recovery hints
 */
function handleCliError(error: unknown, context: string): never {
  if (error instanceof LibbyError) {
    console.error(chalk.red(`\n${error.toDisplayString()}\n`));
  } else if (error instanceof Error) {
    logger.error(`${context} failed`, error);
  } else {
    logger.error(`${context} failed: ${String(error)}`);
  }
  process.exit(1);
}

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
      await browserManager.close();
      handleCliError(error, 'Login');
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
        throw new AuthenticationError('Not logged in');
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
      await browserManager.close();
      handleCliError(error, 'List books');
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

    let orchestrator: DownloadOrchestrator | null = null;

    try {
      // Create orchestrator with dependencies
      orchestrator = await DownloadOrchestrator.create(
        mode as 'safe' | 'balanced' | 'aggressive',
        options.headless
      );

      // Download book
      console.log(chalk.bold('\nDownloading chapters...'));
      const result = await orchestrator.downloadBook({
        bookId,
        outputDir: options.output,
        mode: mode as 'safe' | 'balanced' | 'aggressive',
        merge: options.merge,
        metadata: options.metadata,
        headless: options.headless,
        onProgress: (progress) => {
          console.log(
            `Progress: ${progress.downloadedChapters}/${progress.totalChapters} - ${progress.currentChapter || 'Processing'}`
          );
        },
      });

      if (result.success) {
        if (options.merge) {
          logger.success(`\nAudiobook downloaded successfully: ${result.outputPath}`);
        } else {
          logger.success(`\nChapters downloaded successfully to: ${options.output}`);
        }
      } else {
        throw result.error || new Error('Download failed');
      }
    } catch (error) {
      if (orchestrator) {
        await orchestrator.cleanup();
      }
      handleCliError(error, 'Download');
    } finally {
      if (orchestrator) {
        await orchestrator.cleanup();
      }
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
      await browserManager.close();
      handleCliError(error, 'Logout');
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
