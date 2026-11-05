# libby-downloader

[![CI](https://github.com/pdugan20/libby-downloader/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/pdugan20/libby-downloader/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/pdugan20/libby-downloader)](https://github.com/pdugan20/libby-downloader/releases/latest)
[![License](https://img.shields.io/github/license/pdugan20/libby-downloader)](LICENSE)

A Chrome extension and CLI for downloading audiobooks from Libby for offline listening. The extension grabs files directly from Libby; the CLI tags MP3s with title, author, narrator, and cover art, or merges chapters into a single M4B audiobook with chapter markers.

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

If Libby has not provided links for every audio part, the extension automatically
loads the missing parts to collect the player's own links. It restores
your starting position on success or failure; temporary position changes may sync
to other devices. Collection stops if a part cannot load or the two-minute limit
is reached, and no chapter downloads start unless every link is available.
Saved metadata excludes signed playback URLs.

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

### Output recovery

Tagging copies each MP3 into a private `.libby-stage-*` directory on the selected
file's filesystem, writes or removes ID3 there, then atomically replaces that file after
success. A tagging error or cancellation before commit leaves that original
unchanged. Folder tagging commits one file at a time; it is not a transaction
across every chapter. Library callers can pass an `AbortSignal` to tagging options.

Merging encodes to the same kind of private staging directory and publishes the
completed M4B only after FFmpeg succeeds. `--force` keeps the previous destination
until atomic replacement; without it, an atomic no-clobber hard link also protects
against a destination appearing while encoding (a filesystem that does not support
hard links fails safely). Empty/missing output is rejected. Chapter/destination
symlinks are rejected, and existing destination permissions are retained. Original
chapters are never used as the merge output.

Cancellation is checked before publication; once the atomic commit starts, a
complete new file may be visible. Staging is cleaned after ordinary success or
failure. A process kill can leave a private staging directory for manual cleanup,
but does not require deleting or truncating the original destination. The selected
folder must be owner-controlled; this does not isolate concurrent hostile changes
to parent directories or provide power-loss durability guarantees.
