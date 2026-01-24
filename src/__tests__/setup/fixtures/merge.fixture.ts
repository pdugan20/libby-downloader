/**
 * Test fixtures for merge functionality
 */

export const createMockChapterFiles = (count: number = 3): string[] => {
  return Array.from({ length: count }, (_, i) => `chapter-${i + 1}.mp3`);
};

export const createMockFFmpegMetadata = (title: string, chapterCount: number = 2): string => {
  const chapters = Array.from(
    { length: chapterCount },
    (_, i) => `
[CHAPTER]
TIMEBASE=1/1000
START=${i * 180000}
END=${(i + 1) * 180000}
title=Chapter ${i + 1}`
  ).join('');

  return `;FFMETADATA1
title=${title}
artist=Test Author
album=${title}
genre=Audiobook${chapters}`;
};

export const createMockConcatFile = (files: string[], basePath: string = '/test/path'): string => {
  return files.map((f) => `file '${basePath}/${f}'`).join('\n');
};
