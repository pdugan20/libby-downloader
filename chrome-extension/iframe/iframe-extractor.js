/**
 * Iframe extractor for Libby Downloader V2
 * Runs in MAIN world (page context) with direct access to window.BIF
 * Extracts book metadata and chapter URLs from Libby's player
 */

// Note: Cannot use imports in MAIN world script, so using inline constants
const MSG_EXTRACT = 'EXTRACT_LIBBY_BOOK';
const MSG_SUCCESS = 'EXTRACTION_SUCCESS';
const MSG_ERROR = 'EXTRACTION_ERROR';

console.log('[Libby Downloader] Iframe script loaded');

// Hook JSON.parse to capture crypto parameters
const originalParse = JSON.parse;
window.__odreadCmptParams = null;

JSON.parse = function (...args) {
  const result = originalParse.apply(this, args);

  if (result && typeof result === 'object' && result.b && result.b['-odread-cmpt-params']) {
    window.__odreadCmptParams = Array.from(result.b['-odread-cmpt-params']);
    console.log('[Libby Downloader] Captured crypto parameters');
  }

  return result;
};

// Listen for extraction requests
window.addEventListener('message', async (event) => {
  // Only process extraction requests
  if (!event.data || event.data.type !== MSG_EXTRACT) return;

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
        type: MSG_SUCCESS,
        data: bookData,
      },
      '*' // Must use wildcard since parent is different origin
    );
  } catch (error) {
    console.error('[Libby Downloader] Extraction failed:', error);
    window.parent.postMessage(
      {
        type: MSG_ERROR,
        error: error.message,
      },
      '*'
    );
  }
});

/**
 * Extract book data from BIF object
 */
async function extractBookData() {
  // Get BIF object
  let BIF = await getBIF();

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
  const totalDuration = BIF.map.spine.reduce((sum, spine) => sum + spine['audio-duration'], 0);

  let coverUrl = '';
  try {
    const imageElem = BIF.root?.querySelector('image');
    if (imageElem) coverUrl = imageElem.getAttribute('href') || '';
  } catch (e) {
    console.warn('[Libby Downloader] Could not extract cover URL:', e);
  }

  // Extract chapters with full URLs
  const chapters = [];
  let cumulativeTime = 0;

  for (const spine of BIF.objects.spool.components) {
    const url =
      location.origin + '/' + spine.meta.path + '?' + odreadCmptParams[spine.spinePosition];

    chapters.push({
      index: spine.meta['-odread-spine-position'],
      title: `Part ${spine.meta['-odread-spine-position'] + 1}`,
      url: url,
      duration: spine.meta['audio-duration'],
      startTime: cumulativeTime,
    });

    cumulativeTime += spine.meta['audio-duration'];
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

  // Build complete book data
  return {
    metadata: {
      title: BIF.map.title.main,
      subtitle: BIF.map.title.subtitle,
      authors: authors,
      narrator: narrators.join(', '),
      duration: Math.round(totalDuration / 60),
      coverUrl: coverUrl,
      description: BIF.map.description,
    },
    chapters: chapters,
    extractedAt: new Date().toISOString(),
    extractedFrom: location.href,
  };
}

/**
 * Get BIF object with retry logic
 */
async function getBIF() {
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

  return BIF;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log('[Libby Downloader] Ready to extract');
