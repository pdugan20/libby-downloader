# Architecture

Chrome extension (Manifest V3) that downloads audiobooks from Libby, with an optional CLI for tagging and merging.

The local stdio MCP server (`src/mcp.ts`, `src/mcp/`) exposes the same workflow to
agents. It opens loans through the CLI's Chrome bridge, waits for complete files,
and calls the existing metadata and merge services without importing Ink. Long
operations return an in-memory job ID and are polled through `get_job`. The server
serializes its mutation jobs and limits book selections to its configured download
directory. See [mcp.md](mcp.md) for tools and process lifecycle.

## Component Responsibilities

### Background Service Worker (`src/background/`)

Handles chapter downloads in the background.

- **index.ts**: Entry point, message listeners, coordinates download operations
- **download-service.ts**: Chapter downloads via Chrome downloads API, rate limiting (500ms delays)
- **download-tracker.ts**: Tracks download state (in-progress, completed, failed)
- **metadata-writer.ts**: Creates metadata.json alongside MP3s

### Content Script (`src/content/`)

Runs on `libbyapp.com/open/loan/*` pages, coordinates UI and message flow.

- **index.ts**: Initialization, creates UIManager and MessageHandler
- **ui-manager.ts**: Sends progress messages to iframe for UI updates
- **message-handler.ts**: Routes messages between iframe, content script, and background
- **constants.ts**: Button states, timeouts, UI configuration

### Iframe Scripts (`src/iframe/`)

Two scripts running in the audiobook player iframe:

**extractor.ts** (MAIN world):

- Accesses window.BIF object for book metadata
- Collects each part's signed URL by quietly seeking the paused player into the part and
  reading the request it makes (`chapter-urls.ts` holds the testable logic)
- Reports collection progress and sends book data to the content script via postMessage

**ui-injector.ts** (ISOLATED world):

- Injects download button into Libby's native UI
- Creates and updates progress bar below album artwork
- Sends button click events to content script via postMessage

### Shared Utilities (`src/shared/`)

- **logger.ts**: Logging with DEBUG/INFO/WARN/ERROR levels, respects DEBUG_MODE
- **validators.ts**: Origin validation, book data validation, filename sanitization
- **icon-loader.ts**: SVG icons via Vite ?raw imports
- **constants.ts**: DEBUG_MODE flag

### Type Definitions (`src/types/`)

- **extension-book.ts**: BookData, Chapter, BookMetadata
- **messages.ts**: MessageTypes constants, Message payload interfaces
- **errors.ts**: Custom error classes (ExtractionError, ValidationError, DownloadError, IframeError, TimeoutError) extending LibbyDownloaderError base class
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
   └─> Sets a 20-second timeout that restarts on each progress message

4. Iframe extractor (MAIN world)
   └─> Accesses window.BIF object
   └─> Seeks the player through each part and records its signed URL
   └─> postMessage to content script for each part (EXTRACTION_PROGRESS)
   └─> Restores the player position
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

### Starting from the CLI

`libby download <loan-url>` opens the loan in Chrome with `#libby-downloader-autostart`.
The content script runs at `document_start`, removes the marker before Libby's app reads
the address, and waits for the iframe's `LIBBY_DOWNLOADER_READY` message, which follows
the button injection. It then starts the flow above as if the button had been clicked.
The CLI snapshots existing file versions before opening Chrome, then watches
`~/Downloads/libby-downloads` for that book's new chapters and completion metadata.
The background worker writes `metadata.json` after the last chapter. By default,
preparation can take 15 minutes before files appear; once downloading starts, the
CLI stops after three minutes without file activity, with a one-hour total limit.
Closing the CLI cancels polling; Chrome downloads can continue.

## Security

- Origin validation for all postMessage communications
- Sanitized filenames to prevent path traversal
- No eval() or unsafe dynamic code execution
- Content Security Policy compliant
