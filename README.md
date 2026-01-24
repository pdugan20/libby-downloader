# Libby Downloader

[![CI](https://github.com/pdugan20/libby-downloader/actions/workflows/ci.yml/badge.svg)](https://github.com/pdugan20/libby-downloader/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

Download audiobooks from Libby to your computer for offline listening.

## Important Warnings

**READ THIS BEFORE USING:**

- This tool is for **educational purposes only**
- Downloading audiobooks may **violate your library's terms of service**

## Features

- **One-Click Downloads**: Chrome extension downloads chapters directly in browser
- **Zero Bot Detection**: Runs in your real browser session (no automation)
- **Visual Progress Bar**: Real-time download progress shown below album artwork
- **Interactive CLI**: Auto-discovers books, shows status, easy tagging
- **Metadata Embedding**: Add title, author, narrator, cover art to MP3 files
- **Smart Auto-Detection**: No need to type file paths or book IDs

## Quick Start

### 1. Clone and Build

```bash
git clone https://github.com/pdugan20/libby-downloader.git
cd libby-downloader
npm install
npm run build:extension
```

### 2. Install Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this project

### 3. Download Audiobooks

1. Open an audiobook in Libby (Chrome)
2. Click the download button in the top-right navigation bar
3. Watch the progress bar appear below the album artwork
4. Downloads save to `~/Downloads/libby-downloads/[Book Title]/`

### 4. Tag MP3 Files (Optional)

Add metadata (title, author, narrator, cover art) to your MP3 files:

```bash
# Install CLI globally
npm link

# Run interactive menu
libby

# Select "Tag MP3 files" and choose your book
```

## CLI Commands

### Interactive Menu

```bash
libby
```

Options:

- Tag MP3 files (add metadata)
- List all downloaded books
- View book details

### Tag Command

```bash
# Interactive (shows list of books)
libby tag

# Tag specific folder
libby tag ~/Downloads/libby-downloads/BookTitle/

# With manual overrides
libby tag ~/path/to/folder/ --title "Title" --author "Author"
```

Embedded metadata: title, author, narrator, track number, cover art, description

### List Command

```bash
libby list
```

Shows all downloaded books with tagging status.

## How It Works

**Chrome Extension:**

- Runs in your real browser session (no bot detection)
- Extracts book metadata from Libby's page data
- Downloads chapters sequentially with rate limiting
- Shows progress bar below album artwork during downloads
- Saves MP3 files and metadata.json to Downloads folder

**CLI Tool (Optional):**

- Auto-discovers books in `~/Downloads/libby-downloads/`
- Embeds ID3 metadata tags into MP3 files
- Interactive menus for tagging and listing books

## Architecture

Built with TypeScript and Vite:

- **Chrome Extension**: Manifest V3 with background service worker, content scripts, and iframe injectors
- **CLI Tool**: Service-layer architecture with separate business logic, UI presenters, and commands
- **Testing**: 186 tests with 80%+ coverage
- **Type Safety**: Strict TypeScript throughout

For detailed architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Project Structure

```text
libby-downloader/
├── src/                      # TypeScript source
│   ├── commands/            # CLI command handlers
│   ├── services/            # Business logic (BookService, MetadataService)
│   ├── ui/                  # Presenters and prompts
│   ├── background/          # Extension service worker
│   ├── content/             # Extension content script
│   ├── iframe/              # Extension iframe scripts
│   ├── shared/              # Shared utilities
│   └── types/               # TypeScript definitions
├── chrome-extension/        # Built extension output
└── package.json
```

## Troubleshooting

### Extension button doesn't appear

- Must be on audiobook player page (URL contains `/open/loan/`)
- Refresh the page or check extension is enabled at `chrome://extensions/`

### Downloads fail

- Check `chrome://downloads/` for errors
- Chrome will retry automatically

### Tagging fails

- Ensure `metadata.json` exists in book folder
- Re-download if metadata is missing

### "Command not found: libby"

- Run `npm link` from the project directory to install CLI globally

## Development

```bash
# Build and test
npm run build:extension      # Build extension
npm run check-all            # Run all checks (typecheck, lint, format, test)
npm test                     # Run tests

# Development
npm run dev -- list          # Run CLI without building
npm run dev:extension        # Watch mode for extension
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation.

## Contributing

Pull requests welcome! Areas of interest:

- Error handling improvements
- Cross-platform compatibility
- UI/UX enhancements

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
