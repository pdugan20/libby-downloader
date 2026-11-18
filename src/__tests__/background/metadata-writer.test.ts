/**
 * Tests for metadata.json writing
 */

import { MetadataWriter } from '../../background/metadata-writer';
import '../mocks/chrome.mock';

describe('MetadataWriter', () => {
  it('saves chapter titles and durations without signed chapter URLs', async () => {
    const writer = new MetadataWriter();

    await writer.saveMetadata(
      { title: 'Test Book', authors: ['Test Author'] },
      [
        {
          index: 0,
          title: 'Chapter 1',
          url: 'https://dewey-abc.listen.libbyapp.com/part-1.mp3?cmpt=secret-token',
          duration: 1800,
          startTime: 0,
        },
      ],
      'Test Book'
    );

    const { url, filename, conflictAction } = (chrome.downloads.download as jest.Mock).mock
      .calls[0][0];
    const saved = JSON.parse(decodeURIComponent(url.split(',')[1]));

    expect(filename).toBe('libby-downloads/Test Book/metadata.json');
    expect(conflictAction).toBe('overwrite');
    expect(saved.chapters).toEqual([
      { index: 0, title: 'Chapter 1', duration: 1800, startTime: 0 },
    ]);
    expect(url).not.toContain('secret-token');
  });
});
