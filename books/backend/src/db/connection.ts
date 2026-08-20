import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const dbPath = path.resolve(__dirname, '../../library.sqlite');
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Read schema
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await dbInstance.exec(schemaSql);
  }

  // Seed sample albums if database is empty
  const count = await dbInstance.get<{ count: number }>('SELECT COUNT(*) as count FROM albums');
  if (count && count.count === 0) {
    await seedInitialData(dbInstance);
  }

  return dbInstance;
}

async function seedInitialData(db: Database) {
  const seedAlbums = [
    {
      id: 'album-1',
      title: 'Summer Vacation 2026',
      description: 'Beach photos and family trip memories',
      category: 'PHOTO',
      date: '2026-08-15',
      display_order: 1,
      cover_media_id: 'media-1',
    },
    {
      id: 'album-2',
      title: 'Quantum Physics Papers',
      description: 'Open source research papers on quantum computing',
      category: 'RESEARCH_PAPER',
      date: '2026-08-10',
      display_order: 2,
      cover_media_id: 'media-3',
    },
    {
      id: 'album-3',
      title: 'Open Source Classics Library',
      description: 'Classic literature and public domain books',
      category: 'BOOK',
      date: '2026-07-22',
      display_order: 3,
      cover_media_id: 'media-5',
    },
    {
      id: 'album-4',
      title: 'Environmental Policy Reports',
      description: 'Government documents and climate action summaries',
      category: 'GOVT_DOC',
      date: '2026-07-05',
      display_order: 4,
      cover_media_id: 'media-6',
    },
  ];

  for (const album of seedAlbums) {
    await db.run(
      `INSERT INTO albums (id, title, description, category, date, display_order, cover_media_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [album.id, album.title, album.description, album.category, album.date, album.display_order, album.cover_media_id]
    );
  }

  const seedMedia = [
    {
      id: 'media-1',
      album_id: 'album-1',
      title: 'Sunset at the Coast',
      media_type: 'IMAGE_JPEG',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      thumbnail_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
      tile_position: 1,
    },
    {
      id: 'media-2',
      album_id: 'album-1',
      title: 'Palm Trees View',
      media_type: 'IMAGE_JPEG',
      url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800',
      thumbnail_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400',
      tile_position: 2,
    },
    {
      id: 'media-3',
      album_id: 'album-2',
      title: 'Quantum Entanglement & Superposition Overview',
      media_type: 'PDF_DOCUMENT',
      url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
      thumbnail_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
      tile_position: 1,
    },
    {
      id: 'media-4',
      album_id: 'album-2',
      title: 'Qubit Coherence Metrics',
      media_type: 'PDF_DOCUMENT',
      url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800',
      thumbnail_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400',
      tile_position: 2,
    },
    {
      id: 'media-5',
      album_id: 'album-3',
      title: 'Pride and Prejudice Edition 1',
      media_type: 'PDF_DOCUMENT',
      url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
      thumbnail_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
      tile_position: 1,
    },
    {
      id: 'media-6',
      album_id: 'album-4',
      title: 'Global Climate Assessment 2026',
      media_type: 'PDF_DOCUMENT',
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
      thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400',
      tile_position: 1,
    },
  ];

  for (const item of seedMedia) {
    await db.run(
      `INSERT INTO media_items (id, album_id, title, media_type, url, thumbnail_url, tile_position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.album_id, item.title, item.media_type, item.url, item.thumbnail_url, item.tile_position]
    );
  }
}
