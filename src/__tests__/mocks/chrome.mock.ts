/**
 * Mock Chrome APIs for testing
 */

export const mockChrome = {
  downloads: {
    download: jest.fn().mockResolvedValue(1),
    search: jest.fn().mockResolvedValue([
      {
        id: 1,
        state: 'complete',
        filename: '/path/to/file.mp3',
      },
    ]),
    onChanged: {
      addListener: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    sendMessage: jest.fn().mockResolvedValue({}),
  },
};

// Setup global chrome object for tests
(global as any).chrome = mockChrome;

export const resetChromeMocks = () => {
  mockChrome.downloads.download.mockClear();
  mockChrome.downloads.search.mockClear();
  mockChrome.runtime.sendMessage.mockClear();
  mockChrome.tabs.sendMessage.mockClear();
};
