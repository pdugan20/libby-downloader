import { ChapterUrls, gatherChapterUrls } from '../../iframe/chapter-urls';

const origin = 'https://test.listen.libbyapp.com';

describe('chapter URL resolution', () => {
  it('rejects missing, empty and malformed bootstrap params', () => {
    const urls = new ChapterUrls(origin);
    for (const param of [undefined, null, '', 0, 'undefined', 'null', 'cmpt=']) {
      expect(urls.resolve('part.mp3', param)).toBeUndefined();
    }
  });

  it('supports legacy params and prefers the newest observed URL', () => {
    const urls = new ChapterUrls(origin);
    expect(urls.resolve('part.mp3', 'cmpt=mock-legacy')).toBe(
      `${origin}/part.mp3?cmpt=mock-legacy`
    );
    urls.record(`${origin}/part.mp3?cmpt=mock-old`);
    urls.record(`${origin}/part.mp3?cmpt=mock-new`);
    expect(urls.resolve('part.mp3', 'cmpt=mock-legacy')).toBe(`${origin}/part.mp3?cmpt=mock-new`);
  });

  it('matches the full path and origin, including escaped filenames', () => {
    const urls = new ChapterUrls(origin);
    urls.record('https://evil.example/book/part.mp3?cmpt=mock');
    urls.record(`${origin}/other/part.mp3?cmpt=mock`);
    expect(urls.resolve('book/part.mp3', undefined)).toBeUndefined();
    urls.record(`${origin}/book/part%201.mp3?cmpt=mock`);
    expect(urls.resolve('book/part 1.mp3', undefined)).toBe(
      `${origin}/book/part%201.mp3?cmpt=mock`
    );
  });

  it('ignores unsigned, invalid, non-media and credential-bearing entries', () => {
    const urls = new ChapterUrls(origin);
    for (const raw of [
      'invalid',
      `${origin}/part.mp3?undefined`,
      `${origin}/part.mp3`,
      `${origin}/part.json?cmpt=mock`,
      'https://user:pass@test.listen.libbyapp.com/part.mp3?cmpt=mock',
    ]) {
      urls.record(raw);
    }
    expect(urls.resolve('part.mp3', undefined)).toBeUndefined();
  });
});

describe('gatherChapterUrls', () => {
  it('seeks only missing parts in order and restores the original place', async () => {
    const seeks: number[] = [];
    const original = { floc: 4.5, seek: jest.fn() };
    let current = -1;
    await gatherChapterUrls(
      [0, 1, 2],
      {
        original,
        at: (floc) => ({
          floc,
          seek: () => {
            seeks.push(floc);
            current = Math.floor(floc);
          },
        }),
      },
      (position) => position === 1 || current === position,
      async () => {}
    );
    expect(seeks).toEqual([0.01, 2.01]);
    expect(original.seek).toHaveBeenCalledTimes(1);
  });

  it('stops and restores position when the player never supplies a URL', async () => {
    const original = { floc: 4.5, seek: jest.fn() };
    const seek = jest.fn();
    await expect(
      gatherChapterUrls(
        [0, 1],
        {
          original,
          at: (floc) => ({ floc, seek }),
        },
        () => false,
        async () => {}
      )
    ).rejects.toThrow('part 1');
    expect(seek).toHaveBeenCalledTimes(1);
    expect(original.seek).toHaveBeenCalledTimes(1);
  });

  it('restores position even when seeking throws', async () => {
    const original = { floc: 4.5, seek: jest.fn() };
    await expect(
      gatherChapterUrls(
        [0],
        {
          original,
          at: () => {
            throw new Error('Seek failed');
          },
        },
        () => false,
        async () => {}
      )
    ).rejects.toThrow('Seek failed');
    expect(original.seek).toHaveBeenCalledTimes(1);
  });
});
