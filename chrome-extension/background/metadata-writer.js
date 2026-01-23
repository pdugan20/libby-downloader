/**
 * Metadata Writer for Libby Downloader
 * Handles creation and saving of metadata.json files
 */

import { sanitizeFilename } from '../shared/validators.js';

export class MetadataWriter {
  /**
   * Save metadata JSON file for a book
   * @param {object} metadata - Book metadata
   * @param {Array} chapters - Chapters array
   * @param {string} bookTitle - Book title for folder structure
   * @returns {Promise<number>} Download ID of metadata file
   */
  async saveMetadata(metadata, chapters, bookTitle) {
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
