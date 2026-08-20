// LocalStorage / IndexedDB fallback cache adapter

const REORDER_CACHE_KEY = 'library_reorder_cache';

export function saveLocalAlbumOrder(albumIds: string[]): void {
  try {
    localStorage.setItem(REORDER_CACHE_KEY, JSON.stringify(albumIds));
  } catch (err) {
    console.error('Failed to save album order to localStorage:', err);
  }
}

export function getLocalAlbumOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(REORDER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}
