# Libby Downloader - Development Guide

This document provides context for AI assistants (Claude) working on this codebase.

## Project Overview

A TypeScript CLI tool for downloading audiobooks from Libby with realistic user simulation to minimize detection risk. Built as a safer, more responsible alternative to the original TamperMonkey script.

## Architecture

### Core Modules

1. **auth/** - Authentication and session management
   - `libby-auth.ts` - Manual login flow, cookie persistence

2. **browser/** - Puppeteer automation with stealth
   - `manager.ts` - Browser lifecycle, session management
   - `stealth.ts` - User behavior simulation (mouse, scrolling, delays)

3. **downloader/** - Libby API interaction and chapter downloading
   - `libby-api.ts` - Data extraction via JSON.parse hooks, BIF object access
   - `chapter-downloader.ts` - Sequential downloads with rate limiting

4. **processor/** - Audio processing
   - `ffmpeg-processor.ts` - Chapter merging, metadata, chapter markers

5. **metadata/** - ID3 tag embedding
   - `embedder.ts` - Cover art, metadata embedding with node-id3

6. **utils/** - Shared utilities
   - `delay.ts` - Random delays, sleep functions
   - `fs.ts` - File operations, sanitization
   - `logger.ts` - Structured logging
   - `rate-limiter.ts` - Three-mode rate limiting (safe/balanced/aggressive)

7. **types/** - TypeScript definitions
   - Shared interfaces for books, chapters, configs

8. **cli.ts** - Main CLI entry point using Commander.js

## Key Technical Decisions

### Why Puppeteer?

- Real browser context prevents detection
- Access to Libby's internal objects (BIF, odreadCmptParams)
- Cookie persistence for session reuse
- Stealth plugins for anti-detection

### Why Sequential Downloads?

- Parallel downloads are easily detected (original script's issue)
- Humans read/listen sequentially, not all-at-once
- Variable timing between chapters mimics real behavior

### Rate Limiting Strategy

- **Safe mode**: 8-20s delays, breaks every 3 chapters (1 book/hour max)
- **Balanced mode**: 4-12s delays, breaks every 5 chapters (2 books/hour)
- **Aggressive mode**: 2-6s delays, minimal breaks (5 books/hour) - HIGH RISK

### Why Not Use Libby's API Directly?

- No documented public API
- Authentication is complex
- TamperMonkey approach (hooking internal data) is proven
- Browser context provides authenticated session automatically

## Code Patterns

### Error Handling

- Use try/catch with logger.error()
- Clean up resources in finally blocks
- Provide helpful error messages to CLI users

### Async Operations

- All I/O operations are async
- Use await for sequential operations
- Rate limiter enforces delays between operations

### Type Safety

- Strict TypeScript mode enabled
- Explicit interfaces for all data structures
- No `any` types except for page.evaluate() contexts

## Development Workflow

### Running Locally

```bash
npm run dev -- login              # Test login flow
npm run dev -- list               # Test book listing
npm run dev -- download <id>      # Test download (use safe mode!)
```

### Before Committing

```bash
npm run check-all                 # Type check + lint + format + test
```

### Pre-commit Hook

Automatically formats and lints staged files.

### Pre-push Hook

Runs full validation suite before push.

## Testing Strategy

### Unit Tests

- Focus on pure functions (utils/delay.ts, utils/fs.ts)
- Mock external dependencies (Puppeteer, FFmpeg)

### Integration Tests

- Test rate limiter behavior
- Test metadata embedding with sample files

### Manual Testing

- Always test downloads in safe mode first
- Use test library card if possible
- Monitor for detection/bans

## Important Constraints

### Security & Ethics

- Tool is for educational purposes only
- Users accept all responsibility for ToS violations
- Emphasize detection risks in all documentation
- No bypassing of DRM (only downloading already-accessible content)

### Performance

- Sequential downloads are intentionally slow
- Rate limiting is critical for detection avoidance
- FFmpeg operations can be memory-intensive

### Dependencies

- Requires FFmpeg installed on system (not bundled)
- Large Puppeteer install (~300MB with Chromium)
- Node-ID3 for metadata (simpler than FFmpeg metadata)

## Common Issues

### "Not logged in" errors

- Cookie expiration - re-run login
- Check ~/.libby-downloader/cookies.json exists

### TypeScript errors in page.evaluate()

- page.evaluate() runs in browser context (DOM types)
- Use `(window as any)` for custom properties
- Cast functions to `any` when needed for flexibility

### FFmpeg not found

- User must install separately (Homebrew, apt, etc.)
- Check with `ffmpeg -version` before processing

### Rate limit warnings

- User tried to download too fast
- Enforce cooldown periods
- Suggest safe mode

## Code Style

### Formatting

- Prettier with single quotes, 100 char width
- 2-space indentation
- Trailing commas (ES5 style)

### Naming

- PascalCase for classes
- camelCase for functions/variables
- SCREAMING_SNAKE_CASE for constants
- Descriptive names over brevity

### Comments

- Explain "why", not "what"
- TSDoc for public APIs
- Inline comments for tricky logic only

## Future Improvements

### Potential Features

- Resume interrupted downloads
- Multiple library card support
- Download queue management
- Better chapter title detection
- M4B output format option

### Detection Avoidance Enhancements

- ML-based timing patterns
- Adaptive rate limiting based on success
- Session replay from real user behavior
- Proxy rotation support

## Maintenance Notes

### When Libby Changes

- Monitor `BIF` object structure (core data source)
- Check `odreadCmptParams` hook still works
- Update selectors for shelf/book pages
- Test login flow for changes

### Dependency Updates

- Puppeteer: Check for breaking changes in page API
- Node-ID3: Verify metadata compatibility
- FFmpeg: Test chapter merging still works

## Resources

- Puppeteer Docs: https://pptr.dev
- FFmpeg Docs: https://ffmpeg.org/documentation.html
- Libby Web App: https://libbyapp.com
- Node.js Docs: https://nodejs.org/docs/

## Contributing

When adding new features:

1. Create feature branch from main
2. Write tests first (TDD when possible)
3. Implement feature
4. Update documentation
5. Run `npm run check-all`
6. Create pull request with clear description

## Support and Issues

- GitHub Issues: For bug reports and feature requests
- Include: OS, Node version, error logs, steps to reproduce
- Privacy: Never share library card details or personal info
