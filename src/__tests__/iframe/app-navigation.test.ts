/**
 * @jest-environment-options {"url": "https://libbyapp.com/"}
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { MessageTypes } from '../../types/messages';
import '../mocks/chrome.mock';

it('handles the player button after navigation from the Libby home page', async () => {
  const manifest = JSON.parse(readFileSync(resolve('chrome-extension/manifest.json'), 'utf8'));
  const parentScript = manifest.content_scripts.find((script: { js: string[] }) =>
    script.js.includes('content/content.js')
  );
  expect(parentScript.matches).toContain('*://*.libbyapp.com/*');
  jest.useFakeTimers();
  try {
    await import('../../background/index');
    const backgroundListener = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
    (chrome.runtime.sendMessage as jest.Mock).mockImplementation(
      (message) =>
        new Promise((resolve) => backgroundListener(message, { tab: { id: 1 } }, resolve))
    );
    await import('../../content/index');
    // A loan is opened without replacing the parent document.
    history.pushState({}, '', '/open/loan/mock-book/mock-library');
    const iframe = document.createElement('iframe');
    iframe.src = 'https://test.listen.libbyapp.com/';
    document.body.appendChild(iframe);
    const post = jest.spyOn(iframe.contentWindow!, 'postMessage').mockImplementation(() => {});
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://test.listen.libbyapp.com',
        source: iframe.contentWindow,
        data: { type: MessageTypes.LIBBY_DOWNLOADER_BUTTON_CLICKED },
      })
    );
    expect(post).toHaveBeenCalledWith(
      { type: MessageTypes.EXTRACT_LIBBY_BOOK },
      'https://test.listen.libbyapp.com'
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://test.listen.libbyapp.com',
        source: iframe.contentWindow,
        data: {
          type: MessageTypes.EXTRACTION_SUCCESS,
          data: {
            metadata: { title: 'Mock Book', authors: ['Mock Author'] },
            chapters: [0, 1].map((index) => ({
              index,
              title: `Part ${index + 1}`,
              duration: 60,
              url: `https://test.listen.libbyapp.com/part${index}.mp3?cmpt=mock`,
            })),
          },
        },
      })
    );
    await jest.advanceTimersByTimeAsync(3000);
    expect(
      (chrome.downloads.download as jest.Mock).mock.calls.map(([options]) => options.filename)
    ).toEqual([
      'libby-downloads/Mock Book/chapter-001.mp3',
      'libby-downloads/Mock Book/chapter-002.mp3',
      'libby-downloads/Mock Book/metadata.json',
    ]);
    post.mockRestore();
  } finally {
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});
