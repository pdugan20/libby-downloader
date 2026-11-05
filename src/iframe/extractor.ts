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
import { ChapterUrls, gatherChapterUrls } from './chapter-urls';
import type { PlayerPlace } from './chapter-urls';

// Extend window interface for Libby-specific globals
declare global {
  interface Window {
    BIF?: BIFObject;
    getBIF?: () => Promise<BIFObject>;
    __odreadCmptParams: unknown[] | null;
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
      focus: PlayerPlace;
      _?: { proxy?: { _?: { element?: HTMLAudioElement } } };
      components: Array<{
        meta: {
          path: string;
          '-odread-spine-position': number;
          'audio-duration'?: number;
          duration?: number;
        };
        spinePosition: number;
        duration?: number;
      }>;
    };
    compass: {
      at: (position: { floc: number }) => PlayerPlace;
    };
  };
  root?: {
    querySelector: (selector: string) => Element | null;
  };
}

console.log('[Libby Downloader] Iframe script loaded');

// Hook JSON.parse to capture crypto parameters
const originalParse = JSON.parse;
window.__odreadCmptParams = null;

const chapterUrls = new ChapterUrls(location.origin);
function captureResourceUrls(): void {
  for (const entry of performance.getEntriesByType('resource')) {
    chapterUrls.record(entry.name);
  }
}
// Observe normal player requests without patching media elements or making requests.
if (typeof PerformanceObserver !== 'undefined') {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) chapterUrls.record(entry.name);
  });
  observer.observe({ type: 'resource', buffered: true });
}

let extracting = false;

JSON.parse = function (text: string, reviver?: (key: string, value: unknown) => unknown): unknown {
  const result = originalParse.apply(this, [text, reviver]);
  extractCryptoParams(result, 'JSON.parse');
  return result;
};

// Hook Response.prototype.json to capture crypto parameters from fetch API responses
// Chrome's Response.json() is native C++ and does NOT go through JSON.parse
const originalResponseJson = Response.prototype.json;
Response.prototype.json = async function (): Promise<unknown> {
  const result = await originalResponseJson.call(this);
  extractCryptoParams(result, 'Response.json');
  return result;
};

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
  if (extracting) return;
  extracting = true;

  console.log('[Libby Downloader] Extraction requested');

  try {
    // Extract book data
    const bookData = await extractBookData();

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
  } finally {
    extracting = false;
  }
});

/**
 * Extract book data from BIF object
 */
async function extractBookData(): Promise<BookData> {
  // Get BIF object
  const BIF = await getBIF();

  if (!BIF) {
    throw new Error('BIF object not found. The audiobook player may not have loaded properly.');
  }

  captureResourceUrls();
  const resolveUrl = (position: number): string | undefined => {
    captureResourceUrls();
    // The player uses a detached audio element, so it is absent from the DOM.
    // Reading its source also covers cached/in-flight media that has no timing entry yet.
    const audio = BIF.objects.spool._?.proxy?._?.element;
    if (audio) {
      chapterUrls.record(audio.currentSrc);
      chapterUrls.record(audio.src);
    }
    const component = BIF.objects.spool.components.find((c) => c.spinePosition === position);
    return component
      ? chapterUrls.resolve(component.meta.path, window.__odreadCmptParams?.[position])
      : undefined;
  };
  const missing = BIF.objects.spool.components
    .filter((component) => !resolveUrl(component.spinePosition))
    .map((component) => component.spinePosition);
  if (missing.length) {
    const original = BIF.objects.spool.focus;
    if (!original || !Number.isFinite(original.floc) || !BIF.objects.compass?.at) {
      throw new Error('Audio URLs are unavailable. Play the audiobook and try again.');
    }
    await gatherChapterUrls(
      missing,
      { original, at: (floc) => BIF.objects.compass.at({ floc }) },
      (position) => Boolean(resolveUrl(position)),
      sleep
    );
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

  // Extract chapters with full URLs
  const chapters: Chapter[] = [];
  let cumulativeTime = 0;

  for (const spine of BIF.objects.spool.components) {
    const url = resolveUrl(spine.spinePosition);
    if (!url) throw new Error(`Audio URL missing for part ${spine.spinePosition + 1}.`);

    // Try different possible duration properties (fallback to 0 if not available)
    const duration = spine.meta['audio-duration'] || spine.meta.duration || spine.duration || 0;

    chapters.push({
      index: spine.meta['-odread-spine-position'],
      title: `Part ${spine.meta['-odread-spine-position'] + 1}`,
      url: url,
      duration: duration,
      startTime: cumulativeTime,
    });

    cumulativeTime += duration;
  }

  // Get chapter titles from TOC
  if (BIF.map.nav?.toc) {
    const spineToIndex = BIF.map.spine.map((x) => x['-odread-original-path']);
    for (const tocChapter of BIF.map.nav.toc) {
      const spinePath = tocChapter.path.split('#')[0];
      const spineIndex = spineToIndex.indexOf(spinePath);
      if (spineIndex !== -1 && chapters[spineIndex]) {
        chapters[spineIndex].title = tocChapter.title;
      }
    }
  }

  // Build complete book metadata
  const metadata: BookMetadata = {
    title: BIF.map.title.main,
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
 * Extract crypto params from a parsed object (shared by JSON.parse and Response.json hooks)
 */
function extractCryptoParams(result: unknown, source: string): void {
  if (result && typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>;
    if (obj.b && typeof obj.b === 'object') {
      const b = obj.b as Record<string, unknown>;
      if (Array.isArray(b['-odread-cmpt-params']) && b['-odread-cmpt-params'].length > 0) {
        window.__odreadCmptParams = b['-odread-cmpt-params'];
        console.log(`[Libby Downloader] Captured crypto parameters via ${source}`);
      }
    }
  }
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
