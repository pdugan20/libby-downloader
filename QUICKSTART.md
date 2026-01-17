# Quick Start Guide

Get started with Libby Downloader in 5 minutes.

## Setup (5 minutes)

### 1. Install Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `chrome-extension/` folder from this repository
5. Done!

### 2. Install CLI (Optional)

The CLI is optional and only needed if you want to add metadata to your MP3 files.

```bash
# Clone the repository
git clone https://github.com/pdugan20/libby-downloader.git
cd libby-downloader

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (makes 'libby' command available)
npm link
```

Verify installation:

```bash
libby --help
```

## Usage

### Download an Audiobook

1. Open Libby in Chrome
2. Open any audiobook (must be on the player page)
3. Click the extension button or "📥 Download Audiobook" button on the page
4. Wait for downloads to complete

Files save to: `~/Downloads/libby-downloads/[Book Title]/`

Each book folder contains:

- `chapter-001.mp3`, `chapter-002.mp3`, etc.
- `metadata.json` (book information)

### Tag MP3 Files (Add Metadata)

After downloading, you can add proper metadata (title, author, cover art) to your MP3 files:

```bash
# Interactive mode (recommended)
libby

# Select "Tag MP3 files"
# Choose book from list
# Done!
```

Or tag a specific folder:

```bash
libby tag ~/Downloads/libby-downloads/How\ Not\ to\ Die/
```

After tagging, your MP3 files will have:

- Album: Book title
- Artist: Author(s)
- Album Artist: Narrator
- Track Number: Chapter number
- Cover Art: Book cover image
- Genre: Audiobook
- Description: Book description

### View Downloaded Books

```bash
# Show all books with status (tagged/untagged, merged/not merged)
libby list
```

### Merge Chapters (Coming Soon)

Single-file audiobooks are not yet implemented. For now, you'll have individual chapter MP3 files.

## Complete Workflows

### Basic Workflow (Raw MP3s)

1. Click extension button on audiobook page
2. Wait for downloads to complete
3. Done - play chapters in any MP3 player

### Recommended Workflow (Tagged MP3s)

1. Click extension button on audiobook page
2. Wait for downloads to complete
3. Run: `libby`
4. Select "Tag MP3 files"
5. Choose book from list
6. Done - files have proper metadata

### Manual Tagging (Specific Book)

```bash
# Download via extension first
# Then:
libby tag ~/Downloads/libby-downloads/Book\ Title/

# With manual overrides:
libby tag ~/path/to/folder/ \
  --title "Book Title" \
  --author "Author Name" \
  --narrator "Narrator" \
  --cover-url "https://..."
```

## Troubleshooting

### "BIF object not found"

- Wait for player to fully load
- Refresh the page
- Try clicking the button again

### "Crypto parameters not captured"

- Wait for player to fully load
- Extension needs to intercept audio loading
- Try refreshing the page and clicking again

### Extension button doesn't appear

- Make sure you're on an audiobook player page (URL: `/open/loan/...`)
- Not the shelf or book details page
- Refresh the page
- Check extension is enabled at `chrome://extensions/`

### Downloads fail partway through

- Chrome will retry automatically
- Check `chrome://downloads/` for details
- You can resume failed downloads manually

### "Command not found: libby"

The CLI is optional - only needed for tagging. If you want to install it:

```bash
# Run from project directory:
npm link
```

### Tagging fails

- Make sure `metadata.json` exists in book folder
- Re-download book if metadata is missing
- Check that MP3 files exist (chapter-001.mp3, etc.)

## Advanced Usage

### Verbose Logging

```bash
libby -v list
libby -v tag
```

### Development Mode

For contributors: use `npm run dev --` to run without building:

```bash
npm run dev -- list
npm run dev -- tag
```

## Next Steps

- Read the full [README](README.md) for detailed documentation
- Check the [Chrome extension docs](chrome-extension/README.md)
- Learn about the [interactive CLI](INTERACTIVE_CLI.md)
- Understand the [risks and warnings](README.md#important-warnings)
