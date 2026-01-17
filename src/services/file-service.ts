/**
 * FileService - File system operations abstraction layer
 * Makes testing easier by providing a mockable interface
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export class FileService {
  /**
   * Check if a path exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file as string
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    return fs.readFile(filePath, encoding);
  }

  /**
   * Read file as buffer
   */
  async readFileBuffer(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  /**
   * Write file
   */
  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    return fs.writeFile(filePath, content);
  }

  /**
   * Read directory
   */
  async readdir(dirPath: string): Promise<string[]> {
    return fs.readdir(dirPath);
  }

  /**
   * Read directory with file types
   */
  async readdirWithFileTypes(
    dirPath: string
  ): Promise<Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>> {
    return fs.readdir(dirPath, { withFileTypes: true });
  }

  /**
   * Get file/directory stats
   */
  async stat(filePath: string): Promise<{
    isDirectory(): boolean;
    isFile(): boolean;
    birthtime: Date;
    mtime: Date;
    size: number;
  }> {
    return fs.stat(filePath);
  }

  /**
   * Join path segments
   */
  join(...segments: string[]): string {
    return path.join(...segments);
  }

  /**
   * Get file basename
   */
  basename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  /**
   * Get file directory name
   */
  dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Get file extension
   */
  extname(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Resolve path
   */
  resolve(...pathSegments: string[]): string {
    return path.resolve(...pathSegments);
  }

  /**
   * Check if path is absolute
   */
  isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }
}
