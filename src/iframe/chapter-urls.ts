/**
 * Chapter URL collection for Libby audiobooks
 *
 * Since late October 2026 Libby signs each audio part with its own `cmpt` token and no
 * longer exposes those tokens in the book data. The player creates a part's signed URL
 * only when it loads that part, so we move the player into each part and record the
 * URL it requests. Playback is not required: moving a paused player is enough.
 *
 * This module holds the collection logic with its browser dependencies injected, so it
 * can be tested without Libby. The extractor supplies the real player and performance
 * observer.
 */

export interface AudioPart {
  /** Part path relative to the player origin, as listed in the book's spool */
  path: string;
}

export interface ChapterUrlDeps {
  /** Player origin, for example https://dewey-abc.listen.libbyapp.com */
  origin: string;
  /** URLs of media requests the player has made so far, oldest first */
  readRequestedUrls: () => string[];
  /** Move the player into the part at this index */
  seekToPart: (index: number) => void;
  /** Put the player back where it was before collection started */
  restorePosition: () => void;
  sleep: (ms: number) => Promise<void>;
  onProgress?: (collected: number, total: number) => void;
  /** How long to wait for the player to request one part */
  partTimeoutMs?: number;
  pollIntervalMs?: number;
}

const DEFAULT_PART_TIMEOUT_MS = 8000;
const DEFAULT_POLL_INTERVAL_MS = 100;

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Return the part path a signed player request belongs to, or null when the URL is
 * from another origin or carries no query (an unsigned request is useless to us).
 */
export function partPathFromUrl(url: string, origin: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== origin || parsed.search.length <= 1) {
      return null;
    }
    return decodePath(parsed.pathname.replace(/^\//, ''));
  } catch {
    return null;
  }
}

/**
 * Collect one signed URL per part, in part order.
 * Parts the player already requested are reused; the rest are loaded by seeking.
 * The player position is always restored, including when collection fails.
 * @throws {Error} When the player does not request a part within the timeout
 */
export async function collectChapterUrls(
  parts: AudioPart[],
  deps: ChapterUrlDeps
): Promise<string[]> {
  const partTimeoutMs = deps.partTimeoutMs ?? DEFAULT_PART_TIMEOUT_MS;
  const pollIntervalMs = deps.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const keys = parts.map((part) => decodePath(part.path));
  const wanted = new Set(keys);
  const found = new Map<string, string>();

  // Later requests win, so a part requested again gets its newest token
  const absorb = (): void => {
    for (const url of deps.readRequestedUrls()) {
      const key = partPathFromUrl(url, deps.origin);
      if (key !== null && wanted.has(key)) {
        found.set(key, url);
      }
    }
  };

  absorb();

  try {
    for (let i = 0; i < keys.length; i++) {
      if (!found.has(keys[i])) {
        deps.seekToPart(i);
        let waited = 0;
        absorb();
        while (!found.has(keys[i]) && waited < partTimeoutMs) {
          await deps.sleep(pollIntervalMs);
          waited += pollIntervalMs;
          absorb();
        }
        if (!found.has(keys[i])) {
          throw new Error(
            `Libby didn't load audio part ${i + 1} of ${keys.length}. Reload the audiobook and try again.`
          );
        }
      }
      deps.onProgress?.(i + 1, keys.length);
    }
  } finally {
    deps.restorePosition();
  }

  return keys.map((key) => found.get(key) as string);
}
