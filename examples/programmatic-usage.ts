/**
 * Example: Using Libby Downloader as a Library
 *
 * This file demonstrates how to use libby-downloader programmatically
 * in your own Node.js or TypeScript applications.
 */

import {
  DownloadOrchestrator,
  BrowserManager,
  LibbyAuth,
  LibbyAPI,
  ChapterDownloader,
  logger,
  LogLevel,
} from '../src';

/**
 * Example 1: Simple download using DownloadOrchestrator
 */
async function simpleDownload() {
  // Create orchestrator with default settings (balanced mode, non-headless)
  const orchestrator = await DownloadOrchestrator.create('balanced', false);

  try {
    const result = await orchestrator.downloadBook({
      bookId: 'your-book-id-here',
      outputDir: './downloads',
      mode: 'balanced',
      merge: true,
      metadata: true,
      headless: false,
      onProgress: (progress) => {
        console.log(
          `Progress: ${progress.downloadedChapters}/${progress.totalChapters} - ${progress.currentChapter || 'Processing'}`
        );
      },
    });

    if (result.success) {
      console.log(`Downloaded successfully: ${result.outputPath}`);
      console.log(`Chapters: ${result.chapters.length}`);
      console.log(`Files: ${result.downloadedFiles.join(', ')}`);
    } else {
      console.error(`Download failed: ${result.error?.message}`);
    }
  } finally {
    // Always cleanup
    await orchestrator.cleanup();
  }
}

/**
 * Example 2: Using individual components with event listeners
 */
async function downloadWithEvents() {
  const browserManager = new BrowserManager({ headless: false });
  await browserManager.launch();

  try {
    const auth = new LibbyAuth(browserManager);
    const api = new LibbyAPI(browserManager);

    // Check if logged in
    const isLoggedIn = await auth.isLoggedIn();
    if (!isLoggedIn) {
      console.log('Not logged in. Please run the login flow first.');
      await auth.login();
    }

    // List borrowed books
    const books = await api.getBorrowedBooks();
    console.log(`Found ${books.length} borrowed books`);

    if (books.length === 0) {
      console.log('No books to download');
      return;
    }

    // Open first book
    const book = books[0];
    await api.openBook(book.id);

    // Get book metadata and chapters
    const metadata = await api.getBookMetadata();
    const chapters = await api.getChapters();

    console.log(`Downloading: ${metadata?.title}`);
    console.log(`Chapters: ${chapters.length}`);

    // Create chapter downloader with event listeners
    const downloader = new ChapterDownloader(
      browserManager,
      new (await import('../src/utils/rate-limiter')).RateLimiter('balanced')
    );

    // Listen to events
    downloader.on('chapter:start', (event) => {
      console.log(`Starting chapter ${event.chapterIndex + 1}: ${event.chapterTitle}`);
    });

    downloader.on('chapter:complete', (event) => {
      console.log(
        `Completed chapter ${event.chapterIndex + 1}: ${event.chapterTitle} (${event.fileSize} bytes)`
      );
    });

    downloader.on('chapter:error', (event) => {
      console.error(`Error on chapter ${event.chapterIndex + 1}: ${event.error.message}`);
    });

    downloader.on('break:start', (event) => {
      console.log(`Taking a break: ${event.reason} (${event.durationMs}ms)`);
    });

    downloader.on('break:end', (event) => {
      console.log(`Resuming: ${event.reason}`);
    });

    // Download chapters
    const files = await downloader.downloadChapters(chapters, './downloads', metadata?.title || 'audiobook');

    console.log(`Downloaded ${files.length} files`);
  } finally {
    await browserManager.close();
  }
}

/**
 * Example 3: Resuming an interrupted download
 */
async function resumeDownload() {
  const orchestrator = await DownloadOrchestrator.create('safe', false);

  try {
    const result = await orchestrator.downloadBook({
      bookId: 'your-book-id-here',
      outputDir: './downloads',
      mode: 'safe',
      merge: true,
      metadata: true,
      headless: false,
      resume: true, // Enable resume functionality
      onProgress: (progress) => {
        console.log(`Progress: ${progress.downloadedChapters}/${progress.totalChapters}`);
      },
    });

    if (result.success) {
      console.log('Download completed successfully!');
    }
  } finally {
    await orchestrator.cleanup();
  }
}

/**
 * Example 4: Custom logging
 */
async function customLogging() {
  // Set log level to debug for verbose output
  logger.setLevel(LogLevel.DEBUG);

  const orchestrator = await DownloadOrchestrator.create('balanced', true);

  try {
    // All internal operations will now log debug messages
    await orchestrator.downloadBook({
      bookId: 'your-book-id-here',
      outputDir: './downloads',
      mode: 'balanced',
      merge: true,
      metadata: true,
      headless: true,
    });
  } finally {
    await orchestrator.cleanup();
  }
}

/**
 * Example 5: Error handling
 */
async function errorHandling() {
  const orchestrator = await DownloadOrchestrator.create('balanced', false);

  try {
    const result = await orchestrator.downloadBook({
      bookId: 'invalid-book-id',
      outputDir: './downloads',
      mode: 'balanced',
      merge: true,
      metadata: true,
      headless: false,
    });

    if (!result.success) {
      console.error('Download failed');
      if (result.error) {
        console.error(`Error: ${result.error.message}`);
        console.error(`Stack: ${result.error.stack}`);
      }
    }
  } finally {
    await orchestrator.cleanup();
  }
}

// Run examples
async function main() {
  console.log('Libby Downloader - Programmatic Usage Examples\n');

  // Uncomment the example you want to run:
  // await simpleDownload();
  // await downloadWithEvents();
  // await resumeDownload();
  // await customLogging();
  // await errorHandling();
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Example failed:', error);
    process.exit(1);
  });
}
