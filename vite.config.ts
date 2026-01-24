import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // Output to chrome-extension directory
    outDir: 'chrome-extension',
    emptyOutDir: false, // Don't delete manifest.json and other static files

    rollupOptions: {
      input: {
        // Background service worker
        background: resolve(__dirname, 'src/background/index.ts'),

        // Content script (runs on main libbyapp.com page)
        content: resolve(__dirname, 'src/content/index.ts'),

        // Iframe extractor (runs in MAIN world)
        'iframe-extractor': resolve(__dirname, 'src/iframe/extractor.ts'),

        // Iframe UI injector
        'iframe-ui': resolve(__dirname, 'src/iframe/ui-injector.ts'),
      },
      output: {
        // Output each entry to its own directory
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name;

          if (name === 'background') {
            return 'background/[name].js';
          }
          if (name === 'content') {
            return 'content/[name].js';
          }
          if (name.startsWith('iframe')) {
            return 'iframe/[name].js';
          }

          return '[name].js';
        },

        // Keep chunk names clean
        chunkFileNames: 'shared/[name].js',
        assetFileNames: 'assets/[name].[ext]',

        // Format as IIFE for content scripts, ESM for service worker
        format: 'iife',
      },
    },

    // Generate source maps for debugging
    sourcemap: process.env.NODE_ENV !== 'production',

    // Minify in production
    minify: process.env.NODE_ENV === 'production',
  },

  // Resolve TypeScript paths
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
