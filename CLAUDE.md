# Libby Downloader - Development Guide

TypeScript CLI tool for downloading audiobooks from Libby with realistic user simulation to minimize detection risk.

## Common Commands

```bash
# Development
npm run dev -- login              # Test login flow
npm run dev -- list               # List borrowed books
npm run dev -- download <id>      # Download book (ALWAYS use --mode safe for testing!)

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
- `src/auth/libby-auth.ts` - Manual login, cookie persistence
- `src/browser/manager.ts` - Puppeteer browser lifecycle
- `src/downloader/libby-api.ts` - **CRITICAL**: Extracts data via JSON.parse hooks to capture BIF object and odreadCmptParams
- `src/downloader/chapter-downloader.ts` - Sequential downloads with rate limiting
- `src/utils/rate-limiter.ts` - Three modes: safe (8-20s), balanced (4-12s), aggressive (2-6s)

**Configuration:**
- `config/stealth.json` - Rate limiting presets
- `eslint.config.js` - ESLint v9 flat config
- `jest.config.js` - Test configuration
- `.husky/` - Git hooks (pre-commit: lint-staged, pre-push: check-all)

## CRITICAL Rules

**NEVER commit without passing validation:**
- Pre-commit hook auto-formats and lints staged files
- Pre-push hook runs full `check-all` suite
- If hooks fail, fix issues before committing

**NEVER use parallel downloads:**
- Sequential downloads only (detection risk)
- Rate limiter enforces delays between chapters
- Users can choose safe/balanced/aggressive modes

**NEVER skip user simulation:**
- Mouse movements, scrolling, random delays are intentional
- Sequential pattern mimics human behavior
- Parallel requests = instant detection

**IMPORTANT: TypeScript `any` usage:**
- `any` types are ALLOWED in `page.evaluate()` contexts (browser environment)
- `any` types are ALLOWED in logger variadic parameters
- These ESLint warnings are expected and should NOT be "fixed"

## Architecture

**How it works:**
1. Puppeteer launches real Chrome with stealth plugins
2. User logs in manually (browser window opens)
3. Cookies saved to `~/.libby-downloader/cookies.json`
4. On book page, hook `JSON.parse` to capture `odreadCmptParams` (crypto keys)
5. Extract `BIF` object (book metadata, chapter URLs)
6. Download chapters sequentially with delays
7. FFmpeg merges chapters, adds metadata/chapter markers

**Rate Limiting:**
- Safe: 8-20s delays, breaks every 3 chapters, max 1 book/hour
- Balanced (default): 4-12s delays, breaks every 5 chapters, max 2 books/hour
- Aggressive: 2-6s delays, no breaks, max 5 books/hour (HIGH DETECTION RISK)

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
- `delay.test.ts` - Timing utilities
- `fs.test.ts` - File operations

**IMPORTANT: Don't test against real Libby:**
- Use mocks for Puppeteer, FFmpeg
- Test with safe mode only if using real endpoints
- Monitor for detection/bans

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

**"Not logged in" errors:**
- Cookie expired - run `npm run dev -- login`
- Check `~/.libby-downloader/cookies.json` exists

**TypeScript errors in page.evaluate():**
- This runs in browser context - `(window as any)` is correct
- Don't try to "fix" these with stricter types

**ESLint warnings about `any`:**
- Expected in page.evaluate() and logger functions
- These warnings are acceptable, don't suppress them

**FFmpeg not found:**
- User must install: `brew install ffmpeg` (macOS) or `apt install ffmpeg` (Linux)
- Required for chapter merging

## Dependencies

**IMPORTANT external requirements:**
- Node.js 18+ (tested on 18.x, 20.x, 22.x)
- FFmpeg (not bundled, must be installed separately)
- Chromium (bundled with Puppeteer, ~300MB)

**Key packages:**
- `puppeteer-extra` + `puppeteer-extra-plugin-stealth` for detection avoidance
- `fluent-ffmpeg` for audio processing
- `node-id3` for metadata embedding
- `commander` for CLI
- `chalk` + `ora` for terminal UI

## When Libby Changes

**CRITICAL monitoring points:**
- `BIF` object structure (contains book/chapter metadata)
- `odreadCmptParams` availability (crypto keys for chapter URLs)
- Shelf page selectors: `[data-test-id="shelf-loan"]`
- Login flow changes

If downloads suddenly fail, check browser console for BIF object changes.

## Resources

- Puppeteer: https://pptr.dev
- FFmpeg: https://ffmpeg.org/documentation.html
- Libby: https://libbyapp.com
- Node.js: https://nodejs.org/docs/
