/**
 * Integration tests for tag command
 */

import { tagFiles } from '../../commands/tag';
import { MetadataService } from '../../services/metadata-service';

// Mock the MetadataService
jest.mock('../../services/metadata-service');

describe('tagFiles command', () => {
  let mockMetadataService: jest.Mocked<MetadataService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMetadataService = new MetadataService() as jest.Mocked<MetadataService>;
    (MetadataService as jest.MockedClass<typeof MetadataService>).mockImplementation(
      () => mockMetadataService
    );
  });

  it('should call MetadataService.embedToFolder with correct path', async () => {
    mockMetadataService.embedToFolder.mockResolvedValue();

    await tagFiles('/test/book-folder', {});

    expect(mockMetadataService.embedToFolder).toHaveBeenCalledWith('/test/book-folder', {
      title: undefined,
      author: undefined,
      narrator: undefined,
      coverUrl: undefined,
      description: undefined,
    });
  });

  it('should pass through all options to MetadataService', async () => {
    mockMetadataService.embedToFolder.mockResolvedValue();

    await tagFiles('/test/book', {
      title: 'Custom Title',
      author: 'Custom Author',
      narrator: 'Custom Narrator',
      coverUrl: 'https://example.com/cover.jpg',
      description: 'Custom description',
    });

    expect(mockMetadataService.embedToFolder).toHaveBeenCalledWith('/test/book', {
      title: 'Custom Title',
      author: 'Custom Author',
      narrator: 'Custom Narrator',
      coverUrl: 'https://example.com/cover.jpg',
      description: 'Custom description',
    });
  });

  it('should handle errors from MetadataService', async () => {
    mockMetadataService.embedToFolder.mockRejectedValue(new Error('Failed to tag'));

    await expect(tagFiles('/test/book', {})).rejects.toThrow('Failed to tag');
  });

  it('should work with partial options', async () => {
    mockMetadataService.embedToFolder.mockResolvedValue();

    await tagFiles('/test/book', {
      title: 'Only Title',
    });

    expect(mockMetadataService.embedToFolder).toHaveBeenCalledWith('/test/book', {
      title: 'Only Title',
      author: undefined,
      narrator: undefined,
      coverUrl: undefined,
      description: undefined,
    });
  });
});
