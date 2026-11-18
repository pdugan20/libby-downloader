/**
 * Tests for chapter URL collection from Libby's player
 */

import { collectChapterUrls, partPathFromUrl } from '../../iframe/chapter-urls';

const ORIGIN = 'https://dewey-abc.listen.libbyapp.com';
const parts = [{ path: 'part-1.mp3' }, { path: 'part-2.mp3' }, { path: 'part%203.mp3' }];
const signed = (path: string, token: string): string => ORIGIN + '/' + path + '?cmpt=' + token;

/**
 * Fake player that requests a part's signed URL when it seeks into that part
 */
function fakePlayer(initialRequests: string[] = [], unloadable: number[] = []) {
  const requests = [...initialRequests];
  const seeks: number[] = [];
  let restored = 0;
  return {
    seeks,
    restoredCount: () => restored,
    deps: {
      origin: ORIGIN,
      readRequestedUrls: () => requests,
      seekToPart: (index: number) => {
        seeks.push(index);
        if (!unloadable.includes(index)) {
          requests.push(signed(parts[index].path, 'token-' + index));
        }
      },
      restorePosition: () => {
        restored++;
      },
      sleep: () => Promise.resolve(),
      partTimeoutMs: 300,
      pollIntervalMs: 100,
    },
  };
}

describe('partPathFromUrl', () => {
  it('returns the decoded part path for a signed request from the player', () => {
    expect(partPathFromUrl(signed('part%203.mp3', 'x'), ORIGIN)).toBe('part 3.mp3');
  });

  it('ignores unsigned requests and other origins', () => {
    expect(partPathFromUrl(ORIGIN + '/part-1.mp3', ORIGIN)).toBeNull();
    expect(partPathFromUrl('https://libbyapp.com/part-1.mp3?cmpt=x', ORIGIN)).toBeNull();
    expect(partPathFromUrl('not a url', ORIGIN)).toBeNull();
  });
});

describe('collectChapterUrls', () => {
  it('seeks only to parts the player has not requested and returns URLs in part order', async () => {
    const player = fakePlayer([signed('part-2.mp3', 'earlier')]);
    const progress: number[] = [];

    const urls = await collectChapterUrls(parts, {
      ...player.deps,
      onProgress: (completed) => progress.push(completed),
    });

    expect(player.seeks).toEqual([0, 2]);
    expect(urls).toEqual([
      signed('part-1.mp3', 'token-0'),
      signed('part-2.mp3', 'earlier'),
      signed('part%203.mp3', 'token-2'),
    ]);
    expect(progress).toEqual([1, 2, 3]);
    expect(player.restoredCount()).toBe(1);
  });

  it('uses the newest URL when the player requested a part more than once', async () => {
    const player = fakePlayer([
      signed('part-1.mp3', 'old'),
      signed('part-1.mp3', 'new'),
      signed('part-2.mp3', 'a'),
      signed('part%203.mp3', 'b'),
    ]);

    const urls = await collectChapterUrls(parts, player.deps);

    expect(urls[0]).toBe(signed('part-1.mp3', 'new'));
    expect(player.seeks).toEqual([]);
  });

  it('fails with the part number and still restores the player when a part never loads', async () => {
    const player = fakePlayer([], [1]);

    await expect(collectChapterUrls(parts, player.deps)).rejects.toThrow(
      "Libby didn't load audio part 2 of 3"
    );
    expect(player.restoredCount()).toBe(1);
  });
});
