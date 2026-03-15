# Libby Downloader - Development Guide

TypeScript CLI tool for managing audiobooks downloaded from Libby via Chrome extension.

## Common Commands

```bash
# Development
npm run dev                       # Run interactive CLI
npm run dev -- list               # List downloaded books
npm run dev -- tag                # Tag MP3 files
npm run dev -- merge              # Merge chapters into M4B audiobook

# Testing & Validation
npm test                          # Run Jest tests
npm run test:coverage             # Run tests with coverage report
npm run check-all                 # Full validation: typecheck + lint + format + test

# Building
npm run build                     # Compile CLI TypeScript to dist/
npm run build:extension           # Build extension for production (Vite)
npm run dev:extension             # Watch mode for extension development
npm run typecheck                 # Type check without emitting files

# Code Quality
npm run lint                      # Check code with ESLint
npm run lint:fix                  # Auto-fix linting issues
npm run format                    # Format code with Prettier
npm run format:check              # Check if code is formatted

# Chrome Extension Validation
npm run extension:validate        # Lint extension manifest and code
npm run extension:lint            # Lint with warnings-as-errors
```

## Entry Points

- `src/cli.ts` - CLI interface (Commander.js)
- `src/index.ts` - Library exports
- `src/background/index.ts` - Extension service worker
- `src/content/index.ts` - Extension content script
- `src/iframe/extractor.ts` - BIF object extraction (MAIN world)
- `src/iframe/ui-injector.ts` - Download button injection (ISOLATED world)

## CRITICAL Rules

- Pre-commit hook auto-formats and lints staged files
- Pre-push hook runs full `check-all` suite + extension validation
- `any` types are ALLOWED in logger variadic parameters — don't "fix" these ESLint warnings
- Always set `DEBUG_MODE = false` in `src/shared/constants.ts` before production releases
- Don't test against real Libby — use mocks for all external dependencies

## Architecture

1. **Chrome Extension Downloads:**
   - User clicks extension button on Libby audiobook page
   - Extension extracts BIF object (book metadata) from page
   - Extension hooks JSON.parse to capture odreadCmptParams (crypto keys)
   - Downloads chapters sequentially via chrome.downloads API (500ms delays)
   - Saves metadata.json alongside MP3 files

2. **CLI Tags (Optional):**
   - Auto-discovers books in ~/Downloads/libby-downloads/
   - Reads metadata.json, embeds ID3 tags into MP3 files

3. **CLI Merges (Optional):**
   - Merges chapter MP3s into single M4B audiobook via fluent-ffmpeg
   - Embeds chapter markers, metadata, and cover art
   - Output: 64kbps AAC mono

Extension handles ALL downloading. CLI is for tagging, merging, and listing only.

## Debug Mode

`src/shared/constants.ts` — `DEBUG_MODE` flag:

- **true:** DEBUG level logging, stack traces, simulated downloads
- **false:** INFO level and above, real downloads only

## Code Style

- Prettier: single quotes, 100 char width, 2-space indent
- PascalCase: classes | camelCase: functions, variables | SCREAMING_SNAKE_CASE: constants
- Error handling: try/catch with `logger.error()`, cleanup in finally, `catch { }` without parameter

## Testing

- Test structure: `src/__tests__/` and `src/utils/__tests__/`
- Environment: Jest with jsdom
- Chrome API mocks in `src/__tests__/mocks/`
- Coverage thresholds: 50% branches, 60% statements

## Chrome Extension Build

**CRITICAL:** Content scripts CANNOT use ES module imports in Chrome extensions (MV3). Only background workers support `type:"module"`.

The build script (`scripts/build-extension.mjs`) compiles each entry as a self-contained IIFE bundle with all dependencies inlined.

**Extension validation** uses web-ext, which is Firefox-focused. The custom validator (`scripts/validate-extension.js`) filters out Firefox-specific errors: `MANIFEST_FIELD_UNSUPPORTED`, `ADDON_ID_REQUIRED`, `MISSING_DATA_COLLECTION_PERMISSIONS`, `KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION`.

**Debugging:**

- Content script errors: page DevTools console
- Background script errors: `chrome://extensions/` → Errors button
- Build/type errors: terminal output or `npm run typecheck`

## When Libby Changes

If downloads suddenly fail, check these in Chrome DevTools:

- `BIF` object structure (book/chapter metadata)
- `odreadCmptParams` availability (crypto keys for chapter URLs)
- Extension button injection on audiobook pages
