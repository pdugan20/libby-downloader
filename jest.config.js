module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts', '**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/setup/',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/cli.ts', // Main CLI entry point
    '!src/__tests__/**', // Exclude test files
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
  },
};
