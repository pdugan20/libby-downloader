/**
 * @jest-environment-options {"url": "https://dewey-abc.listen.libbyapp.com/"}
 */

import { MessageTypes } from '../../types/messages';

function postFromParent(origin: string, data: Record<string, unknown>): void {
  // In jsdom the top window is its own parent, so source: window is the parent.
  window.dispatchEvent(new MessageEvent('message', { origin, source: window, data }));
}

function overlayText(): string | null | undefined {
  return document.querySelector('.libby-download-progress-overlay .libby-progress-text')
    ?.textContent;
}

describe('iframe UI injector', () => {
  beforeAll(async () => {
    document.body.innerHTML =
      '<div class="nav-action-bar-right"><div class="nav-action-item"></div></div>' +
      '<div class="album-art"></div>';
    await import('../../iframe/ui-injector');
  });

  afterEach(() => {
    postFromParent('https://libbyapp.com', { type: MessageTypes.RESET_UI });
  });

  it('ignores progress messages from a non-Libby origin', () => {
    postFromParent('https://evil.example', {
      type: MessageTypes.UPDATE_PROGRESS_UI,
      state: 'extracting',
    });
    expect(document.querySelector('.libby-download-progress-overlay')).toBeNull();
  });

  it('shows progress for messages from the Libby parent', () => {
    postFromParent('https://libbyapp.com', {
      type: MessageTypes.UPDATE_PROGRESS_UI,
      state: 'extracting',
    });
    expect(overlayText()).toBe('Extracting metadata...');
  });

  it('renders the completion count as text', () => {
    postFromParent('https://libbyapp.com', {
      type: MessageTypes.UPDATE_PROGRESS_UI,
      state: 'extracting',
    });
    postFromParent('https://libbyapp.com', {
      type: MessageTypes.UPDATE_PROGRESS_UI,
      state: 'success',
      data: { failedChapters: '<img src=x onerror=alert(1)>' },
    });
    const text = document.querySelector('.libby-progress-text');
    expect(text?.textContent).toBe('Download complete with NaN errors');
    expect(text?.querySelector('img')).toBeNull();
  });

  it('notifies the parent when the download button is clicked', () => {
    const postMessage = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    document.querySelector<HTMLButtonElement>('#libby-downloader-button')?.click();
    expect(postMessage).toHaveBeenCalledWith(
      { type: MessageTypes.LIBBY_DOWNLOADER_BUTTON_CLICKED },
      '*'
    );
    postMessage.mockRestore();
  });
});
