import NodeID3 from 'node-id3';
import * as fs from 'fs/promises';
import { AudioMetadata, LibbyBook } from '../types';
import { logger } from '../utils/logger';

export class MetadataEmbedder {
  /**
   * Embed metadata into an MP3 file
   */
  async embedMetadata(filePath: string, metadata: AudioMetadata): Promise<void> {
    try {
      logger.info(`Embedding metadata into: ${filePath}`);

      const tags: NodeID3.Tags = {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        year: metadata.year,
        genre: metadata.genre || 'Audiobook',
        comment: {
          language: 'eng',
          text: metadata.comment || 'Downloaded with libby-downloader',
        },
      };

      // Add cover image if provided
      if (metadata.image) {
        const imageBuffer = await fs.readFile(metadata.image);
        tags.image = {
          mime: this.getMimeType(metadata.image),
          type: {
            id: 3,
            name: 'front cover',
          },
          description: 'Album cover',
          imageBuffer,
        };
      }

      // Write tags
      const success = NodeID3.write(tags, filePath);

      if (success) {
        logger.success('Metadata embedded successfully');
      } else {
        throw new Error('Failed to write ID3 tags');
      }
    } catch (error) {
      logger.error('Failed to embed metadata', error);
      throw error;
    }
  }

  /**
   * Embed metadata into multiple MP3 files
   */
  async embedMetadataToFiles(
    filePaths: string[],
    book: LibbyBook,
    coverPath?: string
  ): Promise<void> {
    logger.info(`Embedding metadata into ${filePaths.length} files`);

    for (const filePath of filePaths) {
      const metadata: AudioMetadata = {
        title: book.title,
        artist: book.authors.join(', '),
        album: book.title,
        year: book.publishDate,
        genre: 'Audiobook',
        comment: book.description,
        image: coverPath,
      };

      await this.embedMetadata(filePath, metadata);
    }

    logger.success(`Metadata embedded into ${filePaths.length} files`);
  }

  /**
   * Read existing metadata from an MP3 file
   */
  async readMetadata(filePath: string): Promise<NodeID3.Tags | null> {
    try {
      const tags = NodeID3.read(filePath);
      return tags;
    } catch (error) {
      logger.error('Failed to read metadata', error);
      return null;
    }
  }

  /**
   * Remove metadata from an MP3 file
   */
  async removeMetadata(filePath: string): Promise<void> {
    try {
      logger.info(`Removing metadata from: ${filePath}`);
      const success = NodeID3.removeTags(filePath);

      if (success) {
        logger.success('Metadata removed successfully');
      } else {
        throw new Error('Failed to remove ID3 tags');
      }
    } catch (error) {
      logger.error('Failed to remove metadata', error);
      throw error;
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    return mimeTypes[ext || ''] || 'image/jpeg';
  }

  /**
   * Create metadata from LibbyBook
   */
  createMetadataFromBook(book: LibbyBook, coverPath?: string): AudioMetadata {
    return {
      title: book.title,
      artist: book.authors.join(', '),
      album: book.title,
      year: book.publishDate,
      genre: 'Audiobook',
      publisher: book.publisher,
      comment: book.description,
      image: coverPath,
    };
  }
}
