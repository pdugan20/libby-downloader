import { mergeBook } from '../../commands/merge';
import { MergeService } from '../../services/merge-service';

jest.mock('../../services/merge-service');

describe('mergeBook command', () => {
  let mockMergeService: jest.Mocked<MergeService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMergeService = new MergeService() as jest.Mocked<MergeService>;
    (MergeService as jest.MockedClass<typeof MergeService>).mockImplementation(
      () => mockMergeService
    );
  });

  it('should call MergeService.mergeFolder with correct path', async () => {
    mockMergeService.mergeFolder.mockResolvedValue('/test/book/Book.m4b');

    await mergeBook('/test/book-folder');

    expect(mockMergeService.mergeFolder).toHaveBeenCalledWith('/test/book-folder');
  });

  it('should handle errors from MergeService', async () => {
    mockMergeService.mergeFolder.mockRejectedValue(new Error('Failed to merge'));

    await expect(mergeBook('/test/book')).rejects.toThrow('Failed to merge');
  });
});
