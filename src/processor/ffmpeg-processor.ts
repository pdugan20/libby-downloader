import { promises as fs } from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { logger } from '../utils/logger';
import { LibbyChapter, AudioMetadata } from '../types';

export class FFmpegProcessor {
  /**
   * Merge multiple MP3 files into a single file
   */
  async mergeChapters(
    inputFiles: string[],
    outputPath: string,
    metadata?: AudioMetadata
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info(`Merging ${inputFiles.length} chapters into: ${outputPath}`);

        // Create a file list for FFmpeg concat
        const listPath = path.join(path.dirname(outputPath), 'filelist.txt');
        const fileList = inputFiles
          .map((file) => `file '${file.replace(/'/g, "'\\''")}'`)
          .join('\n');

        await fs.writeFile(listPath, fileList);

        // Build FFmpeg command
        const command = ffmpeg()
          .input(listPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy']); // Copy without re-encoding for speed

        // Add metadata if provided
        if (metadata) {
          if (metadata.title) command.outputOptions(['-metadata', `title=${metadata.title}`]);
          if (metadata.artist) command.outputOptions(['-metadata', `artist=${metadata.artist}`]);
          if (metadata.album) command.outputOptions(['-metadata', `album=${metadata.album}`]);
          if (metadata.year) command.outputOptions(['-metadata', `date=${metadata.year}`]);
          if (metadata.genre) command.outputOptions(['-metadata', `genre=${metadata.genre}`]);
          if (metadata.comment) command.outputOptions(['-metadata', `comment=${metadata.comment}`]);
        }

        command
          .output(outputPath)
          .on('start', (commandLine) => {
            logger.debug(`FFmpeg command: ${commandLine}`);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              logger.debug(`Merging progress: ${progress.percent.toFixed(1)}%`);
            }
          })
          .on('end', async () => {
            // Clean up file list
            try {
              await fs.unlink(listPath);
            } catch {
              // Ignore cleanup errors
            }
            logger.success('Chapters merged successfully');
            resolve();
          })
          .on('error', async (err) => {
            // Clean up file list
            try {
              await fs.unlink(listPath);
            } catch {
              // Ignore cleanup errors
            }
            logger.error('FFmpeg merge failed', err);
            reject(err);
          })
          .run();
      } catch (error) {
        logger.error('Failed to merge chapters', error);
        reject(error);
      }
    });
  }

  /**
   * Add chapter markers to an audiobook
   */
  async addChapterMarkers(
    inputPath: string,
    outputPath: string,
    chapters: LibbyChapter[]
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info('Adding chapter markers to audiobook');

        // Create FFMETADATA file
        const metadataPath = path.join(path.dirname(outputPath), 'ffmetadata.txt');
        const metadata = this.generateFFMetadata(chapters);
        await fs.writeFile(metadataPath, metadata);

        // Apply metadata with FFmpeg
        ffmpeg(inputPath)
          .input(metadataPath)
          .outputOptions(['-map_metadata', '1', '-c', 'copy'])
          .output(outputPath)
          .on('start', (commandLine) => {
            logger.debug(`FFmpeg command: ${commandLine}`);
          })
          .on('end', async () => {
            // Clean up metadata file
            try {
              await fs.unlink(metadataPath);
            } catch {
              // Ignore cleanup errors
            }
            logger.success('Chapter markers added successfully');
            resolve();
          })
          .on('error', async (err) => {
            // Clean up metadata file
            try {
              await fs.unlink(metadataPath);
            } catch {
              // Ignore cleanup errors
            }
            logger.error('Failed to add chapter markers', err);
            reject(err);
          })
          .run();
      } catch (error) {
        logger.error('Failed to add chapter markers', error);
        reject(error);
      }
    });
  }

  /**
   * Generate FFMETADATA1 format for chapter markers
   */
  private generateFFMetadata(chapters: LibbyChapter[]): string {
    let metadata = ';FFMETADATA1\n\n';

    // Calculate end times
    const chaptersWithEnd = chapters.map((chapter, index) => {
      const startMs = Math.round(chapter.startTime * 1000);
      const endMs =
        index < chapters.length - 1
          ? Math.round(chapters[index + 1].startTime * 1000)
          : Math.round((chapter.startTime + chapter.duration) * 1000);

      return {
        title: chapter.title,
        startMs,
        endMs,
      };
    });

    // Add chapter entries
    for (const chapter of chaptersWithEnd) {
      const escapedTitle = chapter.title
        .replace(/\\/g, '\\\\')
        .replace(/#/g, '\\#')
        .replace(/;/g, '\\;')
        .replace(/=/g, '\\=')
        .replace(/\n/g, '');

      metadata += '[CHAPTER]\n';
      metadata += `TIMEBASE=1/1000\n`;
      metadata += `START=${chapter.startMs}\n`;
      metadata += `END=${chapter.endMs}\n`;
      metadata += `title=${escapedTitle}\n\n`;
    }

    return metadata;
  }

  /**
   * Add cover art to an audio file
   */
  async addCoverArt(inputPath: string, outputPath: string, coverPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info('Adding cover art to audiobook');

      ffmpeg(inputPath)
        .input(coverPath)
        .outputOptions([
          '-map',
          '0:0',
          '-map',
          '1:0',
          '-c',
          'copy',
          '-id3v2_version',
          '3',
          '-metadata:s:v',
          'title=Album cover',
          '-metadata:s:v',
          'comment=Cover (front)',
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('end', () => {
          logger.success('Cover art added successfully');
          resolve();
        })
        .on('error', (err) => {
          logger.error('Failed to add cover art', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Check if FFmpeg is installed
   */
  async checkFFmpeg(): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err, _formats) => {
        if (err) {
          logger.error('FFmpeg not found or not working properly');
          resolve(false);
        } else {
          logger.debug('FFmpeg is available');
          resolve(true);
        }
      });
    });
  }
}
