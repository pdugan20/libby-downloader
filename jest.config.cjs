module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/setup/',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/cli.ts', // Main CLI entry point
    '!src/__tests__/**', // Exclude test files
    '!src/ui/ink/**', // Ink components tested via integration tests
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 25,
      statements: 25,
    },
  },
  moduleNameMapper: {
    '^chalk$': '<rootDir>/src/__tests__/setup/mocks/chalk.mock.ts',
    '^ink$': '<rootDir>/src/__tests__/setup/mocks/ink.mock.ts',
    '^ink-select-input$': '<rootDir>/src/__tests__/setup/mocks/ink.mock.ts',
    '^ink-spinner$': '<rootDir>/src/__tests__/setup/mocks/ink.mock.ts',
  },
};
