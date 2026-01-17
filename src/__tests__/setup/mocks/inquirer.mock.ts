/**
 * Mock implementation of inquirer for testing
 */

export const createInquirerMock = () => {
  const promptMock = jest.fn();

  return {
    prompt: promptMock,
    Separator: class Separator {
      constructor(public line?: string) {}
    },
    // Helper to set up prompt responses
    mockPromptResponse: (responses: Record<string, any>) => {
      promptMock.mockResolvedValue(responses);
    },
    // Helper to set up sequence of responses
    mockPromptSequence: (...responses: Record<string, any>[]) => {
      responses.forEach((response) => {
        promptMock.mockResolvedValueOnce(response);
      });
    },
  };
};

// Export default mock
export default createInquirerMock();
