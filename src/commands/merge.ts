/**
 * Merge command - Combine MP3 chapters into single M4B audiobook
 */

import { MergeService } from '../services/merge-service';

/**
 * Merge MP3 chapters in a folder into a single M4B audiobook
 */
export async function mergeBook(folderPath: string): Promise<void> {
  const mergeService = new MergeService();
  await mergeService.mergeFolder(folderPath);
}
