# Using Capture Mode (Avoids Bot Detection)

Due to Libby's bot detection, the tool cannot directly automate browsing to extract book data. Instead, you manually extract the data using a console script, then use the tool to download from that data.

## Why This Approach?

- **No bot detection**: Libby sees normal browsing, not automation
- **Faster downloads**: No browser overhead after initial capture
- **Reusable**: Capture once, download multiple times from same data
- **Safer**: Minimal risk to your account

## How to Use

### Step 1: Open the Audiobook

1. Open Chrome (or your browser)
2. Go to Libby and navigate to an audiobook you've borrowed
3. Open the audiobook player: `https://libbyapp.com/open/loan/{loanId}/{bookId}`
4. **Play the audiobook for 5-10 seconds** (this loads the audio data)
5. Pause it

### Step 2: Run the Extraction Script

1. Open Chrome DevTools:
   - Mac: `Cmd + Option + J`
   - Windows/Linux: `Ctrl + Shift + J`

2. Click the "Console" tab

3. **First time only**: Copy and paste the contents of `extract-book-data.js` into the console and press Enter
   - This injects the crypto parameter interceptor
   - You'll see: "⏳ Waiting for audio data to load..."
   - Close DevTools, **play the audiobook again for a few seconds**, then reopen DevTools

4. Paste the script again and press Enter
   - This time it will extract all the book data
   - A file named `libby-book-{loanId}-{bookId}.json` will download

### Step 3: Move the File

Move the downloaded JSON file to the captures directory:

```bash
mkdir -p ~/.libby-downloader/captures
mv ~/Downloads/libby-book-*.json ~/.libby-downloader/captures/
```

### Step 4: Download the Audiobook

```bash
libby download ~/.libby-downloader/captures/libby-book-{loanId}-{bookId}.json
```

Options:

```bash
# With all options
libby download libby-book-12346433-2443869.json \
  --mode safe \
  --output ~/Downloads/Audiobooks \
  --no-merge \
  --no-metadata

# Basic usage (default: balanced mode, merge chapters, embed metadata)
libby download libby-book-12346433-2443869.json
```

## Example Workflow

```bash
# 1. You manually open the book and run the script
#    - Opens: https://libbyapp.com/open/loan/12346433/2443869
#    - Plays for a few seconds
#    - Runs script in console
#    - Downloads: libby-book-12346433-2443869.json

# 2. Move the file
mv ~/Downloads/libby-book-12346433-2443869.json ~/.libby-downloader/captures/

# 3. Download the book
libby download ~/.libby-downloader/captures/libby-book-12346433-2443869.json

# Result: Audiobook downloaded with no bot detection!
```

## What Gets Captured?

The JSON file contains:

- **Metadata**: Title, authors, narrator, duration, cover URL, description
- **Chapters**: URLs with crypto parameters, titles, durations, start times
- **Timestamps**: When it was extracted, from which URL

## Troubleshooting

### "window.__odreadCmptParams not found"

You need to run the script twice:
1. First run: Injects the interceptor
2. Play audiobook for 5-10 seconds
3. Second run: Captures the data

### "window.BIF not found"

The page hasn't fully loaded. Wait a few more seconds and try again.

### Download fails with 403 Forbidden

The chapter URLs have expired. Re-extract the book data (they expire after some time).

## Notes

- The extraction script only reads data, it doesn't modify anything
- URLs in the capture file may expire - if downloads fail, re-extract
- You can keep capture files and re-download later (if URLs haven't expired)
- This method is detection-proof because Libby only sees normal browsing
