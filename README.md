# Libby Downloader

[![CI](https://github.com/pdugan20/libby-downloader/workflows/CI/badge.svg)](https://github.com/pdugan20/libby-downloader/actions)
[![Release](https://img.shields.io/github/v/release/pdugan20/libby-downloader?logo=github)](https://github.com/pdugan20/libby-downloader/releases)
[![Node.js](https://img.shields.io/badge/node-18%2B-green?logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)

Download audiobooks from Libby to your computer for offline listening.

## Features

- **One-Click Downloads**: Chrome extension downloads audiobooks directly from Libby
- **MP3 Tagging**: CLI adds title, author, narrator, and cover art to downloaded files
- **M4B Audiobooks**: Merge chapters into a single audiobook file with chapter markers

## Setup

```bash
git clone https://github.com/pdugan20/libby-downloader.git
cd libby-downloader
npm install
npm run build:extension
```

Load the extension in Chrome:

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked" and select the `chrome-extension` folder

To use the CLI (optional):

```bash
npm run build && npm link
```

## Usage

### Downloading

Open an audiobook in Libby, then click the download button in the top-right navigation bar. Files save to `~/Downloads/libby-downloads/[Book Title]/`.

### CLI

The CLI provides tagging and merging for downloaded books. Run `libby` for the interactive menu, or use commands directly:

```bash
libby                      # Interactive menu
libby list                 # List all downloaded books
libby tag                  # Tag MP3 files with metadata (interactive)
libby tag ~/path/to/book/  # Tag a specific folder
libby merge                # Merge chapters into M4B audiobook (interactive)
libby merge ~/path/to/book/
```

Options:

- `--data-dir <path>` — Override the downloads directory
- `--title`, `--author`, `--narrator`, `--cover-url` — Override tag metadata
- `--verbose` — Enable debug logging

## Development

```bash
npm run build              # Build CLI and extension
npm run dev -- list        # Run CLI without building
npm run dev:extension      # Watch mode for extension
npm run check-all          # Full validation (typecheck, lint, format, test)
npm test                   # Run unit tests
npm run test:cli           # Run CLI integration tests against fixtures
```

See [docs/architecture.md](docs/architecture.md) for system design and [docs/releasing.md](docs/releasing.md) for the release process.

## Disclaimer

This tool is for educational purposes only. Users are responsible for complying with their library's terms of service and respecting copyright agreements.
