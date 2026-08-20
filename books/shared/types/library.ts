export type MediaCategory = 'PHOTO' | 'BOOK' | 'RESEARCH_PAPER' | 'GOVT_DOC' | 'ARTICLE' | 'MIXED';

export type MediaType = 'IMAGE_JPEG' | 'IMAGE_PNG' | 'PDF_DOCUMENT' | 'MARKDOWN_ARTICLE';

export interface Album {
  id: string;
  title: string;
  description?: string;
  category: MediaCategory;
  date: string; // ISO 8601 YYYY-MM-DD
  displayOrder: number;
  coverMediaId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaItem {
  id: string;
  albumId: string;
  title: string;
  mediaType: MediaType;
  url: string;
  thumbnailUrl: string;
  tilePosition: number;
  fileSizeBytes?: number;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface DateGroup {
  groupKey: string; // e.g. "2026-08"
  groupTitle: string; // e.g. "August 2026"
  albums: Album[];
}

export interface CreateAlbumInput {
  title: string;
  category: MediaCategory;
  date: string;
  description?: string;
}

export interface CreateMediaItemInput {
  albumId: string;
  title: string;
  mediaType: MediaType;
  url: string;
  thumbnailUrl?: string;
}
