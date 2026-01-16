# Libby Downloader

[![CI](https://github.com/pdugan20/libby-downloader/actions/workflows/ci.yml/badge.svg)](https://github.com/pdugan20/libby-downloader/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

A command-line tool for downloading audiobooks from Libby with realistic user simulation to minimize detection risk.

## Important Warnings

**READ THIS BEFORE USING:**

- This tool is for **educational purposes only**
- Downloading audiobooks may **violate your library's terms of service**
- **Library cards can be banned** for automated downloading
- The original developer reported **multiple library card bans**
- Even with "safe mode", there is **always detection risk**
- Use at your own risk and accept full responsibility

**This tool simulates human behavior to reduce detection risk, but cannot guarantee safety.**

## Features

- **Realistic User Simulation**: Random delays, mouse movements, and breaks to mimic human behavior
- **Three Speed Modes**: Safe (slowest, safest), Balanced, and Aggressive (fastest, riskiest)
- **Rate Limiting**: Configurable limits on books per hour and chapters per session
- **Session Management**: Persistent login with cookie storage
- **Audio Processing**: Merge chapters, embed metadata, add chapter markers
- **Progress Tracking**: Real-time download progress and status

## Prerequisites

- **Node.js** 18+ (for running the tool)
- **FFmpeg** (for merging chapters and adding metadata)
- **Valid Libby account** with active library card

### Install FFmpeg

macOS:

```bash
brew install ffmpeg
```

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install ffmpeg
```

Windows:

Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd libby-downloader

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

## Usage

### 1. Login to Libby

First, log in to your Libby account. The browser will open for manual login:

```bash
libby login
```

This uses **manual login** to avoid detection. A browser window will open - log in normally, then close the browser. Your session will be saved for future use.

### 2. List Your Borrowed Books

```bash
libby list
```

This shows all audiobooks you currently have borrowed, with their IDs.

### 3. Download an Audiobook

```bash
# Download with default settings (balanced mode)
libby download <book-id>

# Download in safe mode (slowest, safest)
libby download <book-id> --mode safe

# Download in aggressive mode (fastest, riskiest)
libby download <book-id> --mode aggressive

# Specify output directory
libby download <book-id> -o ~/MyAudiobooks

# Download without merging chapters
libby download <book-id> --no-merge

# Download without embedding metadata
libby download <book-id> --no-metadata
```

### 4. Logout

```bash
libby logout
```

## Download Modes

### Safe Mode (Recommended for First Use)

- 8-20 seconds between chapters
- Automatic breaks every 3 chapters (30-90 seconds)
- Mouse movements and random scrolling enabled
- Max 1 book per hour
- **Slowest but safest**

```bash
libby download <book-id> --mode safe
```

### Balanced Mode (Default)

- 4-12 seconds between chapters
- Automatic breaks every 5 chapters (15-45 seconds)
- Mouse movements enabled
- Max 2 books per hour
- **Good balance of speed and safety**

```bash
libby download <book-id> --mode balanced
```

### Aggressive Mode (High Risk)

- 2-6 seconds between chapters
- No automatic breaks
- No mouse movements or scrolling
- Max 5 books per hour
- **Fastest but highest detection risk**

```bash
libby download <book-id> --mode aggressive
```

## How It Works

This tool improves on the original TamperMonkey script by:

1. **Sequential Downloads**: Downloads chapters one at a time, not in parallel
2. **Random Delays**: Adds realistic, variable delays between requests
3. **User Simulation**: Simulates mouse movements, scrolling, and reading time
4. **Automatic Breaks**: Takes occasional breaks to mimic human behavior
5. **Rate Limiting**: Enforces limits on downloads per hour

### Technical Details

- Uses Puppeteer with stealth plugins to control a real Chrome browser
- Intercepts Libby's internal data structures (same as TamperMonkey script)
- Extracts cryptographic parameters from JSON.parse hooks
- Downloads MP3 files using authenticated session
- Processes audio with FFmpeg (merging, metadata, chapters)

## Configuration

You can customize behavior by creating a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` to change defaults:

```bash
OUTPUT_DIR=~/Downloads/Libby
DOWNLOAD_MODE=balanced
HEADLESS=false
LOG_LEVEL=info
```

## Advanced Usage

### Running in Headless Mode

Run browser in the background (no visible window):

```bash
libby download <book-id> --headless
```

### Verbose Logging

Enable detailed logs for debugging:

```bash
libby download <book-id> -v
```

### Development Mode

Run without building:

```bash
npm run dev -- download <book-id>
```

## Project Structure

```
libby-downloader/
├── src/
│   ├── auth/           # Login and session management
│   ├── browser/        # Puppeteer automation and stealth
│   ├── downloader/     # Libby API and chapter downloading
│   ├── metadata/       # ID3 tag embedding
│   ├── processor/      # FFmpeg integration
│   ├── utils/          # Utilities (logging, delays, etc.)
│   ├── types/          # TypeScript type definitions
│   └── cli.ts          # Main CLI interface
├── config/
│   └── stealth.json    # Stealth mode configurations
└── package.json
```

## Troubleshooting

### "Not logged in" error

Run `libby login` again. Your session may have expired.

### "FFmpeg not found" error

Install FFmpeg (see Prerequisites above).

### Downloads are very slow

This is intentional for safety. Use `--mode aggressive` for faster downloads (higher risk).

### Browser doesn't open

Try running without headless mode (remove `--headless` flag).

### Chapters won't merge

Ensure FFmpeg is installed and accessible in your PATH.

## Contributing

Improvements and pull requests are welcome, especially for:

- Better stealth techniques
- Additional metadata options
- Error handling and retry logic
- Cross-platform compatibility

## Legal Disclaimer

This tool is provided for **educational purposes only**. Users are responsible for:

- Complying with their library's terms of service
- Respecting copyright and licensing agreements
- Understanding local laws regarding digital content
- Any consequences from using this tool