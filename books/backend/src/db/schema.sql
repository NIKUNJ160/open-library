-- Schema for Photo Album & Open Source Knowledge Library

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK(category IN ('PHOTO', 'BOOK', 'RESEARCH_PAPER', 'GOVT_DOC', 'ARTICLE', 'MIXED')),
  date TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  cover_media_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_items (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL,
  title TEXT NOT NULL,
  media_type TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  tile_position INTEGER NOT NULL DEFAULT 0,
  file_size_bytes INTEGER,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_albums_date ON albums(date);
CREATE INDEX IF NOT EXISTS idx_albums_order ON albums(display_order);
CREATE INDEX IF NOT EXISTS idx_media_album_id ON media_items(album_id);
