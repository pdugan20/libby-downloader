/**
 * Global Jest setup configuration
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Increase test timeout for slower operations
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
