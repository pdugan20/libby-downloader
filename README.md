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

```
libby-downloader/
├── src/
│   ├── commands/       # CLI command handlers (interactive, list, tag)
│   ├── metadata/       # ID3 tag embedding
│   ├── utils/          # Utilities (logging, book discovery, etc.)
│   ├── types/          # TypeScript type definitions
│   └── cli.ts          # Main CLI interface
├── chrome-extension/   # Chrome extension for downloading
│   ├── manifest.json
│   ├── content.js
│   ├── iframe-extractor.js
│   └── background.js
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
