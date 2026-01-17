/**
 * Mock implementation of node-id3 for testing
 */

interface ID3Tags {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  comment?: any;
  trackNumber?: string;
  performerInfo?: string;
  image?: any;
}

export const createNodeID3Mock = () => {
  const writeMock = jest.fn().mockReturnValue(true);
  const readMock = jest.fn().mockReturnValue({});
  const removeTagsMock = jest.fn().mockReturnValue(true);

  return {
    write: writeMock,
    read: readMock,
    removeTags: removeTagsMock,
    // Helper to simulate write failure
    mockWriteFailure: () => {
      writeMock.mockReturnValueOnce(false);
    },
    // Helper to simulate read with tags
    mockReadTags: (tags: ID3Tags) => {
      readMock.mockReturnValueOnce(tags);
    },
    // Reset all mocks
    reset: () => {
      writeMock.mockClear().mockReturnValue(true);
      readMock.mockClear().mockReturnValue({});
      removeTagsMock.mockClear().mockReturnValue(true);
    },
  };
};

// Export default mock
export default createNodeID3Mock();
