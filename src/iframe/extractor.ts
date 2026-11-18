/**
 * Iframe extractor for Libby Downloader
 * Runs in MAIN world (page context) with direct access to window.BIF
 * Extracts book metadata and chapter URLs from Libby's player
 *
 * Note: This script runs in MAIN world and gets bundled as IIFE by Vite.
 * Types are available at compile time but stripped at runtime.
 */

import type { BookData, BookMetadata, Chapter } from '../types/extension-book';
import { MessageTypes } from '../types/messages';
import { isTrustedParentMessage } from '../shared/validators';
import { collectChapterUrls } from './chapter-urls';

// Extend window interface for Libby-specific globals
declare global {
  interface Window {
    BIF?: BIFObject;
    getBIF?: () => Promise<BIFObject>;
  }
}

/**
 * BIF (Book Information File) object from Libby
 */
interface BIFObject {
  map: {
    title: {
      main: string;
      subtitle?: string;
    };
    creator: Array<{
      name: string;
      role: string;
    }>;
    spine: Array<{
      '-odread-original-path': string;
      'audio-duration'?: number;
      duration?: number;
    }>;
    description?: string;
    nav?: {
      toc?: Array<{
        title: string;
        path: string;
      }>;
    };
  };
  objects: {
    spool: {
      components: Array<{
        meta: {
          path: string;
          '-odread-spine-position': number;
          'audio-duration'?: number;
          duration?: number;
        };
        spinePosition: number;
        duration?: number;
        durationMilliseconds?: number;
      }>;
      focus?: {
        floc: number;
      };
      /** Libby's own seek; a truthy third argument skips recording a Recent Place */
      seek?: (component: unknown, componentMilliseconds: number, quiet?: boolean) => void;
    };
    compass?: {
      at: (location: { floc: number }) => BIFPlace | null | undefined;
    };
  };
  root?: {
    querySelector: (selector: string) => Element | null;
  };
}

interface BIFPlace {
  component: unknown;
  componentMilliseconds: number;
  seek: () => void;
}

console.log('[Libby Downloader] Iframe script loaded');

// Record the URLs of the player's own requests. An observer sees every request even
// after the page's resource timing buffer fills, which a 50-part book can do.
const requestedUrls: string[] = [];
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      requestedUrls.push(entry.name);
    }
  }).observe({ type: 'resource', buffered: true });
} catch (error) {
  console.warn('[Libby Downloader] Could not observe player requests:', error);
}

function readRequestedUrls(): string[] {
  const fromBuffer = performance.getEntriesByType('resource').map((entry) => entry.name);
  return [...fromBuffer, ...requestedUrls];
}

// Listen for extraction requests
window.addEventListener('message', async (event: MessageEvent) => {
  // Only process extraction requests
  if (!event.data || event.data.type !== MessageTypes.EXTRACT_LIBBY_BOOK) return;
  // Only the embedding Libby page may request extraction; the reply carries
  // chapter URLs, so it goes back to that origin alone.
  if (!isTrustedParentMessage(event)) {
    console.warn('[Libby Downloader] Ignoring extraction request from', event.origin);
    return;
  }
  const replyOrigin = event.origin;

  console.log('[Libby Downloader] Extraction requested');

  try {
    // Extract book data
    const bookData = await extractBookData(replyOrigin);

    console.log(
      `[Libby Downloader] Extraction complete: "${bookData.metadata.title}" (${bookData.chapters.length} chapters)`
    );

    window.parent.postMessage(
      {
        type: MessageTypes.EXTRACTION_SUCCESS,
        data: bookData,
      },
      replyOrigin
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Libby Downloader] Extraction failed:', error);
    window.parent.postMessage(
      {
        type: MessageTypes.EXTRACTION_ERROR,
        error: errorMessage,
      },
      replyOrigin
    );
  }
});

/**
 * Extract book data from BIF object
 */
async function extractBookData(replyOrigin: string): Promise<BookData> {
  // Get BIF object
  const BIF = await getBIF();

  if (!BIF) {
    throw new Error('BIF object not found. The audiobook player may not have loaded properly.');
  }

  // Extract metadata (null-safe, case-insensitive with fallbacks)
  const creators = BIF.map.creator ?? [];
  const authors = resolveAuthors(creators);
  const narrators = creators.filter((c) => c.role?.toLowerCase() === 'narrator').map((c) => c.name);
  const totalDuration = BIF.map.spine.reduce(
    (sum, spine) => sum + (spine['audio-duration'] || 0),
    0
  );

  let coverUrl = '';
  try {
    const imageElem = BIF.root?.querySelector('image');
    if (imageElem) coverUrl = imageElem.getAttribute('href') || '';
  } catch (e) {
    console.warn('[Libby Downloader] Could not extract cover URL:', e);
  }

  const parts = BIF.objects.spool.components;
  const urls = await collectPartUrls(BIF, (completed, total) =>
    reportProgress(completed, total, replyOrigin)
  );

  // Build one chapter per audio part
  const chapters: Chapter[] = [];
  let cumulativeTime = 0;

  parts.forEach((part, i) => {
    // Part metadata no longer carries durations; the book's spine still does
    const duration =
      BIF.map.spine[part.spinePosition]?.['audio-duration'] ||
      part.meta['audio-duration'] ||
      (part.durationMilliseconds ? part.durationMilliseconds / 1000 : 0);

    chapters.push({
      index: part.meta['-odread-spine-position'],
      title: `Part ${part.meta['-odread-spine-position'] + 1}`,
      url: urls[i],
      duration: duration,
      startTime: cumulativeTime,
    });

    cumulativeTime += duration;
  });

  // Get chapter titles from TOC
  if (BIF.map.nav?.toc) {
    const spineToIndex = BIF.map.spine.map((x) => x['-odread-original-path']);
    for (const tocChapter of BIF.map.nav.toc) {
      const spinePath = tocChapter.path.split('#')[0];
      const spineIndex = spineToIndex.indexOf(spinePath);
      if (spineIndex !== -1 && chapters[spineIndex]) {
        chapters[spineIndex].title = decodeEntities(tocChapter.title);
      }
    }
  }

  // Build complete book metadata
  const metadata: BookMetadata = {
    title: decodeEntities(BIF.map.title.main),
    authors: authors,
    narrators: narrators,
    duration: Math.round(totalDuration / 60),
    coverUrl: coverUrl,
    description: BIF.map.description,
  };

  // Build complete book data
  return {
    metadata,
    chapters,
  };
}

/**
 * Get BIF object with retry logic
 */
async function getBIF(): Promise<BIFObject | null> {
  let BIF = window.BIF;

  if (!BIF && typeof window.getBIF === 'function') {
    console.log('[Libby Downloader] Calling getBIF()');
    BIF = await window.getBIF();
  }

  if (!BIF) {
    // Poll for BIF
    console.log('[Libby Downloader] Polling for window.BIF');
    for (let i = 0; i < 20; i++) {
      if (window.BIF) {
        BIF = window.BIF;
        console.log(`[Libby Downloader] Found BIF after ${i + 1} attempts`);
        break;
      }
      await sleep(500);
    }
  }

  return BIF || null;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Collect the signed URL for every audio part by moving the player through them.
 * Works on a paused player, so the user doesn't need to start playback first.
 */
async function collectPartUrls(
  BIF: BIFObject,
  onProgress: (completed: number, total: number) => void
): Promise<string[]> {
  const { spool, compass } = BIF.objects;
  if (!compass || typeof compass.at !== 'function') {
    throw new Error("Libby's player has changed and can't be navigated by part.");
  }

  const startFloc = spool.focus?.floc ?? 0;

  // Seek quietly when the player supports it, so the sweep doesn't fill the user's
  // Recent Places with one entry per chapter. Fall back to an ordinary seek.
  const seekTo = (floc: number): void => {
    const place = compass.at({ floc });
    if (!place) return;
    if (typeof spool.seek === 'function') {
      spool.seek(place.component, place.componentMilliseconds, true);
    } else {
      place.seek();
    }
  };

  return collectChapterUrls(
    spool.components.map((part) => ({ path: part.meta.path })),
    {
      origin: location.origin,
      readRequestedUrls,
      // Aim for the middle of a part so the player clearly lands inside it
      seekToPart: (index) => seekTo(spool.components[index].spinePosition + 0.5),
      restorePosition: () => seekTo(startFloc),
      sleep,
      onProgress,
    }
  );
}

/**
 * Tell the content script how many parts are ready, which also keeps its timeout alive
 */
function reportProgress(completed: number, total: number, replyOrigin: string): void {
  window.parent.postMessage(
    {
      type: MessageTypes.EXTRACTION_PROGRESS,
      progress: { completed, total },
    },
    replyOrigin
  );
}

/**
 * Libby's titles contain HTML entities such as &apos;. Parsing as an inert HTML
 * document decodes them without running anything.
 */
function decodeEntities(text: string): string {
  return new DOMParser().parseFromString(text, 'text/html').documentElement.textContent ?? text;
}

/**
 * Resolve authors from BIF creator list with fallback chain
 * 1. Case-insensitive match for known author roles
 * 2. Any non-narrator creator
 * 3. First creator regardless of role
 * 4. 'Unknown' as last resort
 */
function resolveAuthors(creators: Array<{ name: string; role: string }>): string[] {
  const authorRoles = new Set(['author', 'aut', 'wrt', 'writer']);
  const byRole = creators
    .filter((c) => authorRoles.has(c.role?.toLowerCase() ?? ''))
    .map((c) => c.name);
  if (byRole.length > 0) return byRole;

  const nonNarrators = creators
    .filter((c) => (c.role?.toLowerCase() ?? '') !== 'narrator')
    .map((c) => c.name);
  if (nonNarrators.length > 0) return nonNarrators;

  if (creators.length > 0) return [creators[0].name];

  return ['Unknown'];
}

console.log('[Libby Downloader] Ready to extract');
