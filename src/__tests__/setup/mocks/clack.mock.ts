/**
 * Mock implementation of @clack/prompts for testing
 */

const mockSpinner = {
  start: jest.fn(),
  stop: jest.fn(),
  message: jest.fn(),
};

export const intro = jest.fn();
export const outro = jest.fn();
export const select = jest.fn();
export const confirm = jest.fn();
export const text = jest.fn();
export const spinner = jest.fn(() => mockSpinner);
export const isCancel = jest.fn(() => false);
export const note = jest.fn();
export const log = {
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  step: jest.fn(),
  message: jest.fn(),
};
