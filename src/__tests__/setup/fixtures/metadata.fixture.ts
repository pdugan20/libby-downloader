/**
 * Test fixtures for metadata objects
 */

interface BookMetadata {
  metadata: {
    title: string;
    authors: string[];
    narrator?: string;
    coverUrl?: string;
    description?: string | { full: string; short: string };
  };
  chapters: Array<{
    index: number;
    title: string;
    duration: number;
  }>;
}

export const createMockMetadata = (overrides?: Partial<BookMetadata['metadata']>): BookMetadata => {
  return {
    metadata: {
      title: 'Sample Audiobook',
      authors: ['Sample Author'],
      narrator: 'Sample Narrator',
      coverUrl: 'https://example.com/cover.jpg',
      description: 'A sample audiobook description',
      ...overrides,
    },
    chapters: Array.from({ length: 5 }, (_, i) => ({
      index: i,
      title: `Chapter ${i + 1}`,
      duration: 1800,
    })),
  };
};

export const createMetadataWithComplexDescription = (): BookMetadata => {
  return createMockMetadata({
    description: {
      full: 'This is the full description of the audiobook with lots of details.',
      short: 'This is the short description.',
    },
  });
};

export const createMetadataWithoutNarrator = (): BookMetadata => {
  return createMockMetadata({
    narrator: undefined,
  });
};

export const createMetadataWithoutCover = (): BookMetadata => {
  return createMockMetadata({
    coverUrl: undefined,
  });
};

export const createMetadataJsonString = (overrides?: Partial<BookMetadata['metadata']>): string => {
  return JSON.stringify(createMockMetadata(overrides), null, 2);
};
