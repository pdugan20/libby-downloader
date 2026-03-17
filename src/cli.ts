#!/usr/bin/env node

import { Command } from 'commander';
import { logger, LogLevel } from './utils/logger';
import { tagFiles } from './commands/tag';
import { mergeBook } from './commands/merge';
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

/**
 * Get the --data-dir value from the root program options
 */
function getDataDir(cmd: Command): string | undefined {
  return cmd.optsWithGlobals().dataDir;
}

const program = new Command();

program
  .name('libby')
  .description('Manage audiobooks downloaded from Libby (via Chrome extension)')
  .version('1.0.0')
  .option(
    '--data-dir <path>',
    'Override the downloads directory (default: ~/Downloads/libby-downloads)'
  )
  .action(async (_options, cmd: Command) => {
    await runInteractive(getDataDir(cmd));
  });

// List command
program
  .command('list')
  .description('List all downloaded books')
  .action(async (_options, cmd: Command) => {
    try {
      await listBooks(getDataDir(cmd));
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
  .action(async (folder, options, cmd: Command) => {
    try {
      if (!folder) {
        await runInteractive(getDataDir(cmd));
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

// Merge command
program
  .command('merge [folder]')
  .description('Merge MP3 chapters into single M4B audiobook (interactive if no folder specified)')
  .action(async (folder, _options, cmd: Command) => {
    try {
      if (!folder) {
        await runInteractive(getDataDir(cmd));
        return;
      }

      await mergeBook(folder);
    } catch (error) {
      handleCliError(error, 'Merge');
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
