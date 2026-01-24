#!/usr/bin/env node

/**
 * Custom build script for Chrome extension
 * Builds each entry point separately with all dependencies inlined
 */

import { build } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

const entries = [
  {
    name: 'LibbyBackground',
    entry: resolve(root, 'src/background/index.ts'),
    outFile: 'background/background.js',
  },
  {
    name: 'LibbyContent',
    entry: resolve(root, 'src/content/index.ts'),
    outFile: 'content/content.js',
  },
  {
    name: 'LibbyExtractor',
    entry: resolve(root, 'src/iframe/extractor.ts'),
    outFile: 'iframe/iframe-extractor.js',
  },
  {
    name: 'LibbyUI',
    entry: resolve(root, 'src/iframe/ui-injector.ts'),
    outFile: 'iframe/iframe-ui.js',
  },
];

async function buildEntry({ name, entry, outFile }) {
  console.log(`Building ${name}...`);

  await build({
    configFile: false,
    build: {
      lib: {
        entry,
        name,
        fileName: () => outFile.split('/').pop(),
        formats: ['iife'],
      },
      outDir: resolve(root, 'chrome-extension', outFile.split('/')[0]),
      emptyOutDir: false,
      minify: 'esbuild',
      target: 'esnext',
      sourcemap: false,
    },
    resolve: {
      alias: {
        '@': resolve(root, 'src'),
      },
    },
  });
}

async function buildStyles() {
  console.log('Building styles...');

  await build({
    configFile: false,
    build: {
      rollupOptions: {
        input: {
          'content-styles': resolve(root, 'src/styles/content.css'),
        },
        output: {
          assetFileNames: 'content-styles[extname]',
        },
      },
      outDir: resolve(root, 'chrome-extension/styles'),
      emptyOutDir: false,
    },
  });
}

async function main() {
  try {
    // Build all entries
    for (const entry of entries) {
      await buildEntry(entry);
    }

    // Build styles
    await buildStyles();

    console.log('\n✓ Extension built successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

main();
