#!/usr/bin/env node

import { Command } from 'commander';
import * as p from '@clack/prompts';
import { logger, LogLevel } from './utils/logger';
import { tagFiles } from './commands/tag';
import { mergeBook } from './commands/merge';
import { listBooks } from './commands/list';
import { runInteractive } from './commands/interactive';

/**
 * Handle CLI errors — clean output for users, stack traces only in verbose mode
 */
function handleCliError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  p.log.error(message);

  if (logger.isDebug() && error instanceof Error && error.stack) {
    p.log.message(error.stack, { symbol: '' });
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
      p.intro('Libby Downloader');
      await listBooks(getDataDir(cmd));
      p.outro('');
    } catch (error) {
      handleCliError(error);
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

      p.intro('Libby Downloader');
      await tagFiles(folder, {
        title: options.title,
        author: options.author,
        narrator: options.narrator,
        coverUrl: options.coverUrl,
        description: options.description,
        all: options.all,
      });
      p.outro('Done!');
    } catch (error) {
      handleCliError(error);
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

      p.intro('Libby Downloader');
      await mergeBook(folder);
      p.outro('Done!');
    } catch (error) {
      handleCliError(error);
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
