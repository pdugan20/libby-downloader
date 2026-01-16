/**
 * Libby Book Data Extraction Script
 *
 * HOW TO USE:
 * 1. Open an audiobook in Libby (https://libbyapp.com/open/loan/{loanId}/{bookId})
 * 2. Wait for the audiobook player to fully load
 * 3. Open Chrome DevTools (Cmd+Option+J on Mac, Ctrl+Shift+J on Windows/Linux)
 * 4. Paste this entire script into the Console tab
 * 5. Press Enter
 * 6. A file named "libby-book-{bookId}.json" will download
 * 7. Move it to ~/.libby-downloader/captures/
 * 8. Run: libby download ~/.libby-downloader/captures/libby-book-{bookId}.json
 */

(function extractLibbyBookData() {
  console.log('🎧 Libby Book Data Extractor');
  console.log('============================\n');

  // First, inject the param interceptor if not already done
  if (typeof window.__odreadCmptParams === 'undefined') {
    console.log('📡 Injecting crypto parameter interceptor...');

    const oldParse = JSON.parse;
    window.__odreadCmptParams = null;

    JSON.parse = function (...args) {
      const ret = oldParse.apply(this, args);
      if (
        typeof ret === 'object' &&
        ret['b'] !== undefined &&
        ret['b']['-odread-cmpt-params'] !== undefined
      ) {
        window.__odreadCmptParams = Array.from(ret['b']['-odread-cmpt-params']);
        console.log('✅ Captured crypto parameters');
      }
      return ret;
    };

    console.log('⏳ Waiting for audio data to load...');
    console.log('   Play the audiobook for a few seconds, then run this script again.');
    return;
  }

  // Check if BIF object exists
  if (typeof window.BIF === 'undefined') {
    console.error('❌ Error: window.BIF not found!');
    console.error('Make sure the audiobook player has fully loaded.');
    return;
  }

  const BIF = window.BIF;
  const odreadCmptParams = window.__odreadCmptParams;

  console.log('✅ Found BIF object');
  console.log('✅ Found crypto parameters');

  // Extract metadata
  const authors = BIF.map.creator
    .filter((c) => c.role === 'author')
    .map((c) => c.name);

  const narrators = BIF.map.creator
    .filter((c) => c.role === 'narrator')
    .map((c) => c.name);

  const totalDuration = BIF.map.spine.reduce(
    (sum, spine) => sum + spine['audio-duration'],
    0
  );

  let coverUrl = '';
  try {
    const imageElem = BIF.root?.querySelector('image');
    if (imageElem) {
      coverUrl = imageElem.getAttribute('href') || '';
    }
  } catch (e) {
    console.warn('⚠️  Could not extract cover URL:', e);
  }

  // Extract chapters
  const chapters = [];
  let cumulativeTime = 0;

  for (const spine of BIF.objects.spool.components) {
    const url =
      location.origin + '/' + spine.meta.path + '?' + odreadCmptParams[spine.spinePosition];

    chapters.push({
      index: spine.meta['-odread-spine-position'],
      title: `Part ${spine.meta['-odread-spine-position'] + 1}`,
      url,
      duration: spine.meta['audio-duration'],
      startTime: cumulativeTime,
    });

    cumulativeTime += spine.meta['audio-duration'];
  }

  // Try to get chapter titles from TOC
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

  // Build the data structure
  const bookData = {
    metadata: {
      title: BIF.map.title.main,
      subtitle: BIF.map.title.subtitle,
      authors,
      narrator: narrators.join(', '),
      duration: Math.round(totalDuration / 60), // Convert to minutes
      coverUrl,
      description: BIF.map.description,
    },
    chapters,
    extractedAt: new Date().toISOString(),
    extractedFrom: location.href,
  };

  // Log summary
  console.log('\n📖 Book Information:');
  console.log(`   Title: ${bookData.metadata.title}`);
  if (bookData.metadata.subtitle) {
    console.log(`   Subtitle: ${bookData.metadata.subtitle}`);
  }
  console.log(`   Authors: ${authors.join(', ')}`);
  console.log(`   Narrator: ${bookData.metadata.narrator}`);
  console.log(`   Duration: ${bookData.metadata.duration} minutes`);
  console.log(`   Chapters: ${chapters.length}`);

  // Generate filename from URL
  const urlMatch = location.pathname.match(/\/loan\/(\d+)\/(\d+)/);
  const bookId = urlMatch ? `${urlMatch[1]}-${urlMatch[2]}` : 'unknown';
  const filename = `libby-book-${bookId}.json`;

  // Download JSON file
  const dataStr = JSON.stringify(bookData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  console.log(`\n✅ Downloaded: ${filename}`);
  console.log('\n📋 Next steps:');
  console.log(`   1. Move ${filename} to ~/.libby-downloader/captures/`);
  console.log(`   2. Run: libby download ~/.libby-downloader/captures/${filename}`);
  console.log('\n✨ Done!');

  return bookData;
})();
