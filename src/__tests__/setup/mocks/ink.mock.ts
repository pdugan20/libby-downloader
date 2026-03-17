/**
 * Mock implementation of ink and ink-* packages for testing
 */

export const render = jest.fn(() => ({
  unmount: jest.fn(),
  waitUntilExit: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn(),
}));

export const Box = 'div';
export const Text = 'span';
export const useApp = jest.fn(() => ({ exit: jest.fn() }));
export const useInput = jest.fn();
export const useStdin = jest.fn(() => ({ stdin: process.stdin, isRawModeSupported: false }));
export const useStdout = jest.fn(() => ({ stdout: process.stdout }));

// Default export for ink-select-input and ink-spinner
const MockComponent = () => null;
export default MockComponent;
