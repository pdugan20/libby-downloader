/**
 * MergeService - Combines MP3 chapters into a single M4B audiobook
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { logger } from '../utils/logger';

// Set ffmpeg path to bundled binary
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

interface BookMetadata {
  metadata: {
    title: string;
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

interface ChapterInfo {
  file: string;
  filePath: string;
  index: number;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export class MergeService {
  /**
   * Merge all chapter MP3 files in a folder into a single M4B audiobook
   */
  async mergeFolder(folderPath: string): Promise<string> {
    const resolved = path.resolve(folderPath);

    // Validate folder
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      throw new Error(`Not a directory: ${resolved}`);
    }

    const s = p.spinner();

    // Load metadata
    s.start('Loading metadata...');
    const metadata = await this.loadMetadata(resolved);
    s.stop(`Loaded: ${chalk.cyan(metadata.metadata.title)}`);

    // Find chapter files
    s.start('Finding chapter files...');
    const chapterFiles = await this.findChapterFiles(resolved);
    s.stop(`Found ${chalk.cyan(chapterFiles.length.toString())} chapters`);

    // Calculate chapter timestamps
    s.start('Calculating chapter timestamps...');
    const chapters = await this.calculateChapterInfo(resolved, chapterFiles, metadata);
    const totalDuration = chapters.reduce((sum, ch) => sum + ch.duration, 0);
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    s.stop(`Total duration: ${hours}h ${minutes}m`);

    // Create temp directory
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libby-merge-'));

    try {
      // Generate merge files
      s.start('Generating merge files...');

      const concatFilePath = path.join(tmpDir, 'concat.txt');
      await this.createConcatFile(chapterFiles, resolved, concatFilePath);

      const metadataFilePath = path.join(tmpDir, 'metadata.txt');
      await this.generateMetadataFile(metadata, chapters, metadataFilePath);

      let coverArtPath: string | null = null;
      if (metadata.metadata.coverUrl) {
        coverArtPath = await this.downloadCoverArt(
          metadata.metadata.coverUrl,
          path.join(tmpDir, 'cover.jpg')
        );
      }

      s.stop('Merge files ready');

      // Prepare output file
      const sanitizedTitle = this.sanitizeFilename(metadata.metadata.title);
      const outputFilename = `${sanitizedTitle}.m4b`;
      const outputPath = path.join(resolved, outputFilename);

      try {
        await fs.access(outputPath);
        throw new Error(`Output file already exists: ${outputFilename}`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      // Execute merge
      s.start(`Merging ${chapterFiles.length} chapters into M4B...`);
      await this.executeMerge(
        concatFilePath,
        metadataFilePath,
        coverArtPath,
        outputPath,
        (timemark) => {
          s.message(`Merging: ${chalk.cyan(timemark)} / 64kbps AAC`);
        }
      );
      s.stop('Merge complete');

      // Show result
      const fileSize = (await fs.stat(outputPath)).size;
      const sizeStr =
        fileSize < 1024 * 1024
          ? `${(fileSize / 1024).toFixed(0)} KB`
          : `${(fileSize / 1024 / 1024).toFixed(1)} MB`;

      p.log.success(`Created ${chalk.cyan(outputFilename)} (${sizeStr})`);

      return outputPath;
    } finally {
      // Cleanup temp directory
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        logger.debug('Failed to clean up temp directory');
      }
    }
  }

  /**
   * Load and validate book metadata from metadata.json
   */
  private async loadMetadata(folderPath: string): Promise<BookMetadata> {
    const metadataPath = path.join(folderPath, 'metadata.json');

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content) as BookMetadata;

      if (!metadata.metadata?.title) {
        throw new Error('metadata.json missing required field: title');
      }
      if (!metadata.metadata?.authors || metadata.metadata.authors.length === 0) {
        throw new Error('metadata.json missing required field: authors');
      }
      if (!metadata.chapters || metadata.chapters.length === 0) {
        throw new Error('metadata.json has no chapters');
      }

      return metadata;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('metadata.json not found. Download book metadata first.');
      }
      throw error;
    }
  }

  /**
   * Find and validate all chapter MP3 files
   */
  private async findChapterFiles(folderPath: string): Promise<string[]> {
    const files = await fs.readdir(folderPath);
    const chapterFiles = files
      .filter((f) => f.startsWith('chapter-') && f.endsWith('.mp3'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/chapter-(\d+)/)?.[1] || '0', 10);
        const numB = parseInt(b.match(/chapter-(\d+)/)?.[1] || '0', 10);
        return numA - numB;
      });

    if (chapterFiles.length === 0) {
      throw new Error('No chapter MP3 files found. Download chapters first.');
    }

    return chapterFiles;
  }

  /**
   * Get duration of an MP3 file using ffprobe
   */
  private async getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to probe ${filePath}: ${err.message}`));
          return;
        }

        const duration = metadata.format.duration;
        if (!duration) {
          reject(new Error(`Could not determine duration for ${filePath}`));
          return;
        }

        resolve(duration);
      });
    });
  }

  /**
   * Calculate chapter info with timestamps
   */
  private async calculateChapterInfo(
    folderPath: string,
    chapterFiles: string[],
    metadata: BookMetadata
  ): Promise<ChapterInfo[]> {
    const chapters: ChapterInfo[] = [];
    let currentTime = 0;

    for (let i = 0; i < chapterFiles.length; i++) {
      const file = chapterFiles[i];
      const filePath = path.join(folderPath, file);

      let duration: number;
      try {
        duration = await this.getAudioDuration(filePath);
      } catch {
        duration = metadata.chapters[i]?.duration || 0;
      }

      const chapterTitle = metadata.chapters[i]?.title || `Chapter ${i + 1}`;
      const startTimeMs = Math.floor(currentTime * 1000);
      const endTimeMs = Math.floor((currentTime + duration) * 1000);

      chapters.push({
        file,
        filePath,
        index: i,
        title: chapterTitle,
        startTime: startTimeMs,
        endTime: endTimeMs,
        duration,
      });

      currentTime += duration;
    }

    return chapters;
  }

  /**
   * Create concat file listing all chapter MP3s
   */
  private async createConcatFile(
    chapterFiles: string[],
    folderPath: string,
    outputPath: string
  ): Promise<string> {
    const lines = chapterFiles.map((file) => {
      const fullPath = path.join(folderPath, file);
      const escapedPath = fullPath.replace(/'/g, "'\\''");
      return `file '${escapedPath}'`;
    });

    const content = lines.join('\n');
    await fs.writeFile(outputPath, content, 'utf-8');

    return outputPath;
  }

  /**
   * Generate FFmpeg metadata file (FFMETADATA1 format) with chapter markers
   */
  private async generateMetadataFile(
    metadata: BookMetadata,
    chapters: ChapterInfo[],
    outputPath: string
  ): Promise<string> {
    const lines: string[] = [';FFMETADATA1'];

    lines.push(`title=${metadata.metadata.title}`);
    lines.push(`artist=${metadata.metadata.authors.join(', ')}`);
    lines.push(`album=${metadata.metadata.title}`);
    lines.push('genre=Audiobook');

    if (metadata.metadata.narrator) {
      lines.push(`album_artist=${metadata.metadata.narrator}`);
    }

    const description =
      typeof metadata.metadata.description === 'string'
        ? metadata.metadata.description
        : metadata.metadata.description?.short || metadata.metadata.description?.full || '';

    if (description) {
      lines.push(`comment=${description}`);
    }

    for (const chapter of chapters) {
      lines.push('');
      lines.push('[CHAPTER]');
      lines.push('TIMEBASE=1/1000');
      lines.push(`START=${chapter.startTime}`);
      lines.push(`END=${chapter.endTime}`);
      lines.push(`title=${chapter.title}`);
    }

    const content = lines.join('\n');
    await fs.writeFile(outputPath, content, 'utf-8');

    return outputPath;
  }

  /**
   * Download cover art to temporary file
   */
  private async downloadCoverArt(
    coverUrl: string | undefined,
    outputPath: string
  ): Promise<string | null> {
    if (!coverUrl) {
      return null;
    }

    try {
      const response = await fetch(coverUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await fs.writeFile(outputPath, buffer);
      return outputPath;
    } catch {
      return null;
    }
  }

  /**
   * Execute ffmpeg merge with progress reporting
   */
  private async executeMerge(
    concatFilePath: string,
    metadataFilePath: string,
    coverArtPath: string | null,
    outputPath: string,
    onProgress?: (timemark: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let stderrOutput = '';

      const command = ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .input(metadataFilePath)
        .inputOptions(['-f', 'ffmetadata']);

      const outputOptions = [
        '-map',
        '0:a:0',
        '-map_metadata',
        '1',
        '-c:a',
        'aac',
        '-b:a',
        '64k',
        '-ac',
        '2',
        '-movflags',
        '+faststart',
      ];

      if (coverArtPath) {
        command.input(coverArtPath);
        outputOptions.push('-map', '2:v:0', '-c:v', 'copy', '-disposition:v:0', 'attached_pic');
      }

      command
        .outputOptions(outputOptions)
        .output(outputPath)
        .on('progress', (progress) => {
          if (progress.timemark && onProgress) {
            onProgress(progress.timemark);
          }
        })
        .on('stderr', (stderrLine) => {
          stderrOutput += stderrLine + '\n';
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          logger.debug('FFmpeg stderr:\n' + stderrOutput);
          reject(new Error(`Failed to merge audiobook: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Sanitize filename for cross-platform compatibility
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/^\.+/, '')
      .trim();
  }
}
