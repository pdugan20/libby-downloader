# Libby Downloader

[![CI](https://github.com/pdugan20/libby-downloader/actions/workflows/ci.yml/badge.svg)](https://github.com/pdugan20/libby-downloader/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

Download audiobooks from Libby to your computer for offline listening.

## Important Warnings

**READ THIS BEFORE USING:**

- This tool is for **educational purposes only**
- Downloading audiobooks may **violate your library's terms of service**
- **Library cards can be banned** for policy violations
- Use at your own risk and accept full responsibility

**This tool helps you manage borrowed audiobooks, but users must comply with all library policies.**

## Features

- **One-Click Downloads**: Chrome extension downloads chapters directly in browser
- **Zero Bot Detection**: Runs in your real browser session (no automation)
- **Interactive CLI**: Auto-discovers books, shows status, easy tagging
- **Metadata Embedding**: Add title, author, narrator, cover art to MP3 files
- **Smart Auto-Detection**: No need to type file paths or book IDs
- **Progress Tracking**: Real-time download progress in extension button

## Quick Start

### 1. Install Chrome Extension (One-Time Setup)

1. Open Chrome and navigate to: `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select this folder: `libby-downloader/chrome-extension`

### 2. Install CLI Tool (Optional - For Tagging)

The CLI is optional and only needed if you want to add metadata to your MP3 files.

```bash
# Clone the repository
git clone <your-repo-url>
cd libby-downloader

# Install dependencies
npm install

# Build the project
npm run build

# Link globally
npm link
```

### 3. Download Audiobooks

**Download:**

1. Open audiobook in Libby (Chrome)
2. Click "📥 Download Audiobook" button (top-right)
3. Wait for downloads to complete

Files save to: `~/Downloads/libby-downloads/[Book Title]/`

**Tag MP3s (Add Metadata) - Optional:**

```bash
libby
# Select "Tag MP3 files"
# Choose book from list
# Done - metadata embedded!
```

This adds title, author, narrator, cover art, and track numbers to each MP3 file.

## CLI Commands

### Interactive Menu (Recommended)

```bash
libby
# Shows menu:
# - Tag MP3 files (add metadata)
# - List all downloaded books
# - View book details
# - Merge chapters (coming soon)
```

### Tag Command

```bash
# Interactive tagging (shows list of books)
libby tag

# Tag specific folder
libby tag ~/Downloads/libby-downloads/How\ Not\ to\ Die/

# Tag with manual overrides
libby tag ~/path/to/folder/ \
  --title "Book Title" \
  --author "Author Name" \
  --narrator "Narrator" \
  --cover-url "https://..."
```

**What gets embedded:**

- Album: Book title
- Artist: Author(s)
- Performer: Narrator
- Track Number: Chapter number
- Cover Art: Book cover image
- Description: Book description

### List Command

```bash
# Show all downloaded books with status
libby list
```

Shows which books are tagged/untagged, merged/not merged.

## How It Works

**Chrome Extension:**

- Runs in your real browser (zero bot detection)
- Extracts metadata from Libby's internal BIF object
- Captures crypto parameters via JSON.parse hook
- Downloads chapters directly via `chrome.downloads` API
- Sequential downloads with 500ms delays (rate limiting)
- Saves metadata.json alongside MP3 files

**CLI Tool (Optional):**

- Auto-discovers books in `~/Downloads/libby-downloads/`
- Reads metadata.json from book folders
- Embeds ID3 tags into MP3 files (title, author, cover art)
- Shows book status (tagged/untagged, merged/not merged)
- Interactive menus for easy navigation

## Architecture

**CLI Tool** - Clean service layer architecture with separation of concerns:

**Service Layer** (Business Logic):

- `BookService` - Book discovery, analysis, filtering, and statistics
- `MetadataService` - Unified metadata embedding for MP3 files
- `FileService` - File operations abstraction (paths, sanitization)

**UI Layer** (Presentation):

- `BookPresenter` - Formats book data for display (title, authors)
- `StatusPresenter` - Formats status indicators (tagged/untagged)
- `BookSelector` - Reusable book selection prompts with filtering

**Command Layer** (Orchestration):

- Commands use services for business logic
- Commands use presenters for display formatting
- Zero code duplication across commands

**Chrome Extension** - Modern TypeScript architecture built with Vite:

- **Background Service Worker**: Download orchestration, state tracking, metadata writer
- **Content Script**: UI management, message routing, validation
- **Iframe Scripts**: Book data extraction (MAIN world), download button injection (ISOLATED world)
- **Shared Utilities**: Centralized logging, validators, error classes, icon loading
- **Type-Safe**: Full TypeScript with strict typing throughout
- **Security**: Origin validation, sanitized filenames, no unsafe code execution
- **Build System**: Vite with ES modules, code splitting, minification

**Testing**:

- 186 total tests across CLI and extension
- 80%+ CLI test coverage (90%+ for services)
- Jest with jsdom environment for extension tests
- Chrome API mocks for unit testing
- Fast, reliable test execution (~8.5s)

For detailed technical documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Advanced Usage

### Verbose Logging

```bash
libby -v list
libby -v tag
```

### Development Mode

Run without building:

```bash
npm run dev -- list
npm run dev -- tag
```

## Project Structure

```text
libby-downloader/
├── src/                           # TypeScript source code
│   ├── commands/                  # CLI command handlers
│   ├── services/                  # Business logic (BookService, MetadataService)
│   ├── ui/                        # UI components (presenters, prompts)
│   ├── utils/                     # CLI utilities
│   ├── background/                # Extension service worker
│   │   ├── index.ts               # Main orchestrator
│   │   ├── download-service.ts    # Chapter downloads
│   │   ├── download-tracker.ts    # State management
│   │   └── metadata-writer.ts     # metadata.json creation
│   ├── content/                   # Extension content script
│   │   ├── index.ts               # Main entry point
│   │   ├── ui-manager.ts          # Button states & notifications
│   │   ├── message-handler.ts     # Message routing
│   │   └── constants.ts           # Content-specific config
│   ├── iframe/                    # Extension iframe scripts
│   │   ├── extractor.ts           # Book data extraction
│   │   └── ui-injector.ts         # Button injection
│   ├── shared/                    # Shared extension utilities
│   │   ├── logger.ts              # Centralized logging
│   │   ├── validators.ts          # Origin & data validation
│   │   ├── icon-loader.ts         # SVG icon loading
│   │   └── constants.ts           # DEBUG_MODE flag
│   ├── types/                     # TypeScript definitions
│   │   ├── extension-book.ts      # BookData, Chapter types
│   │   ├── messages.ts            # Message types
│   │   └── errors.ts              # Custom error classes
│   ├── styles/                    # Extension CSS
│   ├── assets/icons/              # SVG icons
│   ├── __tests__/                 # Test files
│   ├── cli.ts                     # CLI interface
│   └── index.ts                   # Library exports
├── chrome-extension/              # Built extension (output)
│   ├── manifest.json              # Extension config (MV3)
│   ├── background/                # Built service worker
│   ├── content/                   # Built content script
│   ├── iframe/                    # Built iframe scripts
│   └── styles/                    # Built CSS
├── vite.config.ts                 # Vite build configuration
├── ARCHITECTURE.md                # Extension architecture docs
└── package.json
```

## Troubleshooting

### Extension button doesn't appear

- Make sure you're on an audiobook player page (URL: `/open/loan/...`)
- Not the shelf or book details page
- Refresh the page
- Check extension is enabled at `chrome://extensions/`

### Downloads fail or stop partway

- Chrome will retry automatically
- Check `chrome://downloads/` for details
- You can resume failed downloads manually from Chrome's download manager

### Tagging fails

- Make sure `metadata.json` exists in book folder
- Re-download book if metadata is missing
- Check that MP3 files exist (chapter-001.mp3, etc.)

### "Command not found: libby"

The CLI is optional - only needed for tagging. If you want to install it:

```bash
# Run from project directory:
npm link
```

## Contributing

Improvements and pull requests are welcome, especially for:

- Additional metadata options
- Error handling improvements
- Cross-platform compatibility
- UI/UX enhancements

**Development Guidelines**:

```bash
# CLI Development
npm run dev -- list          # Run CLI without building
npm test                     # Run tests
npm run test:coverage        # View test coverage
npm run check-all            # Full validation (typecheck + lint + format + test)

# Extension Development
npm run build:extension      # Build extension for production
npm run dev:extension        # Watch mode for development
npm run extension:validate   # Validate extension code
npm run typecheck            # TypeScript type checking
```

**Using the Service Layer API**:

```typescript
import { BookService, MetadataService } from 'libby-downloader';

// Discover books
const bookService = new BookService();
const books = await bookService.discoverBooks();

// Tag MP3 files
const metadataService = new MetadataService();
await metadataService.embedToFolder(books[0].path);
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed extension architecture documentation.

## Legal Disclaimer

This tool is provided for **educational purposes only**. Users are responsible for:

- Complying with their library's terms of service
- Respecting copyright and licensing agreements
- Understanding local laws regarding digital content
- Any consequences from using this tool

## License

MIT - See LICENSE.txt

## Acknowledgments

Inspired by the original Libby Downloader TamperMonkey script. This version improves safety by using a Chrome extension that runs in your real browser session instead of browser automation.
