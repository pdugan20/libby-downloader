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

        // Content script styles
        'content-styles': resolve(__dirname, 'src/styles/content.css'),
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
          if (name === 'content-styles') {
            return 'styles/[name].js';
          }
          if (name.startsWith('iframe')) {
            return 'iframe/[name].js';
          }

          return '[name].js';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'styles/[name][extname]';
          }
          return 'assets/[name][extname]';
        },

        // Use ES modules format (required for code splitting with multiple inputs)
        format: 'es',

        // Allow code splitting to create shared chunks
        manualChunks: undefined,
      },
      // Preserve module directives to avoid issues
      preserveEntrySignatures: 'strict',
    },

    // Generate source maps for debugging (disabled in production for smaller builds)
    sourcemap: false,

    // Minify for production (reduces bundle size significantly)
    minify: 'esbuild',

    // Target modern browsers (Chrome extensions require modern Chrome anyway)
    target: 'esnext',

    // Additional optimizations
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500, // Warn if chunks exceed 500kb (increased since we're inlining everything)
  },

  // Resolve TypeScript paths
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
