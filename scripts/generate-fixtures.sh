#!/usr/bin/env bash
#
# Generate test fixtures for CLI integration testing.
# Creates realistic book directories with tiny valid MP3 files.
#
# Usage: ./scripts/generate-fixtures.sh [--clean]

set -euo pipefail

FIXTURES_DIR="$(cd "$(dirname "$0")/.." && pwd)/fixtures"

if [[ "${1:-}" == "--clean" ]]; then
  echo "[INFO] Removing existing fixtures..."
  rm -rf "$FIXTURES_DIR"
  echo "[INFO] Done."
  exit 0
fi

if [[ -d "$FIXTURES_DIR" ]]; then
  echo "[INFO] Fixtures directory already exists. Use --clean to regenerate."
  exit 0
fi

echo "[INFO] Generating test fixtures in $FIXTURES_DIR"

# Check for ffmpeg
if ! command -v ffmpeg &>/dev/null; then
  echo "[ERROR] ffmpeg is required to generate fixtures"
  exit 1
fi

mkdir -p "$FIXTURES_DIR"

# Helper: generate a silent MP3 file with a specific duration
generate_mp3() {
  local output="$1"
  local duration="$2"
  ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t "$duration" -q:a 9 "$output" 2>/dev/null
}

# Helper: generate a tagged MP3 file
generate_tagged_mp3() {
  local output="$1"
  local duration="$2"
  local title="$3"
  local artist="$4"
  local album="$5"
  local track="$6"
  ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t "$duration" -q:a 9 \
    -metadata title="$title" \
    -metadata artist="$artist" \
    -metadata album="$album" \
    -metadata track="$track" \
    -metadata genre="Audiobook" \
    "$output" 2>/dev/null
}

# ──────────────────────────────────────────────────────────────
# 1. complete-book — Has metadata + chapters, not tagged, not merged
# ──────────────────────────────────────────────────────────────
echo "[INFO] Creating complete-book fixture..."
BOOK_DIR="$FIXTURES_DIR/The Great Adventure"
mkdir -p "$BOOK_DIR"

generate_mp3 "$BOOK_DIR/chapter-1.mp3" 1
generate_mp3 "$BOOK_DIR/chapter-2.mp3" 1
generate_mp3 "$BOOK_DIR/chapter-3.mp3" 1

cat > "$BOOK_DIR/metadata.json" << 'METADATA'
{
  "metadata": {
    "title": "The Great Adventure",
    "authors": ["Jane Smith"],
    "narrator": "Bob Johnson",
    "coverUrl": "https://example.com/cover.jpg",
    "description": "A thrilling tale of adventure and discovery."
  },
  "chapters": [
    { "index": 0, "title": "Chapter 1: The Beginning", "duration": 1 },
    { "index": 1, "title": "Chapter 2: The Journey", "duration": 1 },
    { "index": 2, "title": "Chapter 3: The End", "duration": 1 }
  ]
}
METADATA

# ──────────────────────────────────────────────────────────────
# 2. tagged-book — Has metadata + chapters, already tagged
# ──────────────────────────────────────────────────────────────
echo "[INFO] Creating tagged-book fixture..."
BOOK_DIR="$FIXTURES_DIR/Mystery at Midnight"
mkdir -p "$BOOK_DIR"

generate_tagged_mp3 "$BOOK_DIR/chapter-1.mp3" 1 "Chapter 1: The Discovery" "Alice Walker" "Mystery at Midnight" "1/2"
generate_tagged_mp3 "$BOOK_DIR/chapter-2.mp3" 1 "Chapter 2: The Reveal" "Alice Walker" "Mystery at Midnight" "2/2"

cat > "$BOOK_DIR/metadata.json" << 'METADATA'
{
  "metadata": {
    "title": "Mystery at Midnight",
    "authors": ["Alice Walker"],
    "narrator": "Sarah Chen",
    "coverUrl": "https://example.com/mystery-cover.jpg",
    "description": "A gripping mystery that keeps you guessing until the very end."
  },
  "chapters": [
    { "index": 0, "title": "Chapter 1: The Discovery", "duration": 1 },
    { "index": 1, "title": "Chapter 2: The Reveal", "duration": 1 }
  ]
}
METADATA

# ──────────────────────────────────────────────────────────────
# 3. merged-book — Has metadata + chapters + .m4b, already merged
# ──────────────────────────────────────────────────────────────
echo "[INFO] Creating merged-book fixture..."
BOOK_DIR="$FIXTURES_DIR/Science of Everything"
mkdir -p "$BOOK_DIR"

generate_tagged_mp3 "$BOOK_DIR/chapter-1.mp3" 1 "Chapter 1: Physics" "David Lee" "Science of Everything" "1/2"
generate_tagged_mp3 "$BOOK_DIR/chapter-2.mp3" 1 "Chapter 2: Chemistry" "David Lee" "Science of Everything" "2/2"

# Create a tiny M4B (just an AAC in MP4 container)
ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 2 -c:a aac -b:a 64k \
  -metadata title="Science of Everything" \
  -metadata artist="David Lee" \
  "$BOOK_DIR/Science of Everything.m4b" 2>/dev/null

cat > "$BOOK_DIR/metadata.json" << 'METADATA'
{
  "metadata": {
    "title": "Science of Everything",
    "authors": ["David Lee"],
    "narrator": "Emma Wilson",
    "description": "An exploration of the fundamental sciences."
  },
  "chapters": [
    { "index": 0, "title": "Chapter 1: Physics", "duration": 1 },
    { "index": 1, "title": "Chapter 2: Chemistry", "duration": 1 }
  ]
}
METADATA

# ──────────────────────────────────────────────────────────────
# 4. no-metadata — Has chapters but no metadata.json
# ──────────────────────────────────────────────────────────────
echo "[INFO] Creating no-metadata fixture..."
BOOK_DIR="$FIXTURES_DIR/Unknown Book"
mkdir -p "$BOOK_DIR"

generate_mp3 "$BOOK_DIR/chapter-1.mp3" 1
generate_mp3 "$BOOK_DIR/chapter-2.mp3" 1

# ──────────────────────────────────────────────────────────────
# 5. no-chapters — Has metadata.json but no MP3 files
# ──────────────────────────────────────────────────────────────
echo "[INFO] Creating no-chapters fixture..."
BOOK_DIR="$FIXTURES_DIR/Empty Promises"
mkdir -p "$BOOK_DIR"

cat > "$BOOK_DIR/metadata.json" << 'METADATA'
{
  "metadata": {
    "title": "Empty Promises",
    "authors": ["No One"],
    "description": "A book with no chapters."
  },
  "chapters": []
}
METADATA

# ──────────────────────────────────────────────────────────────
# 6. multi-author — Multiple authors for display testing
# ──────────────────────────────────────────────────────────────
echo "[INFO] Creating multi-author fixture..."
BOOK_DIR="$FIXTURES_DIR/Collaborative Work"
mkdir -p "$BOOK_DIR"

generate_mp3 "$BOOK_DIR/chapter-1.mp3" 1
generate_mp3 "$BOOK_DIR/chapter-2.mp3" 1

cat > "$BOOK_DIR/metadata.json" << 'METADATA'
{
  "metadata": {
    "title": "Collaborative Work",
    "authors": ["Author One", "Author Two", "Author Three"],
    "narrator": "Group Narrator",
    "description": {
      "full": "A collaborative work by three brilliant minds exploring the nature of teamwork.",
      "short": "A book about teamwork."
    }
  },
  "chapters": [
    { "index": 0, "title": "Part 1: Foundations", "duration": 1 },
    { "index": 1, "title": "Part 2: Applications", "duration": 1 }
  ]
}
METADATA

echo ""
echo "[SUCCESS] Fixtures generated in $FIXTURES_DIR"
echo ""
echo "  The Great Adventure    - complete book (untagged, unmerged)"
echo "  Mystery at Midnight    - tagged book"
echo "  Science of Everything  - tagged and merged book"
echo "  Unknown Book           - no metadata.json"
echo "  Empty Promises         - metadata but no chapter files"
echo "  Collaborative Work     - multiple authors, object description"
echo ""
echo "Usage:"
echo "  npm run dev -- list --data-dir ./fixtures"
echo "  npm run dev -- tag ./fixtures/The\\ Great\\ Adventure"
echo "  npm run dev -- --data-dir ./fixtures"
