/**
 * Book-related type definitions
 */

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
