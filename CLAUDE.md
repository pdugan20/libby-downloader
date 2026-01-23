# Libby Downloader - Development Guide

TypeScript CLI tool for managing audiobooks downloaded from Libby via Chrome extension.

## Common Commands

```bash
# Development
npm run dev                       # Run interactive CLI
npm run dev -- list               # List downloaded books
npm run dev -- tag                # Tag MP3 files

# Testing & Validation
npm test                          # Run Jest tests
npm run test:coverage             # Run tests with coverage report
npm run check-all                 # Full validation: typecheck + lint + format + test

# Building
npm run build                     # Compile TypeScript to dist/
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

## Core Files

**Entry Points:**

- `src/cli.ts` - Main CLI interface (Commander.js)
- `src/index.ts` - Library exports

**Key Modules:**

- `src/commands/interactive.ts` - Interactive menu system
- `src/commands/list.ts` - List downloaded books
- `src/commands/tag.ts` - Tag MP3 files with metadata
- `src/metadata/embedder.ts` - ID3 tag embedding
- `src/utils/books.ts` - Book discovery and status checking
- `src/utils/logger.ts` - Logging utilities

**Chrome Extension:**

- `chrome-extension/manifest.json` - Extension configuration
- `chrome-extension/content/content.js` - Main content script (bundled, no ES6 imports)
- `chrome-extension/iframe/iframe-extractor.js` - Extracts BIF object and crypto params
- `chrome-extension/background/background.js` - Service worker for downloads (supports ES6 modules)
- `chrome-extension/shared/` - Shared utilities (used by background scripts)

**Configuration:**

- `eslint.config.js` - ESLint v9 flat config
- `jest.config.js` - Test configuration
- `.husky/` - Git hooks (pre-commit: lint-staged, pre-push: check-all + extension:validate)
- `scripts/validate-extension.js` - Custom extension validator (filters Firefox-specific errors)

## CRITICAL Rules

**NEVER commit without passing validation:**

- Pre-commit hook auto-formats and lints staged files
- Pre-push hook runs full `check-all` suite + extension validation
- If hooks fail, fix issues before pushing
- Extension validation filters out Firefox-specific errors (Chrome-only extension)

**IMPORTANT: TypeScript `any` usage:**

- `any` types are ALLOWED in logger variadic parameters
- These ESLint warnings are expected and should NOT be "fixed"

## Architecture

**How it works:**

1. **Chrome Extension Downloads:**
   - User clicks extension button on Libby audiobook page
   - Extension extracts BIF object (book metadata) from page
   - Extension hooks JSON.parse to capture odreadCmptParams (crypto keys)
   - Extension downloads chapters sequentially via chrome.downloads API
   - 500ms delays between chapters (rate limiting)
   - Saves metadata.json alongside MP3 files

2. **CLI Tags (Optional):**
   - CLI auto-discovers books in `~/Downloads/libby-downloads/`
   - Reads metadata.json from book folders
   - Embeds ID3 tags into MP3 files (title, author, narrator, cover art)
   - Shows book status (tagged/untagged)

**Key Points:**

- Extension handles ALL downloading (no CLI download functionality)
- CLI is ONLY for tagging and listing books
- No browser automation
- No rate limiting in CLI (extension handles that)
- Downloads happen in user's real browser session (zero bot detection)

## Code Style

**IMPORTANT formatting rules:**

- Prettier: single quotes, 100 char width, 2-space indent
- ESLint: TypeScript recommended rules + Prettier integration
- All staged files auto-formatted on commit

**Naming:**

- PascalCase: classes
- camelCase: functions, variables
- SCREAMING_SNAKE_CASE: constants

**Error handling:**

- Use try/catch with `logger.error()`
- Clean up resources in finally blocks
- Unused error variables: use `catch { }` without parameter

## Testing

**Unit tests location:** `src/utils/__tests__/`

**Current coverage:** Focus on pure utility functions

- `fs.test.ts` - File operations

**IMPORTANT: Don't test against real Libby:**

- Use mocks for external dependencies
- Test with safe data only

## Repository Etiquette

**Branch strategy:**

- Main branch: `main`
- Feature branches: `feature/descriptive-name`
- Bug fixes: `fix/issue-description`

**Commit messages:**

- Descriptive, present tense
- Multi-line for complex changes
- No emoji (per user preferences)

**Pull requests:**

- All checks must pass (GitHub Actions CI)
- Tests run on Node 18.x, 20.x, 22.x
- Coverage thresholds: 50% branches, 60% statements

## Common Issues

**TypeScript errors:**

- Make sure all imports reference existing files
- Check that exported types match actual exports
- Run `npm run typecheck` to verify

**ESLint warnings about `any`:**

- Expected in logger functions
- These warnings are acceptable, don't suppress them

## Dependencies

**IMPORTANT external requirements:**

- Node.js 18+ (tested on 18.x, 20.x, 22.x)
- Chrome browser (for extension)

**Key packages:**

- `node-id3` for metadata embedding
- `commander` for CLI
- `chalk` for terminal UI
- `inquirer` for interactive prompts

**Dependency management:**

- Dependabot configured in `.github/dependabot.yml`
- Runs weekly checks every Monday
- Creates PRs automatically for updates
- Check security: `npm audit`
- Check outdated: `npm outdated`

## When Libby Changes

**CRITICAL monitoring points:**

- `BIF` object structure (contains book/chapter metadata)
- `odreadCmptParams` availability (crypto keys for chapter URLs)
- Extension button injection on audiobook pages

If downloads suddenly fail, check Chrome DevTools console for BIF object changes.

## Chrome Extension Development

**CRITICAL: Module Import Limitation**

Chrome Manifest V3 does NOT support ES6 module imports in content scripts via manifest declaration, even if you add `"type": "module"` to the manifest. The content script must be a single bundled file or use IIFE patterns.

**Current architecture:**

- Content script combines all modules into one file with IIFE wrapper
- Background service worker CAN use `"type": "module"` and import statements
- Shared utilities are copied inline into content script

**Validation workflow:**

```bash
# Validate extension (auto-filters Firefox-specific errors)
npm run extension:validate

# Strict validation with warnings-as-errors (for debugging)
npm run extension:lint
```

**Automated validation:**

- Extension validation runs automatically on `git push` via pre-push hook
- Custom validator (`scripts/validate-extension.js`) filters Firefox-specific errors
- Only Chrome-relevant errors will block the push

**Understanding web-ext validation:**

web-ext is primarily designed for Firefox extensions. Our custom validator filters out:

- `MANIFEST_FIELD_UNSUPPORTED` - service_worker vs scripts difference (Chrome uses service_worker)
- `ADDON_ID_REQUIRED` - Firefox requires ID, Chrome doesn't
- `MISSING_DATA_COLLECTION_PERMISSIONS` - Firefox privacy requirement only
- `KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION` - Firefox version requirements

All innerHTML security warnings have been fixed by using textContent instead.

**Manual testing in Chrome:**

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle in top-right
3. Click "Load unpacked" button
4. Select the `chrome-extension/` directory
5. Check for errors in the console
6. Navigate to a Libby audiobook page to test functionality

**Common extension errors:**

- "Cannot use import statement outside a module" - Content script has ES6 imports, must be bundled
- "Service worker registration failed" - Check background/background.js exists and is valid
- "Extension context invalidated" - Extension was reloaded, refresh the test page

**Debugging tips:**

- Content script errors: Check the page's DevTools console
- Background script errors: Check `chrome://extensions/` and click "Errors" button
- Message passing issues: Add console.log in both content and background scripts
- Use `chrome.runtime.lastError` to catch API errors

**When making changes:**

1. Test the extension loads without errors in Chrome
2. Run `npm run extension:validate` to check for obvious issues
3. Ignore Firefox-specific errors from web-ext
4. Test actual functionality on Libby audiobook pages
5. Check both DevTools consoles (page and extension service worker)

## CLI Commands

**Available Commands:**

- `libby` - Interactive menu (tag files, list books, view details)
- `libby list` - List all downloaded books with status
- `libby tag [folder]` - Tag MP3 files with metadata (interactive if no folder)

**Command Options:**

- `-v, --verbose` - Enable verbose logging
- `--title <title>` - Override book title (tag command)
- `--author <author>` - Override author (tag command)
- `--narrator <narrator>` - Override narrator (tag command)
- `--cover-url <url>` - Override cover art URL (tag command)

## Project Structure

```
libby-downloader/
├── src/
│   ├── commands/       # CLI command handlers (interactive, list, tag)
│   ├── metadata/       # ID3 tag embedding
│   ├── utils/          # Utilities (logging, book discovery, etc.)
│   ├── types/          # TypeScript type definitions
│   ├── cli.ts          # Main CLI interface
│   └── index.ts        # Library exports
├── chrome-extension/   # Chrome extension for downloading
│   ├── manifest.json
│   ├── content.js
│   ├── iframe-extractor.js
│   └── background.js
└── package.json
```

## Resources

- Chrome Extensions: https://developer.chrome.com/docs/extensions/
- Node.js: https://nodejs.org/docs/
- Libby: https://libbyapp.com
- node-id3: https://github.com/Zazama/node-id3
