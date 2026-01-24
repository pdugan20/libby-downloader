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

// Extend window interface for Libby-specific globals
declare global {
  interface Window {
    BIF?: BIFObject;
    getBIF?: () => Promise<BIFObject>;
    __odreadCmptParams: number[] | null;
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
      }>;
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

JSON.parse = function (text: string, reviver?: (key: string, value: unknown) => unknown): unknown {
  const result = originalParse.apply(this, [text, reviver]);

  if (result && typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>;
    if (obj.b && typeof obj.b === 'object') {
      const b = obj.b as Record<string, unknown>;
      if (b['-odread-cmpt-params']) {
        window.__odreadCmptParams = Array.from(b['-odread-cmpt-params'] as number[]);
        console.log('[Libby Downloader] Captured crypto parameters');
      }
    }
  }

  return result;
};

// Listen for extraction requests
window.addEventListener('message', async (event: MessageEvent) => {
  // Only process extraction requests
  if (!event.data || event.data.type !== MessageTypes.EXTRACT_LIBBY_BOOK) return;

  console.log('[Libby Downloader] Extraction requested');

  try {
    // Extract book data
    const bookData = await extractBookData();

    console.log(
      `[Libby Downloader] Extraction complete: "${bookData.metadata.title}" (${bookData.chapters.length} chapters)`
    );

    // Send to parent frame (use specific origin for security)
    window.parent.postMessage(
      {
        type: MessageTypes.EXTRACTION_SUCCESS,
        data: bookData,
      },
      '*' // Must use wildcard since parent is different origin
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Libby Downloader] Extraction failed:', error);
    window.parent.postMessage(
      {
        type: MessageTypes.EXTRACTION_ERROR,
        error: errorMessage,
      },
      '*'
    );
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

  // Check crypto params
  if (!window.__odreadCmptParams) {
    throw new Error(
      'Crypto parameters not captured yet. Play the audiobook for a few seconds and try again.'
    );
  }

  const odreadCmptParams = window.__odreadCmptParams;

  // Extract metadata
  const authors = BIF.map.creator.filter((c) => c.role === 'author').map((c) => c.name);
  const narrators = BIF.map.creator.filter((c) => c.role === 'narrator').map((c) => c.name);
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
    const url =
      location.origin + '/' + spine.meta.path + '?' + odreadCmptParams[spine.spinePosition];

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

console.log('[Libby Downloader] Ready to extract');
