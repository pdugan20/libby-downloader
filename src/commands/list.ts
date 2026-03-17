/**
 * List command - Now handled by Ink components in src/ui/ink/BookList.tsx
 * This file is kept for backward compatibility with tests.
 */

export async function listBooks(_dataDir?: string): Promise<void> {
  // List mode is now rendered via Ink in cli.ts
  // This function is no longer called directly
}
