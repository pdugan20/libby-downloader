# Architecture Documentation

Comprehensive architecture documentation for the Libby Downloader Chrome extension.

## Overview

Libby Downloader is a Chrome extension that enables downloading audiobooks from Libby (OverDrive's digital library app). The extension is built with TypeScript, uses Vite for building, and follows a modular architecture with clear separation of concerns.

## Folder Structure

```text
libby-downloader/
├── src/                          # TypeScript source code
│   ├── background/               # Service worker (background script)
│   │   ├── index.ts              # Main service worker entry point
│   │   ├── download-service.ts   # Chapter download orchestration
│   │   ├── download-tracker.ts   # Download state management
│   │   └── metadata-writer.ts    # metadata.json file creation
│   ├── content/                  # Content script (runs on Libby pages)
│   │   ├── index.ts              # Main content script entry point
│   │   ├── constants.ts          # Content-specific constants
│   │   ├── ui-manager.ts         # Button state and notifications
│   │   ├── message-handler.ts    # Message routing and coordination
│   │   └── validators.ts         # Re-exports shared validators
│   ├── iframe/                   # Iframe scripts (run in audiobook player)
│   │   ├── extractor.ts          # Book data extraction (MAIN world)
│   │   └── ui-injector.ts        # Download button injection
│   ├── shared/                   # Shared utilities
│   │   ├── constants.ts          # DEBUG_MODE flag
│   │   ├── logger.ts             # Centralized logging
│   │   ├── validators.ts         # Origin/data validation
│   │   └── icon-loader.ts        # SVG icon loading
│   ├── types/                    # TypeScript type definitions
│   │   ├── extension-book.ts     # BookData, Chapter, BookMetadata
│   │   ├── messages.ts           # Message types and constants
│   │   ├── errors.ts             # Custom error classes
│   │   └── chrome.ts             # Chrome API extensions
│   ├── styles/                   # CSS stylesheets
│   │   └── content.css           # Content script styles
│   ├── assets/                   # Static assets
│   │   └── icons/                # SVG icons
│   └── __tests__/                # Test files
│       ├── mocks/                # Test mocks (Chrome APIs)
│       ├── shared/               # Shared utility tests
│       ├── background/           # Background script tests
│       └── types/                # Type tests
├── chrome-extension/             # Built extension (output)
│   ├── manifest.json             # Extension configuration
│   ├── background/               # Built background script
│   ├── content/                  # Built content script
│   ├── iframe/                   # Built iframe scripts
│   └── styles/                   # Built CSS
├── scripts/                      # Build and validation scripts
└── package.json
```

## Component Responsibilities

### Background Service Worker (`src/background/`)

The service worker runs in the background and handles the heavy lifting of downloading audiobook chapters.

**Main Components:**

- **index.ts**: Main entry point, sets up message listeners, coordinates download operations
- **download-service.ts**: Handles individual chapter downloads using Chrome downloads API, implements rate limiting (500ms delays), waits for download completion
- **download-tracker.ts**: Tracks download state (in-progress, completed chapters, failed chapters)
- **metadata-writer.ts**: Creates and saves metadata.json files alongside MP3s

**Key Responsibilities:**

- Listen for START_DOWNLOAD messages from content script
- Download chapters sequentially with rate limiting
- Send progress updates to content script
- Handle download failures gracefully
- Save metadata.json with book information

### Content Script (`src/content/`)

The content script runs on `libbyapp.com/open/loan/*` pages and coordinates the UI and message flow.

**Main Components:**

- **index.ts**: Initialization, creates UIManager and MessageHandler
- **ui-manager.ts**: Sends progress messages to iframe for UI updates, manages iframe reference
- **message-handler.ts**: Routes messages between iframe, content script, and background, handles button clicks, manages extraction timeout
- **constants.ts**: Button states, timeouts, UI configuration
- **validators.ts**: Re-exports shared validators for backward compatibility

**Key Responsibilities:**

- Listen for button clicks from iframe
- Request book extraction from iframe
- Validate extracted book data
- Start download in background script
- Display progress and status to user
- Handle errors with user-friendly messages

### Iframe Scripts (`src/iframe/`)

Two separate scripts that run in the audiobook player iframe:

**extractor.ts** (MAIN world):

- Runs in page context with access to window.BIF
- Hooks JSON.parse to capture crypto parameters
- Extracts book metadata (title, authors, narrators, cover)
- Builds chapter URLs with crypto params
- Sends extracted data to content script via postMessage

**ui-injector.ts** (ISOLATED world):

- Injects download button into Libby's native UI
- Listens for progress messages from content script
- Creates and updates progress bar below album artwork
- Shows download progress and completion status
- Sends button click events to content script via postMessage

### Shared Utilities (`src/shared/`)

Utilities used across multiple components:

- **logger.ts**: Centralized logging with DEBUG/INFO/WARN/ERROR levels, respects DEBUG_MODE flag, structured logging with context
- **validators.ts**: validateOrigin() - checks Libby domain origins, validateBookData() - validates extracted data structure, sanitizeFilename() - makes filenames filesystem-safe
- **icon-loader.ts**: Loads SVG icons as strings via Vite ?raw imports, type-safe icon names (download, spinner, checkmark, error)
- **constants.ts**: DEBUG_MODE flag (enables UI testing without real downloads)

### Type Definitions (`src/types/`)

Comprehensive TypeScript types:

- **extension-book.ts**: BookData, Chapter, BookMetadata - core data structures
- **messages.ts**: MessageTypes constants, Message payload interfaces, DownloadStatus and Timeouts
- **errors.ts**: Custom error classes (ExtractionError, ValidationError, DownloadError, etc.)
- **chrome.ts**: Chrome API type extensions

## Message Flow

```text
1. User visits Libby audiobook page
   └─> Content script loads
       └─> Waits for button click from iframe

2. Iframe UI script loads
   └─> Injects download button into nav bar
   └─> User clicks button
       └─> postMessage to content script (LIBBY_DOWNLOADER_BUTTON_CLICKED)

3. Content script receives button click
   └─> Finds audiobook iframe
   └─> postMessage to iframe extractor (EXTRACT_LIBBY_BOOK)
   └─> Sets 10-second timeout

4. Iframe extractor (MAIN world)
   └─> Accesses window.BIF object
   └─> Uses captured crypto params
   └─> Builds chapter URLs
   └─> postMessage to content script (EXTRACTION_SUCCESS + BookData)

5. Content script receives extraction
   └─> Validates book data
   └─> chrome.runtime.sendMessage to background (START_DOWNLOAD + BookData)

6. Background service worker
   └─> Downloads chapters sequentially (500ms delay between)
   └─> chrome.tabs.sendMessage for each chapter (DOWNLOAD_PROGRESS)
   └─> Saves metadata.json
   └─> chrome.tabs.sendMessage when done (DOWNLOAD_COMPLETE)

7. Content script receives progress/completion
   └─> Forwards UPDATE_PROGRESS_UI message to iframe via postMessage
   └─> Iframe creates/updates progress bar below album artwork
   └─> Shows "Download complete!" with checkmark when finished
```

## Build System

Built with Vite and custom build script for Chrome extension compatibility:

**Configuration** (`scripts/build-extension.mjs`):

- Multiple entry points built separately (background, content, iframe-extractor, iframe-ui)
- IIFE output format (required for content scripts - ES modules not supported)
- All dependencies inlined into self-contained bundles
- Minification with esbuild
- SVG ?raw imports for icons
- CSS extraction via Vite

**Why IIFE?** Chrome content scripts declared in manifest.json cannot use ES module imports. The custom build script compiles each entry as an IIFE bundle with all dependencies included.

**Build Commands:**

- `npm run build:extension` - Production build
- `npm run dev:extension` - Watch mode for development
- `npm run typecheck` - TypeScript validation
- `npm run extension:validate` - Lint and validate extension

## Debug Mode

Set `DEBUG_MODE = true` in `src/shared/constants.ts` to:

- Enable detailed logging (DEBUG level)
- Simulate downloads without making real requests
- Test UI states without hitting Libby servers
- Generate fake book data for testing

In production, set `DEBUG_MODE = false` for INFO level logging only.

## Error Handling

Custom error classes provide context-specific error information:

- **ExtractionError**: Book extraction failures, includes original cause
- **ValidationError**: Data validation failures, includes invalid data
- **DownloadError**: Chapter download failures, includes chapter index
- **IframeError**: Iframe communication failures, includes origin
- **TimeoutError**: Operation timeouts, includes timeout duration

All errors extend `LibbyDownloaderError` base class with proper prototype chains.

## Testing

Jest-based testing with jsdom environment:

- **Chrome API mocks**: Mock chrome.downloads, chrome.runtime, chrome.tabs
- **Unit tests**: Validators, logger, error classes, icon loader
- **Integration tests**: Download service, download tracker
- **186 total tests**: All passing, ~8.5s execution time

Run tests: `npm test`

## Security Considerations

- Origin validation for all postMessage communications
- Sanitized filenames to prevent path traversal
- Chrome downloads API permission required
- No eval() or unsafe dynamic code execution
- Content Security Policy compliant

## Performance

- Lazy loading with ES modules
- Code splitting via Vite (shared chunks)
- Minified production builds
- 500ms delay between chapter downloads (rate limiting)
- Async/await for non-blocking operations

## Browser Compatibility

- Chrome Manifest V3 (modern Chrome/Edge)
- Service workers (no persistent background pages)
- ES2022 JavaScript features
- Requires Chrome extensions API support
