/**
 * Metadata Writer for Libby Downloader
 * Handles creation and saving of metadata.json files
 */

import type { BookMetadata, Chapter } from '../types/extension-book';
import { sanitizeFilename } from '../shared/validators';

export class MetadataWriter {
  /**
   * Save metadata JSON file for a book
   */
  async saveMetadata(
    metadata: BookMetadata,
    chapters: Chapter[],
    bookTitle: string
  ): Promise<number> {
    console.log('[Metadata Writer] Saving metadata file');

    const metadataContent = JSON.stringify({ metadata, chapters }, null, 2);

    // Use data URL instead of blob URL (blob URLs don't work in service workers)
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(metadataContent);

    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: `libby-downloads/${sanitizeFilename(bookTitle)}/metadata.json`,
      saveAs: false,
    });

    console.log('[Metadata Writer] Metadata file download started');

    return downloadId;
  }
}
