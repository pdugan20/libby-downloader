/**
 * Merge command - Combine MP3 chapters into single M4B audiobook
 * Direct merging is now handled by Ink components in src/ui/ink/MergeProgress.tsx
 */

import { MergeService } from '../services/merge-service';

export interface MergeOptions {
  force?: boolean;
}

/**
 * Merge MP3 chapters in a folder into a single M4B audiobook (non-interactive, no UI)
 */
export async function mergeBook(folderPath: string, options: MergeOptions = {}): Promise<void> {
  const mergeService = new MergeService();
  if (options.force) {
    await mergeService.mergeFolder(folderPath, { force: true });
    return;
  }
  await mergeService.mergeFolder(folderPath);
}
