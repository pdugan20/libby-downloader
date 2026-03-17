/**
 * Tag command - Embed metadata into MP3 files
 * Direct tagging is now handled by Ink components in src/ui/ink/TagProgress.tsx
 */

import { MetadataService, EmbedOptions } from '../services/metadata-service';

/**
 * Tag MP3 files in a folder with metadata (non-interactive, no UI)
 */
export async function tagFiles(folderPath: string, options: EmbedOptions): Promise<void> {
  const metadataService = new MetadataService();
  await metadataService.embedToFolder(folderPath, options);
}
