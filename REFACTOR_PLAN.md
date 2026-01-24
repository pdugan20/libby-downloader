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
- [ ] 2.2 Convert iframe extractor to TypeScript
  - [ ] Rename `iframe-extractor.js` to `iframe-extractor.ts`
  - [ ] Add proper types for BIF object
  - [ ] Add types for crypto parameters
  - [ ] Type message payloads
- [ ] 2.3 Convert iframe UI to TypeScript
  - [ ] Rename `iframe-ui.js` to `iframe-ui.ts`
  - [ ] Type DOM manipulation code
  - [ ] Type message handlers
- [ ] 2.4 Convert content script to TypeScript
  - [ ] Rename `content.js` to `content.ts`
  - [ ] Extract classes to separate files
  - [ ] Add proper types for all methods
- [ ] 2.5 Convert background script to TypeScript
  - [ ] Rename `background.js` to `background.ts`
  - [ ] Type download handlers
  - [ ] Type message handlers
- [ ] 2.6 Update manifest.json to reference compiled JS
- [ ] 2.7 Fix all TypeScript errors and verify builds

**Estimated Time:** 3-4 hours

---

## Phase 3: Modular Architecture

**Goal:** Break monolithic files into focused, reusable modules

### 3.1 Shared Resources

- [ ] 3.1.1 Create `src/shared/constants.ts`
  - [ ] Move message type constants
  - [ ] Move timeout constants
  - [ ] Move UI config constants
  - [ ] Export DEBUG_MODE flag
- [ ] 3.1.2 Create `src/shared/validators.ts`
  - [ ] Extract `validateOrigin` function
  - [ ] Extract `validateBookData` function
  - [ ] Add JSDoc documentation
- [ ] 3.1.3 Create `src/shared/logger.ts`
  - [ ] Centralized logging utility
  - [ ] Support for different log levels
  - [ ] Consistent log format with [Libby Downloader] prefix

### 3.2 Content Script Refactor

- [ ] 3.2.1 Create `src/content/ui-manager.ts`
  - [ ] Extract UIManager class
  - [ ] Add proper types for all methods
  - [ ] Document public API
- [ ] 3.2.2 Create `src/content/message-handler.ts`
  - [ ] Extract MessageHandler class
  - [ ] Type all message payloads
  - [ ] Document message flow
- [ ] 3.2.3 Create `src/content/index.ts`
  - [ ] Main entry point
  - [ ] Initialization logic only
  - [ ] Import and compose components
- [ ] 3.2.4 Remove old monolithic `content.js`

### 3.3 Iframe Scripts Refactor

- [ ] 3.3.1 Create `src/iframe/extractor.ts`
  - [ ] Clean up extraction logic
  - [ ] Move to src directory structure
  - [ ] Add error handling
- [ ] 3.3.2 Create `src/iframe/ui-injector.ts`
  - [ ] Extract button injection logic
  - [ ] Add proper DOM manipulation types
  - [ ] Document injection strategy
- [ ] 3.3.3 Create `src/iframe/index.ts`
  - [ ] Combine extractor and UI as separate concerns
  - [ ] Proper initialization order

### 3.4 Background Script Refactor

- [ ] 3.4.1 Create `src/background/download-manager.ts`
  - [ ] Extract download orchestration logic
  - [ ] Type download state
  - [ ] Add retry logic
- [ ] 3.4.2 Create `src/background/message-router.ts`
  - [ ] Route messages to appropriate handlers
  - [ ] Type-safe message routing
- [ ] 3.4.3 Create `src/background/index.ts`
  - [ ] Main service worker entry point
  - [ ] Initialize all handlers

**Estimated Time:** 4-5 hours

---

## Phase 4: Centralized Styles & Assets

**Goal:** Remove inline styles and centralize visual resources

- [ ] 4.1 Create `src/styles/` directory structure
- [ ] 4.2 Create `src/styles/iframe-ui.css`
  - [ ] Extract button styles
  - [ ] Extract animation keyframes
  - [ ] Use CSS variables for theming
- [ ] 4.3 Create `src/styles/notifications.css`
  - [ ] Extract notification styles
  - [ ] Extract slide animations
- [ ] 4.4 Create `src/assets/icons/` directory
- [ ] 4.5 Move SVG icons to separate files
  - [ ] `download.svg` - main download icon
  - [ ] `spinner.svg` - loading spinner
  - [ ] `checkmark.svg` - success icon
  - [ ] `error.svg` - error icon
- [ ] 4.6 Create icon loader utility
  - [ ] `src/shared/icon-loader.ts`
  - [ ] Load SVG as strings
  - [ ] Type-safe icon names
- [ ] 4.7 Update components to use external styles
- [ ] 4.8 Update manifest.json to inject CSS files

**Estimated Time:** 2-3 hours

---

## Phase 5: Enhanced Error Handling & Logging

**Goal:** Implement robust error handling and debugging

- [ ] 5.1 Create error types
  - [ ] `src/types/errors.ts`
  - [ ] Custom error classes for different failure modes
- [ ] 5.2 Enhance logger utility
  - [ ] Add log levels (DEBUG, INFO, WARN, ERROR)
  - [ ] Respect DEBUG_MODE flag
  - [ ] Add structured logging support
- [ ] 5.3 Add error boundaries
  - [ ] Try/catch in all async operations
  - [ ] Graceful degradation
  - [ ] User-friendly error messages
- [ ] 5.4 Add telemetry (optional)
  - [ ] Track success/failure rates
  - [ ] Performance metrics
  - [ ] No PII collection

**Estimated Time:** 2 hours

---

## Phase 6: Testing Infrastructure

**Goal:** Add basic testing to prevent regressions

- [ ] 6.1 Setup testing framework
  - [ ] Install Jest or Vitest
  - [ ] Configure for TypeScript
  - [ ] Setup Chrome API mocks
- [ ] 6.2 Write utility tests
  - [ ] Test validators
  - [ ] Test message routing
  - [ ] Test data transformations
- [ ] 6.3 Write integration tests
  - [ ] Test message flow between scripts
  - [ ] Test download orchestration
- [ ] 6.4 Add test scripts to package.json
- [ ] 6.5 Update pre-push hook to run tests

**Estimated Time:** 3-4 hours

---

## Phase 7: Documentation & Polish

**Goal:** Document architecture and clean up code

- [ ] 7.1 Update README.md
  - [ ] Add architecture overview
  - [ ] Document new build process
  - [ ] Update development instructions
- [ ] 7.2 Create ARCHITECTURE.md
  - [ ] Document folder structure
  - [ ] Explain message flow
  - [ ] Component responsibilities
- [ ] 7.3 Add JSDoc comments
  - [ ] Document all public APIs
  - [ ] Add examples for complex functions
- [ ] 7.4 Update CLAUDE.md
  - [ ] New build commands
  - [ ] New file structure
  - [ ] Development workflow
- [ ] 7.5 Clean up debug logging
  - [ ] Remove verbose logs
  - [ ] Keep only essential logs
- [ ] 7.6 Code review and cleanup
  - [ ] Remove dead code
  - [ ] Fix linting issues
  - [ ] Standardize naming conventions

**Estimated Time:** 2-3 hours

---

## Phase 8: Production Ready

**Goal:** Prepare for release

- [ ] 8.1 Optimize build output
  - [ ] Minification
  - [ ] Tree shaking
  - [ ] Source maps for debugging
- [ ] 8.2 Test in production mode
  - [ ] Build production bundle
  - [ ] Test all functionality
  - [ ] Verify no console errors
- [ ] 8.3 Set DEBUG_MODE = false
- [ ] 8.4 Update version in manifest.json
- [ ] 8.5 Create release notes
- [ ] 8.6 Final validation
  - [ ] Run all tests
  - [ ] Extension validator
  - [ ] Manual testing checklist

**Estimated Time:** 1-2 hours

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

- [ ] Extension builds with zero TypeScript errors
- [ ] All tests pass
- [ ] Extension loads and functions identically to current version
- [ ] Code is modular and easily maintainable
- [ ] No inline styles (all CSS externalized)
- [ ] Comprehensive documentation
- [ ] Clean separation of concerns
- [ ] Type-safe throughout

---

## Notes

- Keep commits small and focused on single tasks
- Test after each phase before moving to next
- Can pause and resume at any phase boundary
- DEBUG_MODE flag remains functional throughout refactor
