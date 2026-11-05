import { validateBookData } from '../../shared/validators';

it.each([
  'https://example.com/part.mp3?undefined',
  'https://example.com/part.mp3?null',
  'invalid',
  'javascript:alert(1)',
])('rejects an invalid URL in a later chapter: %s', (url) => {
  const chapter = {
    index: 0,
    title: 'Part',
    duration: 60,
    url: 'https://example.com/part.mp3?cmpt=mock',
  };
  expect(
    validateBookData({
      metadata: { title: 'Mock Book', authors: [] },
      chapters: [chapter, { ...chapter, index: 1, url }],
    })
  ).toBe(false);
});
