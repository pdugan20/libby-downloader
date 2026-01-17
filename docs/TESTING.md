# Testing Guide

This document explains how to write and run tests for the Libby Downloader project.

## Quick Start

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- book-service.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should discover books"
```

## Test Infrastructure

### Setup

Tests use Jest with TypeScript support. Configuration is in `jest.config.js`.

**Key settings:**

- Timeout: 10 seconds
- Coverage thresholds: 50% branches, 60% statements
- Test environment: Node.js
- Mocked modules: inquirer, node-id3, chalk

### Mocks

All external dependencies are mocked in `src/__tests__/setup/mocks/`:

**inquirer.mock.ts** - Mock interactive prompts:

```typescript
import inquirer from 'inquirer';

// Mock prompt responses
(inquirer.prompt as jest.Mock).mockResolvedValue({
  selectedBook: mockBook,
});
```

**node-id3.mock.ts** - Mock ID3 tagging:

```typescript
import * as NodeID3 from 'node-id3';

// Mock successful tag write
(NodeID3.write as any).mockReturnValue(true);
```

**fs.mock.ts** - Mock file system:

```typescript
import { promises as fs } from 'fs';

// Mock file read
(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(metadata));
```

**chalk.mock.ts** - Mock terminal colors:

```typescript
import chalk from 'chalk';

// All chalk methods return identity function
const identity = (str: string) => str;
```

### Fixtures

Sample data for tests is in `src/__tests__/setup/fixtures/`:

**books.fixture.ts** - Create mock books:

```typescript
import { createMockBookInfo, createMockBooks } from './fixtures/books.fixture';

// Create single book
const book = createMockBookInfo({ name: 'Test Book', isTagged: true });

// Create multiple books
const books = createMockBooks(5); // 5 books with varied status
```

**metadata.fixture.ts** - Create mock metadata:

```typescript
import { createMockMetadata } from './fixtures/metadata.fixture';

const metadata = createMockMetadata({
  title: 'Test Book',
  authors: ['Test Author'],
});
```

## Writing Tests

### Service Layer Tests

**Goal**: Test business logic with mocked dependencies

**Pattern:**

```typescript
import { BookService } from '../../../services/book-service';
import { promises as fs } from 'fs';
import { createMockBookInfo } from '../../setup/fixtures/books.fixture';

// Mock fs before importing service
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
  },
}));

describe('BookService', () => {
  let service: BookService;

  beforeEach(() => {
    service = new BookService();
    jest.clearAllMocks();
  });

  it('should discover books', async () => {
    // Arrange
    const mockFiles = [{ name: 'Book 1', isDirectory: () => true }];
    (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);

    // Act
    const books = await service.discoverBooks();

    // Assert
    expect(books).toHaveLength(1);
    expect(fs.readdir).toHaveBeenCalledWith(
      expect.stringContaining('libby-downloads'),
      { withFileTypes: true }
    );
  });
});
```

**Key points:**

- Mock all external dependencies (fs, NodeID3, child_process)
- Test all code paths (success, errors, edge cases)
- Use fixtures for sample data
- Clear mocks between tests

### UI Component Tests

**Goal**: Test presentation logic and user interactions

**Pattern:**

```typescript
import { BookSelector } from '../../../ui/prompts/book-selector';
import inquirer from 'inquirer';
import { createMockBooks } from '../../setup/fixtures/books.fixture';

describe('BookSelector', () => {
  let selector: BookSelector;

  beforeEach(() => {
    selector = new BookSelector();
    jest.clearAllMocks();
  });

  it('should select a book', async () => {
    // Arrange
    const books = createMockBooks(3);
    (inquirer.prompt as jest.Mock).mockResolvedValue({
      selectedBook: books[0],
    });

    // Act
    const result = await selector.selectBook(books, {
      message: 'Select a book',
    });

    // Assert
    expect(result).toEqual(books[0]);
    expect(inquirer.prompt).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'list',
          message: 'Select a book',
        }),
      ])
    );
  });
});
```

**Key points:**

- Mock inquirer for prompts
- Test filtering logic
- Test display formatting
- Verify correct prompts are shown

### Command Tests

**Goal**: Test command orchestration with mocked services

**Pattern:**

```typescript
import { tagFiles } from '../../../commands/tag';
import { MetadataService } from '../../../services/metadata-service';

// Mock the service
jest.mock('../../../services/metadata-service');

describe('tag command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should tag files in folder', async () => {
    // Arrange
    const mockEmbedToFolder = jest.fn().mockResolvedValue(undefined);
    (MetadataService as jest.Mock).mockImplementation(() => ({
      embedToFolder: mockEmbedToFolder,
    }));

    // Act
    await tagFiles('/test/path', { title: 'Test' });

    // Assert
    expect(mockEmbedToFolder).toHaveBeenCalledWith(
      '/test/path',
      expect.objectContaining({ title: 'Test' })
    );
  });
});
```

**Key points:**

- Mock services (not external dependencies)
- Test command orchestration
- Verify correct service methods are called
- Test option parsing

## Coverage Guidelines

### Target Coverage

| Layer | Target | Current |
|-------|--------|---------|
| Services | 80%+ | 93.39% |
| UI Components | 70%+ | 97.22% |
| Commands | 70%+ | 69.13% |
| Overall | 75%+ | 80.23% |

### What to Test

**Always test:**

- All public methods
- All error paths
- All conditional branches
- All user-facing features

**Don't test:**

- Third-party libraries
- Simple getters/setters
- Type definitions
- Mocks themselves

### Improving Coverage

**Find untested code:**

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

**Focus on:**

- Red lines in coverage report (uncovered)
- Yellow lines (partial coverage - test missing branches)
- Low function coverage percentages

## Common Patterns

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

### Testing Errors

```typescript
it('should throw error on invalid input', async () => {
  await expect(service.invalidMethod()).rejects.toThrow('Invalid input');
});

it('should handle errors gracefully', async () => {
  (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
  const result = await service.readConfig();
  expect(result).toBeNull();
});
```

### Testing File Operations

```typescript
it('should read file', async () => {
  const content = 'test content';
  (fs.readFile as jest.Mock).mockResolvedValue(content);

  const result = await service.readFile('/test/path');

  expect(result).toBe(content);
  expect(fs.readFile).toHaveBeenCalledWith('/test/path', 'utf-8');
});
```

### Testing User Prompts

```typescript
it('should prompt user for selection', async () => {
  const selectedBook = createMockBookInfo();
  (inquirer.prompt as jest.Mock).mockResolvedValue({
    selectedBook,
  });

  const result = await promptForBook();

  expect(result).toEqual(selectedBook);
  expect(inquirer.prompt).toHaveBeenCalled();
});
```

## Debugging Tests

### Enable Verbose Output

```bash
npm test -- --verbose
```

### Debug Specific Test

```bash
# Add to test file
it.only('should debug this test', () => {
  console.log('Debug output');
  // ...
});

# Or use --testNamePattern
npm test -- --testNamePattern="should debug this test"
```

### Inspect Mock Calls

```typescript
it('should call service', async () => {
  await service.method();

  // See all calls
  console.log((mockFunction as jest.Mock).mock.calls);

  // See call arguments
  expect(mockFunction).toHaveBeenCalledWith(
    expect.objectContaining({ id: 1 })
  );
});
```

## Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
it('should do something', async () => {
  // Arrange - Set up test data and mocks
  const input = 'test';
  (mockFunction as jest.Mock).mockResolvedValue('result');

  // Act - Execute the code under test
  const result = await service.method(input);

  // Assert - Verify the results
  expect(result).toBe('result');
});
```

### 2. Clear Test Names

```typescript
// Good - describes what is being tested
it('should return empty array when no books found', () => {});

// Bad - vague
it('should work', () => {});
```

### 3. One Assertion Per Test (Usually)

```typescript
// Good - focused on one behavior
it('should return book title', () => {
  expect(presenter.getTitle(book)).toBe('Test Book');
});

it('should return book authors', () => {
  expect(presenter.getAuthors(book)).toEqual(['Author 1']);
});

// Acceptable - testing one logical unit with multiple assertions
it('should format book for display', () => {
  const display = presenter.formatBook(book);
  expect(display).toContain(book.title);
  expect(display).toContain(book.author);
});
```

### 4. Isolate Tests

```typescript
describe('BookService', () => {
  let service: BookService;

  beforeEach(() => {
    // Create fresh instance for each test
    service = new BookService();
    // Clear all mocks
    jest.clearAllMocks();
  });

  // Tests here are isolated
});
```

### 5. Test Edge Cases

```typescript
describe('formatTimeAgo', () => {
  it('should handle just now', () => {
    expect(formatTimeAgo(new Date())).toBe('just now');
  });

  it('should handle minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatTimeAgo(date)).toBe('5 minutes ago');
  });

  it('should handle very old dates', () => {
    const date = new Date('2020-01-01');
    expect(formatTimeAgo(date)).toContain('1/1/2020');
  });
});
```

## Continuous Integration

Tests run automatically on:

- Pull requests
- Pushes to main branch
- Node.js versions: 18.x, 20.x, 22.x

**GitHub Actions workflow**: `.github/workflows/ci.yml`

**Pre-commit hook**: Runs linting and formatting (Husky)

**Pre-push hook**: Runs full `check-all` (typecheck + lint + format + test)

## Troubleshooting

### Mock Not Working

```typescript
// Make sure to mock BEFORE importing the module
jest.mock('fs');
import { promises as fs } from 'fs'; // Import after mock

// NOT like this:
import { promises as fs } from 'fs'; // Wrong - imports before mock
jest.mock('fs');
```

### TypeScript Errors in Tests

```typescript
// Cast mocks to any for methods that don't match exactly
(mockNodeID3.write as any).mockReturnValue(true);

// Or use jest.MockedFunction
import { mocked } from 'jest-mock';
const mockedReadFile = mocked(fs.readFile);
mockedReadFile.mockResolvedValue('content');
```

### Tests Timing Out

```typescript
// Increase timeout for slow tests
it('should handle slow operation', async () => {
  // ...
}, 30000); // 30 second timeout

// Or globally in jest.config.js
module.exports = {
  testTimeout: 30000,
};
```

### Coverage Not Updating

```bash
# Delete coverage cache
rm -rf coverage

# Run coverage again
npm run test:coverage
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TypeScript with Jest](https://jestjs.io/docs/getting-started#using-typescript)
- [Mocking with Jest](https://jestjs.io/docs/mock-functions)
