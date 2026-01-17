# Interactive CLI - Quick Guide

The CLI is fully interactive! You can run it from anywhere without specifying folders.

## How It Works

### Just Run `libby`

```bash
libby
```

**You'll see:**

```text
📚 Libby Downloader

Found 1 books
  Tagged: 0/1
  Merged: 0/1

? What would you like to do?
❯ Tag MP3 files (add metadata)
  Merge chapters into single file
  List all downloaded books
  View book details
  Exit
```

### Interactive Menus

**Select what you want to do:**

- Arrow keys to navigate
- Enter to select
- Works from any directory

## Features

### 1. Tag MP3 Files

```text
? What would you like to do? Tag MP3 files

? Which book do you want to tag?
❯ How Not to Die (19 chapters)
  Atomic Habits (26 chapters)
  [Tag all untagged books]
  [Cancel]
```

**Automatically:**

- Downloads cover art
- Embeds all ID3 tags
- Sets track numbers
- No folder navigation needed

### 2. List All Books

Shows complete overview:

```text
📚 Downloaded Books (2):

1. How Not to Die (19 chapters)
   ✓ Tagged • ○ Not merged
   by Michael Greger, Gene Stone
   Downloaded 2 minutes ago

2. Atomic Habits (26 chapters)
   ○ Not tagged • ○ Not merged
   by James Clear
   Downloaded 1 day ago

Summary:
  Total books: 2
  Tagged: 1/2
  Merged: 0/2
```

### 3. View Book Details

See everything about a book:

```text
📖 How Not to Die

Author:    Michael Greger, Gene Stone
Narrator:  Michael Greger
Chapters:  19
Cover:     https://...

Status:
  Metadata: ✓ Yes
  Tagged:   ✓ Yes
  Merged:   ○ No

Location:  ~/Downloads/libby-downloads/How Not to Die/
```

### 4. Merge Chapters

Select book to merge into single M4B file (coming soon).

## Smart Features

### Auto-Discovery

CLI automatically finds books in:

```bash
~/Downloads/libby-downloads/
```

No need to cd or specify paths!

### Status Tracking

Knows which books are:

- ✓ Tagged (has metadata)
- ✓ Merged (single file)
- ○ Not tagged
- ○ Not merged

### Batch Operations

```text
? Which book do you want to tag?
  Book 1 (19 chapters)
  Book 2 (26 chapters)
❯ [Tag all untagged books]  ← Tag everything at once!
```

## Command Line Options

If you prefer commands over menus:

```bash
# List all books
libby list

# Tag specific book (opens interactive menu)
libby tag

# Tag all untagged books
libby tag --all

# Tag specific folder
libby tag ~/Downloads/libby-downloads/"How Not to Die"/
```

## Typical Workflow

### After Downloading with Chrome Extension

1. **Download audiobook in Chrome:**
   - Open audiobook in Libby
   - Click extension button
   - Wait for chapters to download

2. **Run libby:**

   ```bash
   libby
   ```

3. **Select "Tag MP3 files":**

   ```text
   ? What would you like to do? Tag MP3 files
   ```

4. **Pick your book:**

   ```text
   ? Which book do you want to tag?
   ❯ How Not to Die (19 chapters)
   ```

5. **Done!**

   ```text
   [INFO] Book: How Not to Die
   [INFO] Downloading cover art...
   [SUCCESS] Cover art downloaded
   [INFO] Tagging chapter-001.mp3 (1/19)
   ...
   [SUCCESS] Successfully tagged 19 files
   ```

6. **(Optional) Merge:**
   Select "Merge chapters" from main menu (coming soon)

## Benefits

✅ **Works from anywhere** - No cd into folders
✅ **Auto-discovers books** - Scans downloads folder
✅ **Shows status** - See what's tagged/merged
✅ **Interactive menus** - No need to remember commands
✅ **Batch operations** - Tag all books at once
✅ **Detailed info** - View book metadata easily

## Examples

### Tag All Downloaded Books

```bash
libby
```

Select "Tag MP3 files" → "[Tag all untagged books]"

**Result:** All books get metadata in one go!

### Check What's Downloaded

```bash
libby list
```

Shows complete overview with status.

### Tag Specific Book

```bash
libby
```

Select "Tag MP3 files" → Pick book → Done!

## Integration with Chrome Extension

1. **Download with Chrome extension** (click button on audiobook page)
2. **Run `libby`** (from any folder)
3. **Select "Tag MP3 files"**
4. **Pick book from list**
5. **Done!**

No folder navigation, no paths to remember, just pick from the menu.

## Tips

- **Run from anywhere:** CLI finds books automatically
- **Use arrow keys:** Navigate menus easily
- **Tag before merge:** Better metadata in merged files
- **Batch operations:** Tag multiple books at once
- **View details:** Check book info before processing

## Available Commands

Interactive mode (recommended):

```bash
libby                     # Main interactive menu
```

Direct commands:

```bash
libby list                # List books
libby tag                 # Interactive tag menu
libby tag <folder>        # Tag specific folder
libby tag --all           # Tag all books
```

But interactive mode is easier! Just run `libby` and pick from the menu.
