/**
 * Autostart marker shared by the CLI and the extension's content script.
 * `libby download` opens a loan with this hash; the content script removes it and
 * starts the download once the player is ready.
 */

export const AUTOSTART_HASH = '#libby-downloader-autostart';

/**
 * Return true when the page was opened to start a download, and remove the marker
 * so a reload or shared address doesn't start another download.
 */
export function consumeAutostartRequest(
  location: Pick<Location, 'hash' | 'pathname' | 'search'>,
  history: Pick<History, 'replaceState' | 'state'>
): boolean {
  if (location.hash !== AUTOSTART_HASH) {
    return false;
  }
  history.replaceState(history.state, '', location.pathname + location.search);
  return true;
}
