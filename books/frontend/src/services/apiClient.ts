import { Album, DateGroup, MediaItem, CreateAlbumInput, CreateMediaItemInput } from '../../../shared/types/library';

const API_BASE = '/api';

export async function fetchDateGroups(): Promise<DateGroup[]> {
  const res = await fetch(`${API_BASE}/albums`);
  if (!res.ok) throw new Error('Failed to fetch album date groups');
  return res.json();
}

export async function createAlbumApi(input: CreateAlbumInput): Promise<Album> {
  const res = await fetch(`${API_BASE}/albums`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create album');
  return res.json();
}

export async function reorderAlbumsApi(orderedAlbumIds: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/albums/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedAlbumIds }),
  });
  if (!res.ok) throw new Error('Failed to reorder albums');
}

export async function fetchMediaItemsByAlbum(albumId: string): Promise<MediaItem[]> {
  const res = await fetch(`${API_BASE}/albums/${albumId}/items`);
  if (!res.ok) throw new Error('Failed to fetch media items');
  return res.json();
}

export async function addMediaItemApi(input: CreateMediaItemInput): Promise<MediaItem> {
  const res = await fetch(`${API_BASE}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to add media item');
  return res.json();
}
