import { getDb } from '../db/connection';
import { MediaItem, CreateMediaItemInput } from '../../../shared/types/library';
import { v4 as uuidv4 } from 'uuid';

export async function getMediaItemsByAlbum(albumId: string): Promise<MediaItem[]> {
  const db = await getDb();
  const rows = await db.all<any[]>(
    'SELECT * FROM media_items WHERE album_id = ? ORDER BY tile_position ASC',
    [albumId]
  );

  return rows.map((r) => ({
    id: r.id,
    albumId: r.album_id,
    title: r.title,
    mediaType: r.media_type,
    url: r.url,
    thumbnailUrl: r.thumbnail_url,
    tilePosition: r.tile_position,
    fileSizeBytes: r.file_size_bytes,
    metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
    createdAt: r.created_at,
  }));
}

export async function addMediaItem(input: CreateMediaItemInput): Promise<MediaItem> {
  const db = await getDb();
  const id = uuidv4();
  const maxPosRow = await db.get<{ maxPos: number }>(
    'SELECT MAX(tile_position) as maxPos FROM media_items WHERE album_id = ?',
    [input.albumId]
  );
  const tilePosition = (maxPosRow?.maxPos || 0) + 1;
  const thumbnailUrl = input.thumbnailUrl || input.url;

  await db.run(
    `INSERT INTO media_items (id, album_id, title, media_type, url, thumbnail_url, tile_position)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.albumId, input.title, input.mediaType, input.url, thumbnailUrl, tilePosition]
  );

  // Set as cover if album has no cover
  const album = await db.get<any>('SELECT cover_media_id FROM albums WHERE id = ?', [input.albumId]);
  if (album && !album.cover_media_id) {
    await db.run('UPDATE albums SET cover_media_id = ? WHERE id = ?', [id, input.albumId]);
  }

  return {
    id,
    albumId: input.albumId,
    title: input.title,
    mediaType: input.mediaType,
    url: input.url,
    thumbnailUrl,
    tilePosition,
  };
}
