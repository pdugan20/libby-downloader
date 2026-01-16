import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * Ensure a directory exists, create it if it doesn't
 */
export async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Sanitize a filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 200); // Limit length
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Get the size of a file in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Create a unique temporary directory
 */
export async function createTempDir(basePath: string): Promise<string> {
  const tempDirName = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const tempDirPath = path.join(basePath, tempDirName);
  await ensureDir(tempDirPath);
  return tempDirPath;
}

/**
 * Recursively delete a directory
 */
export async function deleteDir(dirPath: string): Promise<void> {
  if (existsSync(dirPath)) {
    await fs.rm(dirPath, { recursive: true, force: true });
  }
}
