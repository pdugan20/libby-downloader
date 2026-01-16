# Quick Start Guide

Get started with Libby Downloader in 5 minutes.

## Prerequisites

Before starting, verify you have:

**1. Node.js 18+**

```bash
node --version  # Should show v18.0.0 or higher
```

**2. FFmpeg**

```bash
ffmpeg -version  # Should show installed version
```

If missing:

- **macOS**: `brew install ffmpeg`
- **Ubuntu/Debian**: `sudo apt install ffmpeg`
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/pdugan20/libby-downloader.git
cd libby-downloader

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Link globally (makes 'libby' command available)
npm link
```

## Verify Installation

Check that everything works:

```bash
# Should show available commands
libby --help
```

If you see the help menu, you're ready to go!

## First Use

### 1. Login to Libby

```bash
libby login
```

A browser window will open. Log in to your Libby account normally, then close the browser. Your session will be saved.

### 2. List Your Borrowed Books

```bash
libby list
```

This shows all audiobooks you currently have borrowed, with their IDs.

### 3. Download a Book

```bash
# Use safe mode for your first download
libby download <book-id> --mode safe
```

The audiobook will be downloaded to `~/Downloads/Libby/` by default.

## Download Modes

- **Safe**: 8-20s between chapters, breaks every 3 chapters (safest)
- **Balanced**: 4-12s between chapters, breaks every 5 chapters (default)
- **Aggressive**: 2-6s between chapters, no breaks (highest risk)

**Always start with safe mode for your first few downloads.**

## Example Workflow

```bash
# Login
libby login

# See what you have borrowed
libby list

# Output:
# 1. The Martian (abc123def456)
#    by Andy Weir

# Download in safe mode
libby download abc123def456 --mode safe

# Find your audiobook at:
# ~/Downloads/Libby/The Martian/The Martian.mp3
```

## Troubleshooting

**Command not found: libby**

```bash
# Run from project directory:
npm link
```

**"Not logged in" error**

```bash
libby login
```

**"FFmpeg not found" error**

Install FFmpeg (see Prerequisites above).

**Very slow downloads**

This is intentional for safety. Use `--mode balanced` for moderate speed, or `--mode aggressive` for fastest (highest risk of detection).

## Development Mode

For contributors: use `npm run dev --` to run without building:

```bash
npm run dev -- login
npm run dev -- download <book-id>
```

## Next Steps

- Read the full [README](README.md) for detailed documentation
- Learn about [stealth configurations](config/stealth.json)
- Understand the [risks and warnings](README.md#important-warnings)
