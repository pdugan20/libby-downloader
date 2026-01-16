export interface LibbyBook {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  narrator?: string;
  duration?: number; // in minutes
  coverUrl?: string;
  publisher?: string;
  publishDate?: string;
  description?: string;
}

export interface LibbyChapter {
  index: number;
  title: string;
  url: string;
  duration: number; // in seconds
  startTime: number; // in seconds
}

export interface DownloadProgress {
  bookId: string;
  bookTitle: string;
  totalChapters: number;
  downloadedChapters: number;
  currentChapter?: string;
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface StealthConfig {
  mode: 'aggressive' | 'balanced' | 'safe';
  delayBetweenChapters: {
    min: number; // milliseconds
    max: number;
  };
  occasionalBreak: {
    enabled: boolean;
    afterChapters: number;
    duration: {
      min: number;
      max: number;
    };
  };
  mouseMovements: boolean;
  randomScrolling: boolean;
  maxBooksPerHour: number;
}

export interface SessionConfig {
  cookiesPath: string;
  userDataDir: string;
  headless: boolean;
}

export interface DownloadConfig {
  outputDir: string;
  tempDir: string;
  keepTempFiles: boolean;
  mergeChapters: boolean;
  embedMetadata: boolean;
}

export interface LibbyCredentials {
  cardNumber?: string;
  pin?: string;
  library?: string;
}

export interface AudioMetadata {
  title: string;
  artist: string;
  album?: string;
  year?: string;
  genre?: string;
  publisher?: string;
  comment?: string;
  image?: string; // path to cover image
  chapters?: ChapterMetadata[];
}

export interface ChapterMetadata {
  title: string;
  startTime: number; // milliseconds
  endTime?: number;
}
