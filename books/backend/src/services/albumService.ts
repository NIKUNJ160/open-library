import { getDb } from '../db/connection';
import { Album, DateGroup, CreateAlbumInput } from '../../../shared/types/library';
import { v4 as uuidv4 } from 'uuid';

export async function getAlbumsGroupedByDate(): Promise<DateGroup[]> {
  const db = await getDb();
  const rows = await db.all<any[]>(
    'SELECT * FROM albums ORDER BY date DESC, display_order ASC'
  );

  const albums: Album[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    date: r.date,
    displayOrder: r.display_order,
    coverMediaId: r.cover_media_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  // Group by YYYY-MM
  const groupMap = new Map<string, Album[]>();
  for (const album of albums) {
    const key = album.date ? album.date.substring(0, 7) : 'Uncategorized';
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(album);
  }

  const result: DateGroup[] = [];
  for (const [groupKey, albumList] of groupMap.entries()) {
    const dateObj = new Date(`${groupKey}-01`);
    const groupTitle = isNaN(dateObj.getTime())
      ? groupKey
      : dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    result.push({
      groupKey,
      groupTitle,
      albums: albumList,
    });
  }

  return result;
}

export async function createAlbum(input: CreateAlbumInput): Promise<Album> {
  const db = await getDb();
  const id = uuidv4();
  const maxOrderRow = await db.get<{ maxOrder: number }>('SELECT MAX(display_order) as maxOrder FROM albums');
  const displayOrder = (maxOrderRow?.maxOrder || 0) + 1;

  await db.run(
    `INSERT INTO albums (id, title, description, category, date, display_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.title, input.description || null, input.category, input.date, displayOrder]
  );

  return {
    id,
    title: input.title,
    description: input.description,
    category: input.category,
    date: input.date,
    displayOrder,
  };
}

export async function reorderAlbums(orderedAlbumIds: string[]): Promise<void> {
  const db = await getDb();
  await db.run('BEGIN TRANSACTION');
  try {
    for (let index = 0; index < orderedAlbumIds.length; index++) {
      const albumId = orderedAlbumIds[index];
      await db.run(
        'UPDATE albums SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [index + 1, albumId]
      );
    }
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}
