/**
 * Book discovery and management utilities
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from './logger';

export interface BookInfo {
  name: string;
  path: string;
  chapterCount: number;
  hasMetadata: boolean;
  isTagged: boolean;
  isMerged: boolean;
  metadataJson?: {
    metadata: {
      title: string;
      authors: string[];
      narrator?: string;
      coverUrl?: string;
    };
    chapters: Array<{ title: string }>;
  };
  downloadedAt?: Date;
}

/**
 * Get the default libby-downloads folder
 */
export function getDownloadsFolder(): string {
  return path.join(os.homedir(), 'Downloads', 'libby-downloads');
}

/**
 * Discover all books in the libby-downloads folder
 */
export async function discoverBooks(): Promise<BookInfo[]> {
  const downloadsFolder = getDownloadsFolder();

  try {
    // Check if downloads folder exists
    await fs.access(downloadsFolder);
  } catch {
    // Folder doesn't exist
    return [];
  }

  const entries = await fs.readdir(downloadsFolder, { withFileTypes: true });
  const books: BookInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const bookPath = path.join(downloadsFolder, entry.name);
    const bookInfo = await analyzeBook(bookPath, entry.name);

    if (bookInfo) {
      books.push(bookInfo);
    }
  }

  // Sort by download time (newest first)
  books.sort((a, b) => {
    const timeA = a.downloadedAt?.getTime() || 0;
    const timeB = b.downloadedAt?.getTime() || 0;
    return timeB - timeA;
  });

  return books;
}

/**
 * Analyze a book folder to get its status
 */
export async function analyzeBook(bookPath: string, name: string): Promise<BookInfo | null> {
  try {
    const files = await fs.readdir(bookPath);

    // Count MP3 files
    const mp3Files = files.filter((f) => f.endsWith('.mp3') && f.startsWith('chapter-'));
    if (mp3Files.length === 0) {
      // Not a valid book folder
      return null;
    }

    // Check for metadata.json (try both with and without leading dot)
    const metadataFiles = ['metadata.json', '.metadata.json'];
    let hasMetadata = false;
    let metadataJson;

    for (const filename of metadataFiles) {
      try {
        const metadataPath = path.join(bookPath, filename);
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        metadataJson = JSON.parse(metadataContent);
        hasMetadata = true;
        break;
      } catch {
        continue;
      }
    }

    // Check if files are tagged (check first MP3 for ID3 tags)
    let isTagged = false;
    if (mp3Files.length > 0) {
      isTagged = await checkIfTagged(path.join(bookPath, mp3Files[0]));
    }

    // Check for merged file
    const mergedFiles = files.filter(
      (f) => f.endsWith('.m4b') || (f.endsWith('.mp3') && !f.startsWith('chapter-'))
    );
    const isMerged = mergedFiles.length > 0;

    // Get download time from folder stats
    const stats = await fs.stat(bookPath);

    return {
      name,
      path: bookPath,
      chapterCount: mp3Files.length,
      hasMetadata,
      isTagged,
      isMerged,
      metadataJson,
      downloadedAt: stats.birthtime,
    };
  } catch (error) {
    logger.debug(`Failed to analyze book folder ${name}:`, error);
    return null;
  }
}

/**
 * Check if an MP3 file has ID3 tags embedded
 */
async function checkIfTagged(filePath: string): Promise<boolean> {
  try {
    // Use ffprobe to check for metadata
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      filePath,
    ]);

    const data = JSON.parse(stdout);
    const tags = data.format?.tags || {};

    // Check if both album and artist tags exist and are properly set
    // Artist should not be "Unknown" (which happens with partial tagging)
    const hasAlbum = !!tags.album;
    const hasArtist = !!tags.artist && tags.artist !== 'Unknown';

    return hasAlbum && hasArtist;
  } catch {
    // If ffprobe fails, assume not tagged
    return false;
  }
}

/**
 * Find a book by name (fuzzy match)
 */
export async function findBook(nameOrIndex: string): Promise<BookInfo | null> {
  const books = await discoverBooks();

  // Try as index first
  const index = parseInt(nameOrIndex, 10);
  if (!isNaN(index) && index > 0 && index <= books.length) {
    return books[index - 1];
  }

  // Try exact match
  let book = books.find((b) => b.name === nameOrIndex);
  if (book) return book;

  // Try case-insensitive match
  const lowerName = nameOrIndex.toLowerCase();
  book = books.find((b) => b.name.toLowerCase() === lowerName);
  if (book) return book;

  // Try partial match
  book = books.find((b) => b.name.toLowerCase().includes(lowerName));
  return book || null;
}

/**
 * Format time ago string
 */
export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}
