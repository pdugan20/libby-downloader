#!/usr/bin/env node

import { Command } from 'commander';
import { logger, LogLevel } from './utils/logger';
import { tagFiles } from './commands/tag';
import { listBooks } from './commands/list';
import { runInteractive } from './commands/interactive';

/**
 * Handle CLI errors with proper formatting
 */
function handleCliError(error: unknown, context: string): never {
  if (error instanceof Error) {
    logger.error(`${context} failed`, error);
  } else {
    logger.error(`${context} failed: ${String(error)}`);
  }
  process.exit(1);
}

const program = new Command();

program
  .name('libby')
  .description('Manage audiobooks downloaded from Libby (via Chrome extension)')
  .version('1.0.0')
  .action(async () => {
    // If no command specified, run interactive mode
    await runInteractive();
  });

// List command
program
  .command('list')
  .description('List all downloaded books')
  .action(async () => {
    try {
      await listBooks();
    } catch (error) {
      handleCliError(error, 'List');
    }
  });

// Tag command
program
  .command('tag [folder]')
  .description('Embed metadata into MP3 files (interactive if no folder specified)')
  .option('--title <title>', 'Override book title')
  .option('--author <author>', 'Override author name')
  .option('--narrator <narrator>', 'Override narrator name')
  .option('--cover-url <url>', 'Override cover art URL')
  .option('--description <desc>', 'Override description')
  .option('--all', 'Tag all untagged books')
  .action(async (folder, options) => {
    try {
      if (!folder) {
        // Interactive mode
        await runInteractive();
        return;
      }

      await tagFiles(folder, {
        title: options.title,
        author: options.author,
        narrator: options.narrator,
        coverUrl: options.coverUrl,
        description: options.description,
        all: options.all,
      });
    } catch (error) {
      handleCliError(error, 'Tag');
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
