/**
 * Test fixtures for BookInfo objects
 */

import { BookInfo } from '../../../utils/books';

export const createMockBookInfo = (overrides?: Partial<BookInfo>): BookInfo => {
  return {
    name: 'Test Book',
    path: '/test/path/Test Book',
    chapterCount: 10,
    hasMetadata: true,
    isTagged: false,
    isMerged: false,
    metadataJson: {
      metadata: {
        title: 'Test Book Title',
        authors: ['Test Author'],
        narrator: 'Test Narrator',
        coverUrl: 'https://example.com/cover.jpg',
      },
      chapters: Array.from({ length: 10 }, (_, i) => ({
        title: `Chapter ${i + 1}`,
      })),
    },
    downloadedAt: new Date('2024-01-01'),
    ...overrides,
  };
};

export const createMockBooks = (count: number = 3): BookInfo[] => {
  return Array.from({ length: count }, (_, i) => {
    const isTagged = i % 2 === 0;
    const isMerged = i % 3 === 0;

    return createMockBookInfo({
      name: `Book ${i + 1}`,
      path: `/test/path/Book ${i + 1}`,
      chapterCount: 5 + i,
      isTagged,
      isMerged,
      metadataJson: {
        metadata: {
          title: `Book ${i + 1} Title`,
          authors: [`Author ${i + 1}`],
          narrator: `Narrator ${i + 1}`,
          coverUrl: `https://example.com/cover${i + 1}.jpg`,
        },
        chapters: Array.from({ length: 5 + i }, (_, j) => ({
          title: `Chapter ${j + 1}`,
        })),
      },
      downloadedAt: new Date(2024, 0, i + 1),
    });
  });
};

export const createUntaggedBook = (): BookInfo => {
  return createMockBookInfo({
    name: 'Untagged Book',
    isTagged: false,
    isMerged: false,
  });
};

export const createTaggedBook = (): BookInfo => {
  return createMockBookInfo({
    name: 'Tagged Book',
    isTagged: true,
    isMerged: false,
  });
};

export const createMergedBook = (): BookInfo => {
  return createMockBookInfo({
    name: 'Merged Book',
    isTagged: true,
    isMerged: true,
  });
};

export const createBookWithoutMetadata = (): BookInfo => {
  return createMockBookInfo({
    name: 'No Metadata Book',
    hasMetadata: false,
    metadataJson: undefined,
  });
};
