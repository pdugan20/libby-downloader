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
- `chrome-extension/content.js` - Injects download button
- `chrome-extension/iframe-extractor.js` - Extracts BIF object and crypto params
- `chrome-extension/background.js` - Service worker for downloads

**Configuration:**

- `eslint.config.js` - ESLint v9 flat config
- `jest.config.js` - Test configuration
- `.husky/` - Git hooks (pre-commit: lint-staged, pre-push: check-all)

## CRITICAL Rules

**NEVER commit without passing validation:**

- Pre-commit hook auto-formats and lints staged files
- Pre-push hook runs full `check-all` suite
- If hooks fail, fix issues before committing

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
