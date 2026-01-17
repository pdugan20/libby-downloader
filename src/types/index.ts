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
