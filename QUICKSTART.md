# Quick Start Guide

Get started with Libby Downloader in 5 minutes.

## 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Build the project
npm run build

# Install FFmpeg (required for merging)
# macOS:
brew install ffmpeg

# Ubuntu/Debian:
sudo apt install ffmpeg
```

## 2. Login to Libby

```bash
npm run dev -- login
```

A browser window will open. Log in to your Libby account normally, then the tool will save your session.

## 3. List Your Books

```bash
npm run dev -- list
```

This shows all audiobooks you have borrowed, along with their IDs.

## 4. Download a Book

```bash
# Copy the book ID from the list command
npm run dev -- download <book-id>

# Or use safe mode (recommended for first download)
npm run dev -- download <book-id> --mode safe
```

The audiobook will be downloaded to `~/Downloads/Libby` by default.

## Understanding Download Modes

- **Safe**: 8-20s between chapters, breaks every 3 chapters (slowest, safest)
- **Balanced**: 4-12s between chapters, breaks every 5 chapters (default)
- **Aggressive**: 2-6s between chapters, no breaks (fastest, riskiest)

## Tips

- Always start with **safe mode** for your first few downloads
- Don't download multiple books in quick succession
- Monitor for any warnings from your library
- The tool will create a merged MP3 with metadata and chapter markers

## Example Session

```bash
# 1. Login
npm run dev -- login

# 2. See what you have borrowed
npm run dev -- list

# Output:
# Your Borrowed Audiobooks:
#
# 1. The Martian (abc123def456)
#    by Andy Weir
# 2. Project Hail Mary (xyz789ghi012)
#    by Andy Weir

# 3. Download in safe mode
npm run dev -- download abc123def456 --mode safe

# 4. Find your audiobook at:
# ~/Downloads/Libby/The Martian/The Martian.mp3
```

## Troubleshooting

**"Not logged in" error**

Run `npm run dev -- login` again.

**"FFmpeg not found" error**

Install FFmpeg (see step 1 above).

**Very slow downloads**

This is intentional. Use `--mode balanced` or `--mode aggressive` for faster speeds (higher risk).

## Next Steps

- Read the full [README](README.md) for detailed documentation
- Learn about [stealth configurations](config/stealth.json)
- Understand the [risks and warnings](README.md#important-warnings)
