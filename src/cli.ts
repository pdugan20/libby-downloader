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
import { installSignalHandlers, registerCleanupHandler } from './core/cleanup';
import { validateDownloadInputs, sanitizeInput } from './utils/validator';
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

// Install signal handlers for graceful shutdown
installSignalHandlers();

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
    try {
      // Step 1: Check login status in headless mode first (suppress logs)
      logger.info('Checking login status...');

      const originalLevel = logger.getLevel();
      logger.setLevel(LogLevel.ERROR); // Suppress info/debug during headless check

      const checkBrowser = new BrowserManager({ headless: true });
      await checkBrowser.launch();

      const checkAuth = new LibbyAuth(checkBrowser);
      const page = checkBrowser.getPage();
      await page.goto('https://libbyapp.com/interview/welcome#doYouHaveACard', {
        waitUntil: 'networkidle2',
      });

      const isLoggedIn = await checkAuth.hasLocalStorageAuth();
      await checkBrowser.close();

      logger.setLevel(originalLevel); // Restore log level

      if (isLoggedIn) {
        logger.success('Already logged in to Libby');
        return;
      }

      // Step 2: Not logged in - inform user before opening browser
      logger.info('Not logged in');
      logger.info('');
      logger.info('Please complete the following steps in the browser:');
      logger.info('  1. Select your library');
      logger.info('  2. Enter your library card number');
      logger.info('  3. Enter your PIN');
      logger.info('');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      logger.info('Opening browser...');

      // Step 3: Open visible browser for manual login
      const browserManager = new BrowserManager({ headless: options.headless });
      registerCleanupHandler(() => browserManager.close());

      await browserManager.launch();
      const auth = new LibbyAuth(browserManager);
      await auth.loginWithoutCheck(); // Skip the check, go straight to login

      await browserManager.close();
    } catch (error) {
      handleCliError(error, 'Login');
    }
  });

// List books command
program
  .command('list')
  .description('List your borrowed audiobooks')
  .option('--no-headless', 'Run browser in visible mode (for debugging)')
  .action(async (options) => {
    const browserManager = new BrowserManager({ headless: options.headless !== false });
    registerCleanupHandler(() => browserManager.close());

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
  .option('--no-headless', 'Run browser in visible mode (for debugging)')
  .option('--resume', 'Resume interrupted download', false)
  .action(async (bookId, options) => {
    let orchestrator: DownloadOrchestrator | null = null;

    try {
      // Sanitize and validate inputs
      const sanitizedBookId = sanitizeInput(bookId);
      const sanitizedMode = sanitizeInput(options.mode);

      const headless = options.headless !== false;

      validateDownloadInputs({
        bookId: sanitizedBookId,
        outputDir: options.output,
        mode: sanitizedMode,
        merge: options.merge,
        metadata: options.metadata,
        headless,
      });

      // Create orchestrator with dependencies
      orchestrator = await DownloadOrchestrator.create(
        sanitizedMode as 'safe' | 'balanced' | 'aggressive',
        headless
      );

      // Register cleanup handler
      registerCleanupHandler(() => orchestrator?.cleanup());

      // Download book
      console.log(chalk.bold('\nDownloading chapters...'));
      const result = await orchestrator.downloadBook({
        bookId: sanitizedBookId,
        outputDir: options.output,
        mode: sanitizedMode as 'safe' | 'balanced' | 'aggressive',
        merge: options.merge,
        metadata: options.metadata,
        headless,
        resume: options.resume,
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
  .option('--no-headless', 'Run browser in visible mode (for debugging)')
  .action(async (options) => {
    const browserManager = new BrowserManager({ headless: options.headless !== false });
    registerCleanupHandler(() => browserManager.close());

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
