/**
 * MetadataService - Unified metadata embedding service
 * Merges functionality from tag.ts and embedder.ts
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import NodeID3 from 'node-id3';
import { logger } from '../utils/logger';

export interface EmbedOptions {
  title?: string;
  author?: string;
  narrator?: string;
  coverUrl?: string;
  description?: string;
}

interface BookMetadata {
  metadata: {
    title: string;
    subtitle?: string;
    authors: string[];
    narrator?: string;
    coverUrl?: string;
    description?: string | { full: string; short: string };
  };
  chapters: Array<{
    index: number;
    title: string;
    duration: number;
  }>;
}

export class MetadataService {
  /**
   * Embed metadata into all MP3 files in a folder
   */
  async embedToFolder(folderPath: string, options: EmbedOptions = {}): Promise<void> {
    try {
      logger.info(`Tagging MP3 files in: ${folderPath}`);

      // Validate folder
      const folderStat = await fs.stat(folderPath);
      if (!folderStat.isDirectory()) {
        throw new Error(`Not a directory: ${folderPath}`);
      }

      // Load metadata from file or options
      const metadata = await this.loadMetadata(folderPath, options);

      // Download cover art if available
      const coverBuffer = await this.downloadCoverArt(metadata.coverUrl);

      // Find all MP3 files
      const mp3Files = await this.findMp3Files(folderPath);
      if (mp3Files.length === 0) {
        throw new Error('No MP3 files found in folder');
      }

      logger.info(`Found ${mp3Files.length} MP3 files`);

      // Tag each file
      for (let i = 0; i < mp3Files.length; i++) {
        const filePath = path.join(folderPath, mp3Files[i]);
        const chapterNum = i + 1;
        const chapterTitle = metadata.chapters?.[i]?.title || `Chapter ${chapterNum}`;

        logger.info(`Tagging ${mp3Files[i]} (${chapterNum}/${mp3Files.length})`);

        await this.embedToFile(filePath, {
          title: chapterTitle,
          artist: metadata.authors.join(', '),
          album: metadata.title,
          performerInfo: metadata.narrator || metadata.authors.join(', '),
          trackNumber: `${chapterNum}/${mp3Files.length}`,
          genre: 'Audiobook',
          comment: metadata.description,
          coverBuffer,
        });
      }

      logger.success(`Successfully tagged ${mp3Files.length} files`);
    } catch (error) {
      logger.error('Failed to tag files', error);
      throw error;
    }
  }

  /**
   * Embed metadata into a single MP3 file
   */
  async embedToFile(
    filePath: string,
    metadata: {
      title: string;
      artist: string;
      album: string;
      performerInfo?: string;
      trackNumber?: string;
      genre?: string;
      year?: string;
      comment?: string;
      coverBuffer?: Buffer;
    }
  ): Promise<void> {
    const tags: NodeID3.Tags = {
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      performerInfo: metadata.performerInfo,
      trackNumber: metadata.trackNumber,
      genre: metadata.genre || 'Audiobook',
      year: metadata.year,
    };

    // Add comment
    if (metadata.comment) {
      tags.comment = {
        language: 'eng',
        text: metadata.comment,
      };
    }

    // Add cover art
    if (metadata.coverBuffer) {
      tags.image = {
        mime: 'image/jpeg',
        type: {
          id: 3,
          name: 'front cover',
        },
        description: 'Album cover',
        imageBuffer: metadata.coverBuffer,
      };
    }

    // Write tags
    const success = NodeID3.write(tags, filePath);

    if (!success) {
      throw new Error(`Failed to write ID3 tags to: ${filePath}`);
    }
  }

  /**
   * Read metadata from an MP3 file
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

      if (!success) {
        throw new Error('Failed to remove ID3 tags');
      }

      logger.success('Metadata removed successfully');
    } catch (error) {
      logger.error('Failed to remove metadata', error);
      throw error;
    }
  }

  /**
   * Load metadata from JSON file or options
   */
  private async loadMetadata(
    folderPath: string,
    options: EmbedOptions
  ): Promise<{
    title: string;
    authors: string[];
    narrator?: string;
    coverUrl?: string;
    description?: string;
    chapters?: Array<{ title: string }>;
  }> {
    // Try to load from metadata file
    const bookMetadata = await this.readBookMetadata(folderPath);

    if (bookMetadata) {
      logger.info('Found metadata file, using book information');

      // Handle description (can be string or object)
      let description = '';
      if (typeof bookMetadata.metadata.description === 'string') {
        description = bookMetadata.metadata.description;
      } else if (bookMetadata.metadata.description) {
        description =
          bookMetadata.metadata.description.short || bookMetadata.metadata.description.full || '';
      }

      return {
        title: bookMetadata.metadata.title,
        authors: bookMetadata.metadata.authors,
        narrator: bookMetadata.metadata.narrator,
        coverUrl: bookMetadata.metadata.coverUrl,
        description,
        chapters: bookMetadata.chapters,
      };
    }

    // Fallback to options or defaults
    logger.info('No metadata file found, using provided options');

    return {
      title: options.title || path.basename(folderPath),
      authors: options.author ? [options.author] : ['Unknown'],
      narrator: options.narrator,
      coverUrl: options.coverUrl,
      description: options.description,
    };
  }

  /**
   * Read book metadata JSON file
   */
  private async readBookMetadata(folderPath: string): Promise<BookMetadata | null> {
    const metadataFiles = ['metadata.json', '.metadata.json'];

    for (const filename of metadataFiles) {
      try {
        const metadataPath = path.join(folderPath, filename);
        const content = await fs.readFile(metadataPath, 'utf-8');
        return JSON.parse(content);
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Download cover art from URL
   */
  private async downloadCoverArt(coverUrl?: string): Promise<Buffer | undefined> {
    if (!coverUrl) return undefined;

    try {
      logger.info('Downloading cover art...');
      const response = await fetch(coverUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      logger.success('Cover art downloaded');
      return buffer;
    } catch (error) {
      logger.warn('Failed to download cover art:', error);
      return undefined;
    }
  }

  /**
   * Find all MP3 files in folder (sorted)
   */
  private async findMp3Files(folderPath: string): Promise<string[]> {
    const files = await fs.readdir(folderPath);
    return files.filter((f) => f.endsWith('.mp3')).sort();
  }
}
