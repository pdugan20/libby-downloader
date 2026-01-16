# Libby Downloader - Production Readiness Refactoring

**Status:** 🟡 In Progress
**Started:** 2026-01-16
**Target Completion:** TBD

## Overview

This document tracks the refactoring effort to transform libby-downloader from a functional CLI tool into a production-ready, scalable application with proper error handling, testing, and architectural patterns.

## Progress Summary

- **Total Phases:** 5
- **Completed Phases:** 2 (Phase 1 ✅, Phase 2 ✅)
- **Total Tasks:** 15
- **Completed Tasks:** 8 (Phase 1: 5 tasks, Phase 2: 3 tasks)
- **Overall Progress:** 40% (2 of 5 phases complete)

---

## Phase 1: Core Architecture & Error Handling (Critical) ✅

**Priority:** Critical
**Status:** ✅ Complete
**Estimated Effort:** High
**Completion Date:** 2026-01-16

### Tasks

#### 1.1 Create Download Orchestrator ✅

**File:** `src/core/orchestrator.ts`

**Goal:** Extract 145-line download logic from cli.ts into reusable class

**Subtasks:**
- [x] Create `DownloadOrchestrator` class
- [x] Move download flow from cli.ts
- [x] Add dependency injection
- [x] Return structured results (not process.exit)
- [x] Update cli.ts to use orchestrator
- [ ] Add unit tests

**Files to Modify:**
- Create: `src/core/orchestrator.ts` ✅
- Modify: `src/cli.ts` ✅
- Create: `src/core/__tests__/orchestrator.test.ts` ⬜

**Results:**
- Reduced download command from 145 lines to 45 lines (68% reduction)
- Extracted reusable `DownloadOrchestrator` class
- Added factory method for easy instantiation
- Added proper cleanup method
- Returns structured `DownloadResult` instead of process.exit

---

#### 1.2 Create Custom Error Classes ✅

**File:** `src/core/errors.ts`

**Goal:** Replace generic errors with typed, actionable error classes

**Subtasks:**
- [x] Create error hierarchy
  - `LibbyError` (base)
  - `AuthenticationError`
  - `ValidationError`
  - `DownloadError`
  - `FFmpegError`
  - `NetworkError`
  - `ExtractionError`
  - `RateLimitError`
- [x] Add error codes (enum with 20+ error codes)
- [x] Add recovery hints
- [x] Update orchestrator to use custom errors
- [ ] Update all other service files
- [ ] Create tests

**Files to Modify:**
- Create: `src/core/errors.ts` ✅
- Modify: `src/core/orchestrator.ts` ✅
- Modify: All service files (auth, api, downloader, processor, embedder) ⬜
- Create: `src/core/__tests__/errors.test.ts` ⬜

**Results:**
- Created comprehensive error hierarchy with 7 error types
- Added 20+ typed error codes organized by category
- Each error includes recovery hints
- Added helper functions: wrapError(), isRetryableError()
- Orchestrator now throws typed errors instead of generic Error

---

#### 1.3 Replace process.exit() Calls ✅

**Goal:** Remove all 9 process.exit() calls, throw errors instead

**Subtasks:**
- [x] Create centralized error handler (handleCliError)
- [x] Replace inline process.exit(1) with throw statements
- [x] Update all CLI commands to use handleCliError
- [x] Display recovery hints for custom errors
- [x] Proper cleanup before exit

**Files to Modify:**
- Modify: `src/cli.ts` ✅

**Results:**
- Reduced from 9 process.exit() calls to 1 centralized call
- Created handleCliError() function that:
  - Shows custom error messages with recovery hints
  - Handles LibbyError instances specially
  - Falls back to logger for unknown errors
- All CLI commands now throw proper errors instead of direct exit
- Orchestrator already returns DownloadResult (no process.exit)
- Code is now library-friendly (orchestrator can be imported and used)

---

#### 1.4 Add Retry Logic with Exponential Backoff ✅

**File:** `src/utils/retry.ts`

**Goal:** Gracefully handle transient failures

**Subtasks:**
- [x] Create `retry()` utility function
- [x] Add exponential backoff
- [x] Add jitter to prevent thundering herd
- [x] Integrate into chapter-downloader.ts
- [x] Use isRetryableError() predicate
- [ ] Add retry configuration to stealth config
- [ ] Add unit tests

**Files to Modify:**
- Create: `src/utils/retry.ts` ✅
- Modify: `src/downloader/chapter-downloader.ts` ✅
- Modify: `config/stealth.json` ⬜
- Create: `src/utils/__tests__/retry.test.ts` ⬜

**Results:**
- Created comprehensive retry utility with 3 functions:
  - `retry()` - Main retry with exponential backoff
  - `retryIf()` - Retry with custom predicate
  - `retryWithTimeout()` - Retry with per-attempt timeout
- Exponential backoff: baseDelay * (multiplier ^ attempt)
- Jitter: +/- random variance to prevent thundering herd
- Configurable: maxAttempts, baseDelay, maxDelay, multiplier, jitter
- Integrated into chapter downloads (3 retries, 2-10s delays)
- Uses isRetryableError() to only retry network/timeout errors
- Automatic logging of retry attempts

---

#### 1.5 Implement Graceful Shutdown ✅

**Goal:** Clean up resources on SIGINT/SIGTERM

**Subtasks:**
- [x] Add signal handlers in cli.ts
- [x] Create cleanup registry
- [x] Close browser on shutdown
- [x] Register cleanup handlers in all commands
- [x] Add timeout for shutdown (max 10s)
- [ ] Save partial download state (deferred to Phase 4.1)

**Files to Modify:**
- Modify: `src/cli.ts` ✅
- Create: `src/core/cleanup.ts` ✅

**Results:**
- Created `CleanupRegistry` class in src/core/cleanup.ts
- Handles SIGINT (Ctrl+C), SIGTERM, uncaughtException, unhandledRejection
- 10-second timeout for cleanup operations (forces exit if exceeded)
- Runs all cleanup handlers in parallel for fast shutdown
- Installed signal handlers at app start via installSignalHandlers()
- Registered cleanup handlers in all CLI commands:
  - login: browserManager.close()
  - list: browserManager.close()
  - download: orchestrator.cleanup()
  - logout: browserManager.close()
- Graceful shutdown now closes browser and cleans up resources properly
- Can be safely interrupted with Ctrl+C during long downloads

---

## Phase 2: Configuration & Validation ✅

**Priority:** High
**Status:** ✅ Complete
**Estimated Effort:** Medium
**Completion Date:** 2026-01-16

### Tasks

#### 2.1 Create Centralized Config Class ✅

**File:** `src/core/config.ts`

**Goal:** Single source of truth for all configuration

**Subtasks:**
- [x] Create `Config` class
- [x] Support multiple config sources (CLI > env > file > defaults)
- [x] Add config validation with Zod
- [x] Load .env file
- [x] Add config schema
- [ ] Add unit tests (deferred)
- [ ] Migrate existing code to use centralized config (Phase 2 follow-up)

**Files to Modify:**
- Create: `src/core/config.ts` ✅
- Create: `.env.example` ✅
- Modify: All files that read config (pending - Phase 2 follow-up)
- Create: `src/core/__tests__/config.test.ts` ⬜

**Results:**
- Created Config singleton class with Zod schemas for validation
- Supports configuration from multiple sources with priority:
  1. CLI arguments (highest priority)
  2. Environment variables
  3. Config files (.env, stealth.json)
  4. Defaults (lowest priority)
- Configuration sections:
  - `session`: cookies path, user data dir, headless mode
  - `download`: output dir, temp dir, merge/metadata options
  - `browser`: headless, timeout, user data dir
  - `logging`: level, verbose mode
  - `stealth`: mode configurations from stealth.json
- All configs validated with Zod schemas
- Helpful error messages with ValidationError when config is invalid
- Created .env.example documenting all environment variables
- Installed dependencies: zod, dotenv

---

#### 2.2 Add Input Validation ✅

**File:** `src/utils/validator.ts`

**Goal:** Validate all user inputs

**Subtasks:**
- [x] Create validation utilities
- [x] Validate book IDs (alphanumeric + hyphens only)
- [x] Validate file paths
- [x] Validate mode enum
- [x] Validate output directory writability
- [x] Add unit tests

**Files to Modify:**
- Create: `src/utils/validator.ts` ✅
- Modify: `src/cli.ts` ✅
- Create: `src/utils/__tests__/validator.test.ts` ✅

**Results:**
- Created comprehensive validation utilities in src/utils/validator.ts
- Validation functions:
  - `validateBookId()`: Checks format (alphanumeric + hyphens), length (3-100 chars)
  - `validateMode()`: Type guard for safe/balanced/aggressive
  - `validateFilePath()`: Prevents path injection (null bytes, `..` traversal)
  - `validateOutputDirectory()`: Async check for directory existence and writability
  - `validateOutputDirectorySync()`: Sync version for CLI startup
  - `validateDownloadInputs()`: Validates all download command inputs
  - `sanitizeInput()`: Trims whitespace from user input
- Integrated validation into cli.ts download command
  - Sanitizes and validates all inputs before creating orchestrator
  - Uses sanitized bookId and mode throughout
- All validators throw ValidationError with appropriate error codes
- Created comprehensive test suite (22 tests, all passing)
- Security features:
  - Rejects path traversal attempts (`../../../etc/passwd`)
  - Rejects null byte injection (`path\0`)
  - Validates parent directory writability when target doesn't exist

---

#### 2.3 Add Config File Validation ✅

**Goal:** Validate stealth.json at load time

**Subtasks:**
- [x] Add Zod schema for stealth config
- [x] Validate on load in rate-limiter.ts
- [x] Provide helpful error messages for invalid config
- [ ] Add unit tests (deferred - covered by config tests)

**Files to Modify:**
- Modify: `src/utils/rate-limiter.ts` ✅
- Note: Schemas in `src/core/config.ts` (already created in Phase 2.1)

**Results:**
- Zod schemas for stealth config already created in Phase 2.1
  - StealthModeConfigSchema: Validates each mode (safe/balanced/aggressive)
  - StealthConfigFileSchema: Validates entire config file structure
  - Validates delays, breaks, mouse movements, scrolling, max books per hour
- Updated rate-limiter.ts to use centralized Config
  - Removed direct import of stealth.json
  - Now loads config via getConfig().getStealthMode(mode)
  - Automatically gets validated config from Config singleton
- Config class provides helpful error messages on validation failure
  - Lists all validation errors with path and message
  - Throws ValidationError with INVALID_CONFIG code
- Stealth config is now validated once at app startup
  - Earlier detection of config errors
  - Consistent config across all components

---

## Phase 3: Type Safety & Code Quality 🟢

**Priority:** Medium
**Status:** ⬜ Not Started
**Estimated Effort:** Medium

### Tasks

#### 3.1 Standardize File System Imports ⬜

**Goal:** Consistent fs import pattern across codebase

**Subtasks:**
- [ ] Change all to: `import { promises as fs, existsSync } from 'fs'`
- [ ] Remove dynamic `await import('fs/promises')`
- [ ] Update all 10+ files with fs imports
- [ ] Verify builds

**Files to Modify:**
- Modify: `src/cli.ts`, `src/auth/libby-auth.ts`, `src/browser/manager.ts`, `src/downloader/chapter-downloader.ts`, `src/metadata/embedder.ts`, `src/processor/ffmpeg-processor.ts`, `src/utils/fs.ts`

---

#### 3.2 Remove Type Safety Violations ⬜

**Goal:** Remove all `any` casts, add proper getters

**Subtasks:**
- [ ] Add `getConfig()` to BrowserManager
- [ ] Remove `(this.browserManager as any).config.cookiesPath` cast
- [ ] Fix all TypeScript any violations (non-browser context)
- [ ] Run strict type checking

**Files to Modify:**
- Modify: `src/browser/manager.ts`
- Modify: `src/auth/libby-auth.ts`

---

#### 3.3 Create Error Handling Decorator ⬜

**File:** `src/utils/decorators.ts`

**Goal:** Reduce 54 duplicate try/catch blocks

**Subtasks:**
- [ ] Create `@LogErrors` decorator
- [ ] Create `@RetryOnError` decorator
- [ ] Apply to service methods
- [ ] Add unit tests

**Files to Modify:**
- Create: `src/utils/decorators.ts`
- Modify: Service files (apply decorators)

---

## Phase 4: State Management & Resilience 🟢

**Priority:** Medium
**Status:** ⬜ Not Started
**Estimated Effort:** Medium

### Tasks

#### 4.1 Implement Download State Persistence ⬜

**File:** `src/core/state-manager.ts`

**Goal:** Enable resume functionality

**Subtasks:**
- [ ] Create `StateManager` class
- [ ] Save state after each chapter download
- [ ] Load state on startup
- [ ] Wire up to existing `resumeDownload()` method
- [ ] Add CLI flag `--resume`
- [ ] Add unit tests

**Files to Modify:**
- Create: `src/core/state-manager.ts`
- Modify: `src/downloader/chapter-downloader.ts`
- Modify: `src/cli.ts`
- Create: `src/core/__tests__/state-manager.test.ts`

---

#### 4.2 Replace Callbacks with Event Emitters ⬜

**Goal:** Better progress tracking and extensibility

**Subtasks:**
- [ ] Extend `ChapterDownloader` from EventEmitter
- [ ] Add events: chapter:start, chapter:complete, chapter:error, break:start, break:end
- [ ] Replace onProgress callback
- [ ] Update cli.ts to listen to events
- [ ] Add unit tests

**Files to Modify:**
- Modify: `src/downloader/chapter-downloader.ts`
- Modify: `src/cli.ts`
- Modify: `src/core/orchestrator.ts`

---

#### 4.3 Add Environment-Based Logging ⬜

**Goal:** Control log levels via config

**Subtasks:**
- [ ] Read LOG_LEVEL from environment
- [ ] Default to 'info' in production
- [ ] Add to Config class
- [ ] Update logger initialization
- [ ] Update README with LOG_LEVEL docs

**Files to Modify:**
- Modify: `src/utils/logger.ts`
- Modify: `src/core/config.ts`
- Modify: `README.md`

---

## Phase 5: Testing & Project Structure 🟢

**Priority:** Low
**Status:** ⬜ Not Started
**Estimated Effort:** High

### Tasks

#### 5.1 Reorganize Project Structure ⬜

**Goal:** Clearer separation of concerns

**Subtasks:**
- [ ] Create `src/core/` directory
- [ ] Create `src/services/` directory
- [ ] Rename files:
  - `libby-auth.ts` → `services/auth.service.ts`
  - `libby-api.ts` → `services/api.service.ts`
  - `chapter-downloader.ts` → `services/download.service.ts`
  - `ffmpeg-processor.ts` → `services/ffmpeg.service.ts`
  - `embedder.ts` → `services/metadata.service.ts`
- [ ] Update all imports
- [ ] Update tsconfig paths if needed

**Files to Modify:**
- Rename: 5 service files
- Modify: All files with imports
- Modify: `tsconfig.json`

---

#### 5.2 Add Critical Unit Tests ⬜

**Goal:** Increase test coverage from ~5% to 60%+

**Subtasks:**
- [ ] Test `libby-api.ts` - BIF extraction, chapter URL building
- [ ] Test `rate-limiter.ts` - timing, breaks, limits
- [ ] Test `chapter-downloader.ts` - download flow (mocked)
- [ ] Test `orchestrator.ts` - end-to-end flow (mocked)
- [ ] Test error handling and retry logic
- [ ] Update coverage thresholds in jest.config.js

**Files to Create:**
- `src/services/__tests__/api.service.test.ts`
- `src/services/__tests__/download.service.test.ts`
- `src/utils/__tests__/rate-limiter.test.ts`
- `src/core/__tests__/orchestrator.test.ts`

**Files to Modify:**
- Modify: `jest.config.js` (increase coverage thresholds)

---

#### 5.3 Add Integration Tests ⬜

**Goal:** Test real flows without hitting Libby servers

**Subtasks:**
- [ ] Mock Puppeteer browser
- [ ] Mock Libby pages with realistic BIF data
- [ ] Test login flow
- [ ] Test book listing
- [ ] Test chapter extraction
- [ ] Test download orchestration

**Files to Create:**
- `src/__tests__/integration/login.test.ts`
- `src/__tests__/integration/download.test.ts`
- `src/__tests__/fixtures/mock-bif-data.json`

---

#### 5.4 Create Programmatic API (index.ts) ⬜

**File:** `src/index.ts`

**Goal:** Enable library usage

**Subtasks:**
- [ ] Export main classes
- [ ] Export types
- [ ] Export utilities
- [ ] Add JSDoc documentation
- [ ] Create usage examples in README
- [ ] Add "Usage as Library" section to README

**Files to Modify:**
- Modify: `src/index.ts`
- Modify: `README.md`
- Create: `examples/programmatic-usage.ts`

---

#### 5.5 Add Dependency Injection Container ⬜

**File:** `src/core/container.ts`

**Goal:** Proper DI for testability

**Subtasks:**
- [ ] Choose DI library (tsyringe or InversifyJS)
- [ ] Create container
- [ ] Register all services
- [ ] Update orchestrator to use DI
- [ ] Update tests to use container

**Files to Modify:**
- Create: `src/core/container.ts`
- Modify: All service files
- Modify: `src/cli.ts`

---

## Metrics

### Code Quality Metrics

| Metric | Before | Target | Current |
|--------|--------|--------|---------|
| Test Coverage | ~5% | 60%+ | ~5% |
| Lines of Code | 2,064 | ~2,500 | 2,064 |
| Cyclomatic Complexity (cli.ts) | High | Low | High |
| process.exit() calls | 9 | 0 | 9 |
| try/catch blocks | 54 | ~20 | 54 |
| Type safety violations | ~10 | 0 | ~10 |

### Architecture Metrics

| Metric | Before | Target | Current |
|--------|--------|--------|---------|
| Separation of Concerns | Poor | Good | Poor |
| Reusability (Library API) | No | Yes | No |
| Error Recovery | None | Full | None |
| State Persistence | No | Yes | No |
| Config Management | Fragmented | Centralized | Fragmented |

---

## Testing Strategy

### Unit Tests (Target: 60% coverage)
- ✅ Utils (delay, fs) - Already done
- ⬜ API service (BIF extraction, URL building)
- ⬜ Rate limiter (timing, breaks)
- ⬜ Download service (orchestration)
- ⬜ Retry logic
- ⬜ Config validation
- ⬜ Error classes

### Integration Tests (Target: 5 scenarios)
- ⬜ Login flow (mocked browser)
- ⬜ List books (mocked API)
- ⬜ Download book (mocked network)
- ⬜ Resume download
- ⬜ Error recovery

### E2E Tests (Target: 1 scenario)
- ⬜ Full download flow with test account (manual)

---

## Risk Assessment

### High Risk Changes
- **Phase 1.1:** Orchestrator extraction (breaking changes to internal API)
- **Phase 5.1:** Project restructure (many import changes)
- **Phase 5.5:** DI container (architectural shift)

### Low Risk Changes
- **Phase 2.2:** Input validation (additive)
- **Phase 3.1:** FS import standardization (mechanical)
- **Phase 4.3:** Environment logging (configuration)

### Mitigation Strategy
1. Complete each phase fully before moving to next
2. Run full test suite after each task
3. Commit after each completed task
4. Tag releases for rollback capability
5. Test CLI commands manually after Phase 1

---

## Success Criteria

### Phase 1 Complete When:
- ✅ All process.exit() removed
- ✅ Orchestrator class implemented
- ✅ Custom errors throughout
- ✅ Retry logic working
- ✅ Graceful shutdown implemented
- ✅ All tests passing
- ✅ CLI still functional

### Phase 2 Complete When:
- ✅ Config class implemented
- ✅ All inputs validated
- ✅ Config file validated
- ✅ .env support added
- ✅ All tests passing

### Phase 3 Complete When:
- ✅ No type safety violations
- ✅ Consistent fs imports
- ✅ Error decorator implemented
- ✅ All tests passing

### Phase 4 Complete When:
- ✅ State persistence working
- ✅ Resume functionality working
- ✅ Event system implemented
- ✅ Environment logging working
- ✅ All tests passing

### Phase 5 Complete When:
- ✅ Project restructured
- ✅ Test coverage >60%
- ✅ Integration tests passing
- ✅ Programmatic API documented
- ✅ DI container implemented
- ✅ All tests passing

### Overall Complete When:
- ✅ All 5 phases complete
- ✅ Test coverage >60%
- ✅ Zero TypeScript errors
- ✅ Zero ESLint errors
- ✅ CI passing
- ✅ README updated
- ✅ CLAUDE.md updated
- ✅ Version bumped to 2.0.0

---

## Notes

- Keep existing functionality working throughout refactor
- Commit after each completed task
- Update this document as we progress
- Mark tasks with ✅ when complete
- Add notes section for each phase with learnings/issues

---

## Change Log

### 2026-01-16
- Created refactoring plan
- Organized into 5 phases
- Defined 15 major tasks
- Established success criteria
