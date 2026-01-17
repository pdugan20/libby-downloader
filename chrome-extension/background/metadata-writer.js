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
    const blob = new Blob([metadataContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    try {
      const downloadId = await chrome.downloads.download({
        url: url,
        filename: `libby-downloads/${sanitizeFilename(bookTitle)}/metadata.json`,
        saveAs: false,
      });

      console.log('[Metadata Writer] Metadata file download started');

      // Revoke blob URL after 30 seconds
      setTimeout(() => URL.revokeObjectURL(url), 30000);

      return downloadId;
    } catch (error) {
      // Clean up blob URL on error
      URL.revokeObjectURL(url);
      throw error;
    }
  }
}
