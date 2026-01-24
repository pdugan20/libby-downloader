# Release Notes

## Version 2.0.0 - TypeScript Modernization

**Release Date:** 2026-01-23

Major refactor of the Chrome extension to modern TypeScript architecture with improved maintainability, type safety, and developer experience.

### Breaking Changes

None - Extension functionality remains identical to v1.0.0 from a user perspective.

### New Features

- **Full TypeScript Migration**: All extension code converted to TypeScript with strict type checking
- **Modular Architecture**: Clean separation of concerns across background, content, and iframe scripts
- **Centralized Logging**: Unified logger with DEBUG_MODE support for development
- **Custom Error Classes**: Type-safe error handling with context tracking
- **Code Splitting**: Vite automatically extracts shared utilities into optimized chunks

### Improvements

**Build System:**
- Vite build system for fast compilation and bundling
- ES modules format (Manifest V3 compatible)
- Minification and tree shaking enabled
- Development watch mode for faster iteration

**Code Quality:**
- 186 comprehensive tests across CLI and extension
- JSDoc comments on all public APIs with usage examples
- Consistent naming conventions and code style
- Zero TypeScript errors with strict mode enabled

**Documentation:**
- New ARCHITECTURE.md with detailed technical documentation
- Updated README.md with TypeScript build process
- Enhanced CLAUDE.md developer guide
- Comprehensive inline documentation

**Performance:**
- Reduced bundle sizes through logging cleanup and optimization
- Content script: 9.99 kB (minified)
- Background script: 3.81 kB (minified)
- Shared validators chunk: 2.42 kB (minified)

**Developer Experience:**
- Type-safe message passing between scripts
- Centralized constants and configuration
- Debug mode for testing without real downloads
- Clear component responsibilities and data flow

### Technical Details

**Architecture Changes:**

```
src/
├── background/          # Service worker (downloads, tracking, metadata)
├── content/             # Content script (UI, message routing, validation)
├── iframe/              # Iframe scripts (extraction, button injection)
├── shared/              # Shared utilities (logger, validators, icons)
└── types/               # TypeScript definitions (book data, messages, errors)
```

**Component Breakdown:**
- Background service worker: Download orchestration with rate limiting
- Content script: UI management and message coordination
- Iframe extractor (MAIN world): Book data extraction from BIF object
- Iframe UI injector (ISOLATED world): Download button injection
- Shared utilities: Logger, validators, icon loader

**Build Configuration:**
- Target: esnext (modern Chrome)
- Minification: esbuild
- Format: ES modules
- Code splitting: automatic
- Source maps: disabled in production

### Migration Guide

No user action required - v2.0.0 is a drop-in replacement for v1.0.0.

For developers:
1. TypeScript source files in `src/` directory
2. Build with `npm run build:extension` (production) or `npm run dev:extension` (watch mode)
3. Run tests with `npm test`
4. Full validation with `npm run check-all`

### Acknowledgments

Refactored through 8 phases over ~20-28 hours:
- Phase 1: Setup & Infrastructure
- Phase 2: TypeScript Migration
- Phase 3: Modular Architecture
- Phase 4: Centralized Styles & Assets
- Phase 5: Enhanced Error Handling & Logging
- Phase 6: Testing Infrastructure
- Phase 7: Documentation & Polish
- Phase 8: Production Ready

---

## Version 1.0.0 - Initial Release

Initial working version with IIFE-based JavaScript architecture.
