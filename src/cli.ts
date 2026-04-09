#!/usr/bin/env node

import { createRequire } from 'module';
import { Command } from 'commander';
import { createElement } from 'react';
import { render } from 'ink';
import { logger, LogLevel } from './utils/logger';
import { App } from './ui/ink/App';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

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
  .version(version)
  .option(
    '--data-dir <path>',
    'Override the downloads directory (default: ~/Downloads/libby-downloads)'
  )
  .action(async (_options, cmd: Command) => {
    const instance = render(
      createElement(App, { command: 'interactive', dataDir: getDataDir(cmd) })
    );
    await instance.waitUntilExit();
  });

// List command
program
  .command('list')
  .description('List all downloaded books')
  .action(async (_options, cmd: Command) => {
    const instance = render(createElement(App, { command: 'list', dataDir: getDataDir(cmd) }));
    await instance.waitUntilExit();
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
  .action(async (folder, options, cmd: Command) => {
    if (!folder) {
      const instance = render(
        createElement(App, { command: 'interactive', dataDir: getDataDir(cmd) })
      );
      await instance.waitUntilExit();
      return;
    }

    const instance = render(
      createElement(App, {
        command: 'tag',
        folder,
        tagOptions: {
          title: options.title,
          author: options.author,
          narrator: options.narrator,
          coverUrl: options.coverUrl,
          description: options.description,
        },
      })
    );
    await instance.waitUntilExit();
  });

// Merge command
program
  .command('merge [folder]')
  .description('Merge MP3 chapters into single M4B audiobook (interactive if no folder specified)')
  .action(async (folder, _options, cmd: Command) => {
    if (!folder) {
      const instance = render(
        createElement(App, { command: 'interactive', dataDir: getDataDir(cmd) })
      );
      await instance.waitUntilExit();
      return;
    }

    const instance = render(createElement(App, { command: 'merge', folder }));
    await instance.waitUntilExit();
  });

// Global options
program.option('-v, --verbose', 'Enable verbose logging').hook('preAction', (thisCommand) => {
  const options = thisCommand.opts();
  if (options.verbose) {
    logger.setLevel(LogLevel.DEBUG);
  }
});

program.parse();
