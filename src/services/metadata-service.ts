/**
 * MetadataService - Unified metadata embedding service
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

export interface TagProgressCallback {
  onFileStart?: (filename: string, current: number, total: number) => void;
  onComplete?: (totalFiles: number) => void;
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
  async embedToFolder(
    folderPath: string,
    options: EmbedOptions = {},
    onProgress?: TagProgressCallback
  ): Promise<void> {
    const resolvedPath = path.resolve(folderPath);

    // Validate folder
    const folderStat = await fs.stat(resolvedPath);
    if (!folderStat.isDirectory()) {
      throw new Error(`Not a directory: ${resolvedPath}`);
    }

    // Load metadata from file or options
    const metadata = await this.loadMetadata(resolvedPath, options);

    // Download cover art if available
    const coverBuffer = await this.downloadCoverArt(metadata.coverUrl);

    // Find all MP3 files
    const mp3Files = await this.findMp3Files(resolvedPath);
    if (mp3Files.length === 0) {
      throw new Error('No MP3 files found in folder');
    }

    // Tag each file
    for (let i = 0; i < mp3Files.length; i++) {
      const filePath = path.join(resolvedPath, mp3Files[i]);
      const chapterNum = i + 1;
      const chapterTitle = metadata.chapters?.[i]?.title || `Chapter ${chapterNum}`;

      onProgress?.onFileStart?.(mp3Files[i], chapterNum, mp3Files.length);
      // Yield to event loop so UI can re-render between files
      await new Promise((resolve) => setTimeout(resolve, process.env.LIBBY_SLOW_MODE ? 200 : 0));

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

    onProgress?.onComplete?.(mp3Files.length);
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

    if (metadata.comment) {
      tags.comment = {
        language: 'eng',
        text: metadata.comment,
      };
    }

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
    logger.info(`Removing metadata from: ${filePath}`);
    const success = NodeID3.removeTags(filePath);

    if (!success) {
      throw new Error('Failed to remove ID3 tags');
    }

    logger.success('Metadata removed successfully');
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
    const bookMetadata = await this.readBookMetadata(folderPath);

    if (bookMetadata) {
      logger.debug('Found metadata file, using book information');

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

    logger.debug('No metadata file found, using provided options');

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
      const response = await fetch(coverUrl);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
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
