/**
 * Tests for the player-frame extractor against a fake Libby player
 */

import { MessageTypes } from '../../types/messages';
import '../../iframe/extractor';

const PARENT_ORIGIN = 'https://libbyapp.com';
const parts = ['part-1.mp3', 'part-2.mp3'];

interface FakeComponent {
  meta: { path: string; '-odread-spine-position': number };
  spinePosition: number;
  durationMilliseconds: number;
}

let entries: Array<{ name: string }>;
let components: FakeComponent[];
let seek: jest.Mock;
let disconnect: jest.Mock;
let postMessage: jest.SpyInstance;

beforeEach(() => {
  entries = [];
  components = parts.map((path, i) => ({
    meta: { path, '-odread-spine-position': i },
    spinePosition: i,
    durationMilliseconds: 60_000,
  }));
  // The player requests a part's signed URL when it seeks into that part
  seek = jest.fn((component: FakeComponent, ms: number) => {
    entries.push({
      name: `${location.origin}/${component.meta.path}?cmpt=token-${component.spinePosition}-${ms}`,
    });
  });

  (window as unknown as { BIF: unknown }).BIF = {
    map: {
      title: { main: 'Book &amp; Co' },
      creator: [{ name: 'An Author', role: 'author' }],
      spine: parts.map((path) => ({ '-odread-original-path': path, 'audio-duration': 60 })),
      nav: { toc: [{ title: 'Author&apos;s Note', path: 'part-1.mp3#start' }] },
    },
    objects: {
      spool: { components, focus: { floc: 0.25 }, seek },
      compass: {
        at: ({ floc }: { floc: number }) => ({
          component: components[Math.floor(floc)],
          componentMilliseconds: Math.round((floc % 1) * 60_000),
          seek: jest.fn(),
        }),
      },
    },
  };

  Object.defineProperty(performance, 'getEntriesByType', {
    value: jest.fn(() => entries),
    configurable: true,
  });
  disconnect = jest.fn();
  (globalThis as unknown as { PerformanceObserver: unknown }).PerformanceObserver = jest
    .fn()
    .mockImplementation(() => ({ observe: jest.fn(), disconnect }));
  postMessage = jest.spyOn(window, 'postMessage').mockImplementation(() => undefined);
});

afterEach(() => {
  postMessage.mockRestore();
});

function requestExtraction(): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: MessageTypes.EXTRACT_LIBBY_BOOK },
      origin: PARENT_ORIGIN,
      source: window,
    })
  );
}

function replies(type: string): unknown[][] {
  return postMessage.mock.calls.filter(([message]) => message?.type === type);
}

async function waitForReply(type: string, count = 1): Promise<void> {
  for (let i = 0; i < 50 && replies(type).length < count; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('extractor', () => {
  it('collects each part URL with quiet seeks, then restores the position', async () => {
    requestExtraction();
    await waitForReply(MessageTypes.EXTRACTION_SUCCESS);

    const [[message, targetOrigin]] = replies(MessageTypes.EXTRACTION_SUCCESS) as [
      [{ data: { metadata: { title: string }; chapters: Array<Record<string, unknown>> } }, string],
    ];
    expect(targetOrigin).toBe(PARENT_ORIGIN);
    expect(message.data.metadata.title).toBe('Book & Co');
    expect(message.data.chapters.map((chapter) => chapter.url)).toEqual([
      `${location.origin}/part-1.mp3?cmpt=token-0-30000`,
      `${location.origin}/part-2.mp3?cmpt=token-1-30000`,
    ]);
    expect(message.data.chapters.map((chapter) => chapter.title)).toEqual([
      "Author's Note",
      'Part 2',
    ]);
    expect(message.data.chapters.map((chapter) => chapter.duration)).toEqual([60, 60]);

    // Every seek is quiet, and the last one returns to where the listener was
    expect(seek.mock.calls.every(([, , quiet]) => quiet === true)).toBe(true);
    expect(seek.mock.calls.at(-1)?.slice(0, 2)).toEqual([components[0], 15_000]);

    expect(replies(MessageTypes.EXTRACTION_PROGRESS).map(([, origin]) => origin)).toEqual([
      PARENT_ORIGIN,
      PARENT_ORIGIN,
    ]);
    expect(disconnect).toHaveBeenCalled();
  });

  it('ignores a second request while one is running and accepts the next one after', async () => {
    requestExtraction();
    requestExtraction();
    await waitForReply(MessageTypes.EXTRACTION_SUCCESS);

    expect(replies(MessageTypes.EXTRACTION_SUCCESS)).toHaveLength(1);
    expect(seek).toHaveBeenCalledTimes(parts.length + 1);

    requestExtraction();
    await waitForReply(MessageTypes.EXTRACTION_SUCCESS, 2);
    expect(replies(MessageTypes.EXTRACTION_SUCCESS)).toHaveLength(2);
  });

  it('ignores requests from origins other than Libby', async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: MessageTypes.EXTRACT_LIBBY_BOOK },
        origin: 'https://example.com',
        source: window,
      })
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(seek).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });
});
