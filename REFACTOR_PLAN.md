# Chrome Extension Refactor Plan

Comprehensive plan to modernize the Libby Downloader Chrome extension with TypeScript, proper architecture, and best practices.

## Overview

Transform the extension from a monolithic IIFE-based structure to a modern, maintainable, TypeScript-powered codebase with proper separation of concerns.

## Phase 1: Setup & Infrastructure

**Goal:** Establish modern development environment with TypeScript and build tooling

**Build Tool Decision:** Plain Vite + TypeScript (no CRXJS plugin for stability)

- [x] 1.1 Research and choose build tool (Vite + CRXJS vs Webpack)
- [x] 1.2 Install TypeScript and dependencies
  - [x] Install `typescript`, `@types/chrome`, `@types/node`, `vite`
  - [x] Create `tsconfig.json` with proper Chrome extension settings
- [x] 1.3 Setup build tool configuration
  - [x] Configure bundler for background script
  - [x] Configure bundler for content scripts
  - [x] Configure bundler for iframe scripts
  - [x] Setup source maps for debugging
- [x] 1.4 Update `package.json` scripts
  - [x] Add `dev:extension` script for development mode
  - [x] Add `build:extension` script for production build
  - [x] Update lint/format scripts to include chrome-extension/**/*.ts
- [x] 1.5 Add `.gitignore` entries for build artifacts
- [x] 1.6 Test build process and verify extension loads
  - [x] Create src/ directory structure
  - [x] Create placeholder TypeScript entry points
  - [x] Fix Vite config for ES modules format
  - [x] Successfully build all scripts
  - [x] Verify manifest.json points to built files

**Estimated Time:** 2-3 hours ✅ **PHASE COMPLETE**

---

## Phase 2: TypeScript Migration

**Goal:** Convert existing JavaScript to TypeScript with proper types

- [x] 2.1 Create shared type definitions
  - [x] Create `src/types/messages.ts` for message types
  - [x] Create `src/types/extension-book.ts` for book data structures
  - [x] Create `src/types/chrome.ts` for Chrome API extensions
  - [x] Create `src/types/extension-types.ts` for central exports
- [x] 2.2 Convert iframe extractor to TypeScript
  - [x] Converted to `src/iframe/extractor.ts`
  - [x] Added proper types for BIF object structure
  - [x] Typed crypto parameters with window interface extension
  - [x] Typed all message payloads and functions
  - [x] Verified build output (3.05 kB minified)
- [x] 2.3 Convert iframe UI to TypeScript
  - [x] Converted to `src/iframe/ui-injector.ts`
  - [x] Typed DOM manipulation with querySelector<HTMLElement>
  - [x] Typed injectDownloadButton function with void return
  - [x] Used imported MessageTypes for button click
  - [x] Verified build output (2.68 kB minified)
- [x] 2.4 Convert content script to TypeScript
  - [x] Created `src/content/constants.ts` with ButtonState, Timeouts, UIConfig
  - [x] Created `src/content/validators.ts` with origin and book data validators
  - [x] Created `src/content/ui-manager.ts` with typed UIManager class
  - [x] Created `src/content/message-handler.ts` with typed MessageHandler class
  - [x] Created `src/content/index.ts` as main entry point
  - [x] Added proper types for all methods and message payloads
  - [x] Verified build output (12.16 kB minified)
- [x] 2.5 Convert background script to TypeScript
  - [x] Created `src/background/download-tracker.ts` with DownloadTracker class
  - [x] Created `src/background/metadata-writer.ts` with MetadataWriter class
  - [x] Created `src/background/download-service.ts` with DownloadService class
  - [x] Created `src/background/index.ts` as main orchestrator
  - [x] Added comprehensive types for download handlers and message handlers
  - [x] Added DownloadStatus and Timeouts to shared messages.ts
  - [x] Verified build output (4.39 kB minified)
- [x] 2.6 Update manifest.json to reference compiled JS
  - [x] Already configured in Phase 1 (manifest references built files)
- [x] 2.7 Fix all TypeScript errors and verify builds
  - [x] Fixed unused currentState property in UIManager
  - [x] Fixed JSON.parse typing in extractor
  - [x] All TypeScript errors resolved
  - [x] Build successful (all scripts compile cleanly)

**Estimated Time:** 3-4 hours ✅ **PHASE COMPLETE**

---

## Phase 3: Modular Architecture

**Goal:** Break monolithic files into focused, reusable modules

### 3.1 Shared Resources ✅ COMPLETE

- [x] 3.1.1 Create `src/shared/constants.ts`
  - [x] Message type constants already in `src/types/messages.ts`
  - [x] Timeout constants already in `src/types/messages.ts`
  - [x] UI config constants remain in `src/content/constants.ts` (content-specific)
  - [x] Exported DEBUG_MODE flag
- [x] 3.1.2 Create `src/shared/validators.ts`
  - [x] Extracted `validateOrigin` function with JSDoc
  - [x] Extracted `validateBookData` function with JSDoc
  - [x] Extracted `sanitizeFilename` utility function
  - [x] Updated content/validators.ts to re-export from shared
  - [x] Updated background scripts to use shared validators
- [x] 3.1.3 Create `src/shared/logger.ts`
  - [x] Centralized Logger class with LogLevel enum
  - [x] Support for DEBUG, INFO, WARN, ERROR levels
  - [x] Consistent [Libby Downloader] prefix format
  - [x] Exported singleton logger instance

### 3.2 Content Script Refactor ✅ COMPLETE (Phase 2.4)

- [x] 3.2.1 Create `src/content/ui-manager.ts`
  - [x] Extract UIManager class
  - [x] Add proper types for all methods
  - [x] Document public API
- [x] 3.2.2 Create `src/content/message-handler.ts`
  - [x] Extract MessageHandler class
  - [x] Type all message payloads
  - [x] Document message flow
- [x] 3.2.3 Create `src/content/index.ts`
  - [x] Main entry point
  - [x] Initialization logic only
  - [x] Import and compose components
- [x] 3.2.4 Remove old monolithic `content.js`
  - [x] Replaced with TypeScript modular structure

### 3.3 Iframe Scripts Refactor ✅ COMPLETE (Phase 2.2-2.3)

- [x] 3.3.1 Create `src/iframe/extractor.ts`
  - [x] Clean up extraction logic
  - [x] Move to src directory structure
  - [x] Add error handling
- [x] 3.3.2 Create `src/iframe/ui-injector.ts`
  - [x] Extract button injection logic
  - [x] Add proper DOM manipulation types
  - [x] Document injection strategy
- [x] 3.3.3 Create `src/iframe/index.ts`
  - [x] Not needed - scripts run independently

### 3.4 Background Script Refactor ✅ COMPLETE (Phase 2.5)

- [x] 3.4.1 Create `src/background/download-service.ts`
  - [x] Extract download orchestration logic
  - [x] Type download state
  - [x] Sequential chapter downloads
- [x] 3.4.2 Create `src/background/download-tracker.ts`
  - [x] Track download state
  - [x] Type-safe state management
- [x] 3.4.3 Create `src/background/index.ts`
  - [x] Main service worker entry point
  - [x] Initialize all handlers

**Estimated Time:** 4-5 hours ✅ **PHASE COMPLETE**

---

## Phase 4: Centralized Styles & Assets

**Goal:** Remove inline styles and centralize visual resources

- [x] 4.1 Create `src/styles/` and `src/assets/icons/` directory structure
- [x] 4.2 Create `src/styles/content.css`
  - [x] Extracted notification styles with class-based styling
  - [x] Extracted animation keyframes (slideIn, slideOut, spin)
  - [x] Removed inline cssText from showNotification()
- [x] 4.3 Create SVG icon files in `src/assets/icons/`
  - [x] `download.svg` - main download icon (cloud with arrow)
  - [x] `spinner.svg` - loading spinner (rotating lines)
  - [x] `checkmark.svg` - success icon
  - [x] `error.svg` - error icon (circle with exclamation)
- [x] 4.4 Create icon loader utility
  - [x] Created `src/shared/icon-loader.ts`
  - [x] Load SVG as strings via Vite's ?raw import
  - [x] Type-safe IconName union type
  - [x] getIcon() function with proper typing
- [x] 4.5 Update components to use external resources
  - [x] Updated ui-manager.ts to use getIcon() instead of inline SVG
  - [x] Removed injectStyles() method (CSS injected via manifest)
  - [x] Removed inline style objects
- [x] 4.6 Configure Vite for CSS and assets
  - [x] Added content-styles to vite.config.ts inputs
  - [x] Configured assetFileNames for proper CSS output
  - [x] Created src/vite-env.d.ts for SVG import types
- [x] 4.7 Update manifest.json to inject CSS
  - [x] Added css: ["styles/content-styles.css"] to content script

**Build Results:**
- Content script reduced from 12.12 kB to 10.41 kB
- External CSS: 0.59 kB (0.33 kB gzipped)
- SVG icons bundled into JS via ?raw imports

**Estimated Time:** 2-3 hours ✅ **PHASE COMPLETE**

---

## Phase 5: Enhanced Error Handling & Logging

**Goal:** Implement robust error handling and debugging

- [x] 5.1 Create error types in `src/types/errors.ts`
  - [x] LibbyDownloaderError - Base error class
  - [x] ExtractionError - Book extraction failures
  - [x] ValidationError - Data validation failures
  - [x] DownloadError - Chapter download failures
  - [x] IframeError - Iframe communication failures
  - [x] TimeoutError - Operation timeouts
- [x] 5.2 Enhance logger utility in `src/shared/logger.ts`
  - [x] Respects DEBUG_MODE flag (DEBUG level when true, INFO when false)
  - [x] Added structured logging with LogContext
  - [x] Added operationStart(), operationComplete(), operationFailed() methods
  - [x] Improved error logging with stack traces in DEBUG_MODE
- [x] 5.3 Add error boundaries to message-handler.ts
  - [x] Try/catch in handleButtonClick()
  - [x] Try/catch in handleExtractionSuccess()
  - [x] Custom error types for specific failure modes
  - [x] User-friendly error messages via UIManager.showError()
- [x] 5.4 Add error handling to download-service.ts
  - [x] Logger integration for all operations
  - [x] DownloadError wrapping for chapter failures
  - [x] Structured logging with context
- [ ] 5.5 Telemetry (optional - skipped)
  - Not needed for current scope

**Build Results:**
- Content script: 10.92 kB (up from 10.41 kB due to error handling)
- Background script: 4.36 kB (up from 4.31 kB)
- Validators chunk: 2.28 kB (includes logger, up from 0.68 kB)

**Estimated Time:** 2 hours ✅ **PHASE COMPLETE**

---

## Phase 6: Testing Infrastructure

**Goal:** Add basic testing to prevent regressions

- [x] 6.1 Setup testing framework
  - [x] Jest already configured with ts-jest
  - [x] Updated testEnvironment to jsdom for Chrome extension testing
  - [x] Installed jest-environment-jsdom
  - [x] Created Chrome API mocks in `src/__tests__/mocks/chrome.mock.ts`
- [x] 6.2 Write utility tests
  - [x] `validators.test.ts` - Tests for validateOrigin, validateBookData, sanitizeFilename
  - [x] `errors.test.ts` - Tests for all custom error classes
  - [x] `logger.test.ts` - Tests for logger utility with all log levels
- [x] 6.3 Write service tests
  - [x] `download-service.test.ts` - Tests for chapter downloading with Chrome API mocks
  - [x] `download-tracker.test.ts` - Tests for download state tracking
- [x] 6.4 Test scripts already in package.json
  - [x] `npm test` runs Jest test suite
  - [x] `npm run test:coverage` generates coverage reports
- [x] 6.5 Pre-push hook already runs tests
  - [x] `check-all` script includes `npm test`

**Test Results:**
- 15 test suites, 186 tests, all passing
- Coverage thresholds: 20% branches, 20% functions, 25% lines, 25% statements
- Test execution time: ~8.5 seconds

**New Tests Added:**
- 28 new tests for extension code
- Chrome API mocks for downloads, runtime, tabs
- Full coverage of validators, errors, logger
- Integration tests for download service and tracker

**Estimated Time:** 3-4 hours ✅ **PHASE COMPLETE**

---

## Phase 7: Documentation & Polish

**Goal:** Document architecture and clean up code

- [x] 7.1 Update README.md
  - [x] Add architecture overview
  - [x] Document new build process
  - [x] Update development instructions
- [x] 7.2 Create ARCHITECTURE.md
  - [x] Document folder structure
  - [x] Explain message flow
  - [x] Component responsibilities
- [x] 7.3 Add JSDoc comments
  - [x] Document all public APIs
  - [x] Add examples for complex functions
- [x] 7.4 Update CLAUDE.md
  - [x] New build commands
  - [x] New file structure
  - [x] Development workflow
- [x] 7.5 Clean up debug logging
  - [x] Remove verbose logs
  - [x] Keep only essential logs
- [x] 7.6 Code review and cleanup
  - [x] Remove dead code
  - [x] Fix linting issues
  - [x] Standardize naming conventions

**Estimated Time:** 2-3 hours ✅ **PHASE COMPLETE**

---

## Phase 8: Production Ready

**Goal:** Prepare for release

- [x] 8.1 Optimize build output
  - [x] Minification (esbuild)
  - [x] Tree shaking (automatic)
  - [x] Source maps disabled for production
- [x] 8.2 Test in production mode
  - [x] Build production bundle
  - [x] Test all functionality
  - [x] Verify no console errors
- [x] 8.3 Set DEBUG_MODE = false
- [x] 8.4 Update version in manifest.json (v2.0.0)
- [x] 8.5 Create release notes
- [x] 8.6 Final validation
  - [x] Run all tests (186 passing)
  - [x] Extension validator (Chrome-relevant checks pass)
  - [x] Manual testing checklist

**Estimated Time:** 1-2 hours ✅ **PHASE COMPLETE**

---

## Total Estimated Time: 20-28 hours

## Priority Order

If time is limited, phases should be completed in this order:

1. **Phase 1** (Infrastructure) - Foundation for everything else
2. **Phase 3** (Modular Architecture) - Biggest maintainability win
3. **Phase 4** (Styles & Assets) - Clean up inline styles
4. **Phase 2** (TypeScript) - Type safety and documentation
5. **Phase 5** (Error Handling) - Production reliability
6. **Phase 7** (Documentation) - Knowledge preservation
7. **Phase 6** (Testing) - Regression prevention
8. **Phase 8** (Production) - Final polish

## Success Criteria

- [x] Extension builds with zero TypeScript errors ✅
- [x] All tests pass (186 tests) ✅
- [x] Extension loads and functions identically to current version ✅
- [x] Code is modular and easily maintainable ✅
- [x] No inline styles (all CSS externalized) ✅
- [x] Comprehensive documentation (ARCHITECTURE.md, README.md, CLAUDE.md) ✅
- [x] Clean separation of concerns (background/content/iframe/shared) ✅
- [x] Type-safe throughout (strict TypeScript mode) ✅

---

## ✅ REFACTOR COMPLETE

All 8 phases completed successfully. The Libby Downloader Chrome extension has been fully modernized with TypeScript, comprehensive testing, and production-ready builds.

**Final Stats:**
- **Version**: 2.0.0
- **Tests**: 186 passing (15 test suites)
- **Build Size**: 20.02 kB total (9.99 kB content + 3.81 kB background + 2.68 kB iframe-ui + 2.76 kB iframe-extractor + 0.59 kB CSS + 0.19 kB assets)
- **TypeScript Errors**: 0
- **Lint Warnings**: 63 (all in test files with expected `any` types)
- **Code Coverage**: Focus on pure utilities and services
- **Documentation**: Complete (README, ARCHITECTURE, CLAUDE, JSDoc)
- **DEBUG_MODE**: false (production ready)

**Key Achievements:**
1. Full TypeScript migration with strict type checking
2. Modular architecture with clear separation of concerns
3. Vite build system for fast compilation and optimization
4. Centralized logging with DEBUG_MODE support
5. Custom error classes for type-safe error handling
6. Comprehensive test suite (Jest + jsdom)
7. Complete documentation overhaul
8. Production-ready build with minification and tree shaking

**Ready for Release:** Extension is production-ready and can be loaded into Chrome for testing and distribution.

---

## Notes

- Keep commits small and focused on single tasks
- Test after each phase before moving to next
- Can pause and resume at any phase boundary
- DEBUG_MODE flag remains functional throughout refactor
