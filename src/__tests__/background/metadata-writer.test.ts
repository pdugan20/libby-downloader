import { MetadataWriter } from '../../background/metadata-writer';
import '../mocks/chrome.mock';

it('saves chapter metadata without persisting playback credentials', async () => {
  await new MetadataWriter().saveMetadata(
    { title: 'Mock Book', authors: ['Mock Author'] },
    [
      {
        index: 0,
        title: 'Part 1',
        duration: 60,
        startTime: 0,
        url: 'https://test.listen.libbyapp.com/part.mp3?cmpt=mock-secret',
      },
    ],
    'Mock Book'
  );
  const options = (chrome.downloads.download as jest.Mock).mock.calls.at(-1)[0];
  const saved = JSON.parse(decodeURIComponent(options.url.split(',')[1]));
  expect(saved.chapters).toEqual([{ index: 0, title: 'Part 1', duration: 60, startTime: 0 }]);
  expect(options.url).not.toContain('mock-secret');
});
