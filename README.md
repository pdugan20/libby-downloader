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

- **One-Click Downloads**: Download audiobooks with a single click from your browser
- **Interactive CLI**: Optionally add book title, author, narrator, and cover art to MP3 files

## Quick Start

### Extension Only (Download Audiobooks)

```bash
git clone https://github.com/pdugan20/libby-downloader.git
cd libby-downloader
npm install
npm run build:extension
```

Then load the extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this project

Download audiobooks:

1. Open an audiobook in Libby using Chrome
2. Click the download button in the top-right navigation bar
3. Downloads save to `~/Downloads/libby-downloads/[Book Title]/`

### Extension + CLI (Add Metadata to MP3s)

If you also want to tag your MP3 files with metadata:

```bash
# Build CLI (in addition to extension)
npm run build

# Install CLI globally
npm link

# Run interactive menu
libby

# Select "Tag MP3 files" and choose your book
```

## CLI Commands

CLI requires installation via `npm run build && npm link` (see above).

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

## Architecture

Built with TypeScript and Vite:

- **Chrome Extension**: Manifest V3 with background service worker, content scripts, and iframe injectors
- **CLI Tool**: Service-layer architecture with separate business logic, UI presenters, and commands
- **Type Safety**: Strict TypeScript throughout

For detailed architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Project Structure

```text
libby-downloader/
├── src/                     # TypeScript source
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

CLI requires building before linking:

```bash
npm run build    # Builds CLI to dist/cli.js
npm link         # Creates global symlink
```

## Development

```bash
# Build
npm run build                # Build both CLI and extension
npm run build:cli            # Build CLI only
npm run build:extension      # Build extension only

# Test
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

## License

MIT - See [LICENSE](LICENSE)
