/**
 * Tag command - Embed metadata into MP3 files
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import NodeID3 from 'node-id3';
import { logger } from '../utils/logger';

export interface TagOptions {
  title?: string;
  author?: string;
  narrator?: string;
  coverUrl?: string;
  description?: string;
  all?: boolean;
}

interface BookMetadata {
  metadata: {
    title: string;
    subtitle?: string;
    authors: string[];
    narrator: string;
    coverUrl?: string;
    description?: string | { full: string; short: string };
    duration?: number;
  };
  chapters: Array<{
    index: number;
    title: string;
    duration: number;
    url?: string;
    startTime?: number | null;
  }>;
}

/**
 * Tag MP3 files in a folder with metadata
 */
export async function tagFiles(folderPath: string, options: TagOptions): Promise<void> {
  try {
    logger.info(`Tagging MP3 files in: ${folderPath}`);

    // Check if folder exists
    const folderStat = await fs.stat(folderPath);
    if (!folderStat.isDirectory()) {
      throw new Error(`Not a directory: ${folderPath}`);
    }

    // Look for metadata file in folder
    const folderContents = await fs.readdir(folderPath);
    const metadataFile = folderContents.find(
      (f) => f === 'metadata.json' || f.endsWith('-metadata.json') || f === '.metadata.json'
    );

    let bookMetadata: BookMetadata | null = null;

    if (metadataFile) {
      try {
        const metadataPath = path.join(folderPath, metadataFile);
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        bookMetadata = JSON.parse(metadataContent);
        logger.info('Found metadata file, using book information');
      } catch {
        logger.info('No metadata file found, using provided options');
      }
    } else {
      logger.info('No metadata file found, using provided options');
    }

    // Get metadata values (prefer metadata file, fallback to options)
    const title = bookMetadata?.metadata.title || options.title || path.basename(folderPath);
    const authors =
      bookMetadata?.metadata.authors || (options.author ? [options.author] : ['Unknown']);
    const narrator = bookMetadata?.metadata.narrator || options.narrator || '';
    const coverUrl = bookMetadata?.metadata.coverUrl || options.coverUrl;

    // Handle description (can be string or object with full/short)
    let description = options.description || '';
    if (bookMetadata?.metadata.description) {
      if (typeof bookMetadata.metadata.description === 'string') {
        description = bookMetadata.metadata.description;
      } else {
        description =
          bookMetadata.metadata.description.short || bookMetadata.metadata.description.full || '';
      }
    }

    logger.info(`Book: ${title}`);
    logger.info(`Author: ${authors.join(', ')}`);
    if (narrator) logger.info(`Narrator: ${narrator}`);

    // Download cover art if URL provided
    let coverBuffer: Buffer | undefined;
    if (coverUrl) {
      try {
        logger.info('Downloading cover art...');
        const response = await fetch(coverUrl);
        const arrayBuffer = await response.arrayBuffer();
        coverBuffer = Buffer.from(arrayBuffer);
        logger.success('Cover art downloaded');
      } catch (error) {
        logger.warn('Failed to download cover art:', error);
      }
    }

    // Find all MP3 files in folder
    const files = await fs.readdir(folderPath);
    const mp3Files = files.filter((f) => f.endsWith('.mp3')).sort();

    if (mp3Files.length === 0) {
      throw new Error('No MP3 files found in folder');
    }

    logger.info(`Found ${mp3Files.length} MP3 files`);

    // Tag each file
    for (let i = 0; i < mp3Files.length; i++) {
      const filePath = path.join(folderPath, mp3Files[i]);
      const chapterNum = i + 1;

      // Get chapter title from metadata if available
      let chapterTitle = `Chapter ${chapterNum}`;
      if (bookMetadata?.chapters && bookMetadata.chapters[i]) {
        chapterTitle = bookMetadata.chapters[i].title;
      }

      logger.info(`Tagging ${mp3Files[i]} (${chapterNum}/${mp3Files.length})`);

      const tags: NodeID3.Tags = {
        title: chapterTitle,
        artist: authors.join(', '),
        album: title,
        performerInfo: narrator || authors.join(', '),
        trackNumber: `${chapterNum}/${mp3Files.length}`,
        genre: 'Audiobook',
        comment: {
          language: 'eng',
          text: description || 'Downloaded with libby-downloader',
        },
      };

      // Add cover art if we have it
      if (coverBuffer) {
        tags.image = {
          mime: 'image/jpeg',
          type: {
            id: 3,
            name: 'front cover',
          },
          description: 'Album cover',
          imageBuffer: coverBuffer,
        };
      }

      // Write tags
      const success = NodeID3.write(tags, filePath);

      if (!success) {
        logger.warn(`Failed to tag: ${mp3Files[i]}`);
      }
    }

    logger.success(`Successfully tagged ${mp3Files.length} files`);
  } catch (error) {
    logger.error('Failed to tag files', error);
    throw error;
  }
}
