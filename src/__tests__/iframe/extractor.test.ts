/**
 * @jest-environment-options {"url": "https://test.listen.libbyapp.com/"}
 */
import { MessageTypes } from '../../types/messages';
import type { BookData } from '../../types/extension-book';

describe('player extraction with empty bootstrap params', () => {
  const parse = JSON.parse;
  const responseDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Response');
  let post: jest.SpyInstance;
  let confirm: jest.SpyInstance;
  let restore: jest.Mock;
  let bookNumber = 0;

  beforeAll(async () => {
    Object.defineProperty(globalThis, 'Response', {
      configurable: true,
      value: { prototype: { json: async () => ({}) } },
    });
    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: jest.fn(() => []),
    });
    await import('../../iframe/extractor');
  });

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: jest.fn(() => []),
    });
    const prefix = `book${bookNumber++}/`;
    post = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const audio = document.createElement('audio');
    audio.src = `https://test.listen.libbyapp.com/${prefix}part0.mp3?cmpt=mock-zero`;
    restore = jest.fn();
    window.BIF = {
      map: {
        title: { main: 'Mock Book' },
        creator: [{ name: 'Mock Author', role: 'author' }],
        spine: [],
      },
      objects: {
        spool: {
          focus: { floc: 0.5, seek: restore },
          _: { proxy: { _: { element: audio } } },
          components: [0, 1].map((index) => ({
            spinePosition: index,
            meta: {
              path: `${prefix}part${index}.mp3`,
              '-odread-spine-position': index,
              'audio-duration': 60,
            },
          })),
        },
        compass: {
          at: ({ floc }) => ({
            floc,
            seek: () => {
              audio.src = `https://test.listen.libbyapp.com/${prefix}part${Math.floor(floc)}.mp3?cmpt=mock-part`;
            },
          }),
        },
      },
    };
    // Reproduces the empty array returned by the changed bootstrap response.
    JSON.parse('{"b":{"-odread-cmpt-params":[]}}');
  });

  afterEach(() => {
    post.mockRestore();
    confirm.mockRestore();
    jest.useRealTimers();
  });

  afterAll(() => {
    JSON.parse = parse;
    if (responseDescriptor) Object.defineProperty(globalThis, 'Response', responseDescriptor);
    else Reflect.deleteProperty(globalThis, 'Response');
    jest.restoreAllMocks();
  });

  async function request(): Promise<void> {
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://libbyapp.com',
        source: window,
        data: { type: MessageTypes.EXTRACT_LIBBY_BOOK },
      })
    );
    await jest.advanceTimersByTimeAsync(1000);
  }

  it('collects detached audio sources, preserves metadata, and restores position', async () => {
    await request();
    const message = post.mock.calls.find(
      ([message]) => message.type === MessageTypes.EXTRACTION_SUCCESS
    )?.[0];
    expect(message).toBeDefined();
    const book = message.data as BookData;
    expect(book.chapters).toHaveLength(2);
    expect(book.chapters.every((chapter) => new URL(chapter.url).searchParams.has('cmpt'))).toBe(
      true
    );
    expect(book.chapters.map((chapter) => chapter.startTime)).toEqual([0, 60]);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
    expect(post.mock.calls[0][1]).toBe('https://libbyapp.com');
  });

  it('skips seeking when every URL was already observed', async () => {
    await request();
    post.mockClear();
    confirm.mockClear();
    restore.mockClear();
    await request();
    expect(confirm).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
    expect(post.mock.calls[0][0].type).toBe(MessageTypes.EXTRACTION_SUCCESS);
  });
});
