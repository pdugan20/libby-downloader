# Architecture Documentation

This document describes the architecture of the Libby Downloader CLI and Chrome extension.

## Overview

The project consists of two main components:

1. **Chrome Extension** - Downloads audiobooks from Libby
2. **CLI Tool** - Tags MP3 files with metadata (optional)

Both components follow a clean architecture with separation of concerns, service layers, and comprehensive testing.

## CLI Architecture

The CLI uses a three-layer architecture:

### Service Layer (Business Logic)

**Purpose**: Encapsulate business logic and external dependencies

**Services:**

- **BookService** (`src/services/book-service.ts`)
  - Discovers books in the downloads folder
  - Analyzes book folders for status (tagged/untagged, merged/not merged)
  - Filters and searches books
  - Provides statistics
  - **Coverage**: 90%

- **MetadataService** (`src/services/metadata-service.ts`)
  - Unified metadata embedding for MP3 files
  - Merges functionality from old tag.ts and embedder.ts
  - Downloads cover art
  - Embeds ID3 tags (title, author, narrator, cover, track numbers)
  - **Coverage**: 96%

- **FileService** (`src/services/file-service.ts`)
  - File operations abstraction
  - Path utilities (downloads folder, sanitization)
  - Cross-platform path handling
  - **Coverage**: 100%

**Benefits:**

- Testable with mocked dependencies
- Reusable across commands
- Single source of truth for business logic
- No direct file system or external library calls in commands

### UI Layer (Presentation)

**Purpose**: Format data for display and provide reusable UI components

**Presenters:**

- **BookPresenter** (`src/ui/presenters/book-presenter.ts`)
  - Formats book titles (prefer metadata, fallback to folder name)
  - Formats authors, narrators, cover URLs
  - Creates display names with chapter counts
  - **Coverage**: 100%

- **StatusPresenter** (`src/ui/presenters/status-presenter.ts`)
  - Formats status indicators (tagged, merged, metadata)
  - Colorized status badges with checkmarks
  - **Coverage**: 100%

**Prompts:**

- **BookSelector** (`src/ui/prompts/book-selector.ts`)
  - Reusable book selection UI
  - Eliminated 120+ lines of duplication in interactive.ts
  - Supports filtering, "select all" option
  - Shows status indicators
  - **Coverage**: 94%

**Benefits:**

- Zero code duplication
- Consistent formatting across commands
- Easy to test with mock data
- Reusable UI components

### Command Layer (Orchestration)

**Purpose**: Orchestrate services and UI to fulfill user requests

**Commands:**

- **interactive.ts** - Interactive menu system
- **list.ts** - List all downloaded books
- **tag.ts** - Tag MP3 files with metadata

**Pattern:**

```typescript
// Command uses services for logic
const bookService = new BookService();
const books = await bookService.discoverBooks();

// Command uses presenters for display
const presenter = new BookPresenter();
console.log(presenter.getTitle(book));

// Command uses prompts for UI
const selector = new BookSelector();
const selected = await selector.selectBook(books, options);
```

**Benefits:**

- Commands are thin orchestrators
- No business logic in commands
- Easy to test with mocked services
- Clear separation of concerns

## Chrome Extension Architecture

The extension uses a modular architecture with ES modules:

### Content Script

**Files:**

- `chrome-extension/content/content.js` - Orchestrator (~60 lines)
- `chrome-extension/content/ui-manager.js` - Button and notification UI (~170 lines)
- `chrome-extension/content/message-handler.js` - Message routing with validation (~180 lines)

**Pattern:**

```javascript
// Orchestrator coordinates UI and messaging
const uiManager = new UIManager();
const messageHandler = new MessageHandler(uiManager);

uiManager.on('downloadRequested', () => {
  messageHandler.requestExtraction();
});
```

**Benefits:**

- Separation of UI from message handling
- Origin validation for security
- Easy to test each component independently

### Background Service Worker

**Files:**

- `chrome-extension/background/background.js` - Orchestrator
- `chrome-extension/background/download-service.js` - Download operations
- `chrome-extension/background/download-tracker.js` - Progress tracking
- `chrome-extension/background/metadata-writer.js` - Metadata file generation

**Pattern:**

```javascript
// Service handles download logic
const downloadService = new DownloadService(downloadTracker, metadataWriter);
await downloadService.startDownload(bookData);
```

**Benefits:**

- Sequential chapter downloads with rate limiting
- Progress tracking separated from download logic
- Metadata generation isolated

### Iframe Extractor

**Files:**

- `chrome-extension/iframe/iframe-extractor.js` - Extraction logic

**Purpose:**

- Runs in MAIN world to access page variables
- Extracts BIF object (book metadata)
- Hooks JSON.parse to capture crypto parameters
- Posts message to content script with data

### Shared Utilities

**Files:**

- `chrome-extension/shared/message-types.js` - Type-safe constants
- `chrome-extension/shared/validators.js` - Origin validation (security)

**Security:**

```javascript
// Prevents XSS attacks from malicious sites
function validateOrigin(origin) {
  if (origin === window.location.origin) return true;
  return VALID_ORIGINS.some((validOrigin) => origin === validOrigin);
}
```

**Benefits:**

- Eliminates 26+ hardcoded message type strings
- Secure postMessage validation
- Easy to audit security

## Data Flow

### Extension Download Flow

1. User clicks "Download Audiobook" button on Libby page
2. Content script requests extraction from iframe
3. Iframe extractor captures BIF object + crypto params
4. Iframe posts message back to content script (with origin validation)
5. Content script sends data to background service worker
6. Background service downloads chapters sequentially (500ms delay)
7. Background service tracks progress
8. Background service writes metadata.json
9. Content script shows completion notification

### CLI Tag Flow

1. User runs `libby tag` or selects "Tag MP3 files" in interactive mode
2. Command uses BookService to discover books
3. Command uses BookSelector to prompt user
4. Command uses MetadataService to embed tags
5. MetadataService reads metadata.json
6. MetadataService downloads cover art (if needed)
7. MetadataService embeds ID3 tags to each MP3 file
8. Command shows success message

## Testing Strategy

### Unit Tests

**Services** (Target: 80%+):

- Mock external dependencies (fs, NodeID3, child_process)
- Test all business logic paths
- Test error handling

**UI Components** (Target: 70%+):

- Mock inquirer for prompts
- Test data formatting in presenters
- Test filtering and selection logic

### Integration Tests

**Commands**:

- Mock services (not external dependencies)
- Test command orchestration
- Test user interaction flows

### Test Infrastructure

**Mocks:**

- `src/__tests__/setup/mocks/inquirer.mock.ts` - Mock interactive prompts
- `src/__tests__/setup/mocks/node-id3.mock.ts` - Mock ID3 tagging
- `src/__tests__/setup/mocks/fs.mock.ts` - Mock file system
- `src/__tests__/setup/mocks/chalk.mock.ts` - Mock terminal colors

**Fixtures:**

- `src/__tests__/setup/fixtures/books.fixture.ts` - Sample book data
- `src/__tests__/setup/fixtures/metadata.fixture.ts` - Sample metadata

## Code Metrics

**Lines of Code Reduction:**

- `tag.ts`: 170 → 36 lines (79% reduction)
- `interactive.ts`: 284 → 238 lines (16% reduction)
- Book selection duplication: 120 lines → 0 (eliminated)
- Total CLI: ~200 lines removed

**Test Coverage:**

- Overall: 80.23%
- Services: 93.39%
- UI Components: 97.22%
- Commands: 69.13%

**Test Count:**

- 119 passing tests
- 10 test suites
- ~140 test cases planned

## Design Principles

1. **Separation of Concerns** - Services for logic, presenters for display, commands for orchestration
2. **Single Responsibility** - Each class has one clear purpose
3. **Testability** - All external dependencies are mockable
4. **Reusability** - UI components and services are reusable across commands
5. **Security** - Origin validation, input validation, no hardcoded strings
6. **Type Safety** - TypeScript with strict mode, ES modules
7. **Zero Duplication** - Extract common patterns into reusable components

## Migration Path

The refactoring was done in phases to minimize risk:

**Phase 1**: Create new services alongside old code
**Phase 2**: Refactor commands to use new services
**Phase 3**: Refactor extension with modular architecture
**Phase 4**: Delete old files, fill coverage gaps, documentation

Each phase was committed separately with full test coverage.

## Future Improvements

- Merge functionality (combine chapters into single file)
- Additional metadata options (publisher, year, genre)
- Batch operations (tag all books)
- CLI progress bars for long operations
- Extension tests (currently manual testing only)
- Integration tests for full workflows
