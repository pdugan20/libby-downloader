// Main exports for the library
export { BrowserManager } from './browser/manager';
export { LibbyAuth } from './auth/libby-auth';
export { LibbyAPI } from './downloader/libby-api';
export { ChapterDownloader } from './downloader/chapter-downloader';
export { FFmpegProcessor } from './processor/ffmpeg-processor';
export { MetadataEmbedder } from './metadata/embedder';
export { RateLimiter } from './utils/rate-limiter';
export { logger, LogLevel } from './utils/logger';
export * from './types';
