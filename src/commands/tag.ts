/**
 * Tag command - Embed metadata into MP3 files
 */

import { logger } from '../utils/logger';
import { MetadataService } from '../services/metadata-service';

export interface TagOptions {
  title?: string;
  author?: string;
  narrator?: string;
  coverUrl?: string;
  description?: string;
  all?: boolean;
}

/**
 * Tag MP3 files in a folder with metadata
 */
export async function tagFiles(folderPath: string, options: TagOptions): Promise<void> {
  try {
    const metadataService = new MetadataService();

    await metadataService.embedToFolder(folderPath, {
      title: options.title,
      author: options.author,
      narrator: options.narrator,
      coverUrl: options.coverUrl,
      description: options.description,
    });
  } catch (error) {
    logger.error('Failed to tag files', error);
    throw error;
  }
}
