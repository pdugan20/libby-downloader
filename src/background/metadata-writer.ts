/**
 * Metadata Writer for Libby Downloader
 * Handles creation and saving of metadata.json files
 */

import type { BookMetadata, Chapter } from '../types/extension-book';
import { sanitizeFilename } from '../shared/validators';

export class MetadataWriter {
  /**
   * Save metadata JSON file alongside MP3 files in book folder
   * Creates a metadata.json file containing book information and chapter details.
   * Used by the CLI tool to embed ID3 tags into MP3 files.
   * @param metadata - Book metadata (title, authors, narrators, cover, etc.)
   * @param chapters - Array of chapter information; signed URLs are left out of the file
   * @param bookTitle - Book title for folder organization
   * @returns Chrome download ID for the metadata.json file
   * @throws {Error} If Chrome downloads API fails
   * @example
   * ```typescript
   * const writer = new MetadataWriter();
   * const downloadId = await writer.saveMetadata(
   *   bookData.metadata,
   *   bookData.chapters,
   *   'My Book'
   * );
   * console.log('Metadata saved with ID:', downloadId);
   * ```
   */
  async saveMetadata(
    metadata: BookMetadata,
    chapters: Chapter[],
    bookTitle: string
  ): Promise<number> {
    // Chapter URLs carry signed tokens; the CLI only needs titles and durations
    const savedChapters = chapters.map(({ url: _url, ...chapter }) => chapter);
    const metadataContent = JSON.stringify({ metadata, chapters: savedChapters }, null, 2);

    // Use data URL instead of blob URL (blob URLs don't work in service workers)
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(metadataContent);

    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: `libby-downloads/${sanitizeFilename(bookTitle)}/metadata.json`,
      saveAs: false,
      // The CLI reads metadata.json, so a re-download must replace it
      conflictAction: 'overwrite',
    });

    return downloadId;
  }
}
