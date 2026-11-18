/**
 * Tests for the content script's message handling
 */

import '../mocks/chrome.mock';
import { MessageHandler } from '../../content/message-handler';
import type { UIManager } from '../../content/ui-manager';
import { MessageTypes } from '../../types/messages';

const PLAYER_ORIGIN = 'https://dewey-abc.listen.libbyapp.com';

const uiManager = {
  setIframe: jest.fn(),
  updateState: jest.fn(),
  showError: jest.fn(),
  resetAfterDelay: jest.fn(),
};
let iframePost: jest.SpyInstance;

function fromPlayer(data: Record<string, unknown>): void {
  window.dispatchEvent(new MessageEvent('message', { data, origin: PLAYER_ORIGIN }));
}

function extractionRequests(): number {
  return iframePost.mock.calls.filter(
    ([message]) => message?.type === MessageTypes.EXTRACT_LIBBY_BOOK
  ).length;
}

beforeAll(() => {
  document.body.innerHTML = `<iframe src="${PLAYER_ORIGIN}/?d=x"></iframe>`;
  const iframe = document.querySelector('iframe') as HTMLIFrameElement;
  iframePost = jest
    .spyOn(iframe.contentWindow as Window, 'postMessage')
    .mockImplementation(() => undefined);
  new MessageHandler(uiManager as unknown as UIManager).setupListeners();
});

beforeEach(() => {
  jest.useFakeTimers();
  iframePost.mockClear();
  (chrome.runtime.sendMessage as jest.Mock).mockClear();
  Object.values(uiManager).forEach((fn) => fn.mockClear());
});

afterEach(() => {
  // Finish any request so the next test starts idle
  fromPlayer({ type: MessageTypes.EXTRACTION_ERROR, error: 'reset' });
  jest.useRealTimers();
});

describe('MessageHandler', () => {
  it('ignores Download clicks while a download is being prepared', () => {
    fromPlayer({ type: MessageTypes.LIBBY_DOWNLOADER_BUTTON_CLICKED });
    fromPlayer({ type: MessageTypes.LIBBY_DOWNLOADER_BUTTON_CLICKED });

    expect(extractionRequests()).toBe(1);
  });

  it('keeps waiting while progress arrives and gives up when it stops', () => {
    fromPlayer({ type: MessageTypes.LIBBY_DOWNLOADER_BUTTON_CLICKED });

    jest.advanceTimersByTime(15_000);
    fromPlayer({ type: MessageTypes.EXTRACTION_PROGRESS, progress: { completed: 3, total: 49 } });
    jest.advanceTimersByTime(15_000);
    expect(uiManager.showError).not.toHaveBeenCalled();
    expect(uiManager.updateState).toHaveBeenCalledWith('extracting', { completed: 3, total: 49 });

    jest.advanceTimersByTime(6_000);
    expect(uiManager.showError).toHaveBeenCalledWith(
      expect.stringContaining('Libby stopped responding')
    );

    // After giving up, Download works again
    fromPlayer({ type: MessageTypes.LIBBY_DOWNLOADER_BUTTON_CLICKED });
    expect(extractionRequests()).toBe(2);
  });

  it("adds the loan's Libby title ID before starting the download", async () => {
    window.history.pushState({}, '', '/open/loan/111/222');

    fromPlayer({ type: MessageTypes.LIBBY_DOWNLOADER_BUTTON_CLICKED });
    fromPlayer({
      type: MessageTypes.EXTRACTION_SUCCESS,
      data: {
        metadata: { title: 'Book', authors: ['Author'] },
        chapters: [{ index: 0, title: 'One', url: PLAYER_ORIGIN + '/p1.mp3?cmpt=t', duration: 1 }],
      },
    });
    await Promise.resolve();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageTypes.START_DOWNLOAD,
        data: expect.objectContaining({
          metadata: { title: 'Book', authors: ['Author'], libbyTitleId: '222' },
        }),
      })
    );
  });
});
