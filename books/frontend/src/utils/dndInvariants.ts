import { Album } from '@shared/types/library';

/**
 * Enforces the non-negotiable flat hierarchy rule.
 * Ensures that drag-and-drop array reordering strictly preserves flat album lists
 * and never nests an album inside another album structure.
 */
export function reorderFlatAlbumList(albums: Album[], activeId: string, overId: string): Album[] {
  const oldIndex = albums.findIndex((a) => a.id === activeId);
  const newIndex = albums.findIndex((a) => a.id === overId);

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return albums;
  }

  const result = [...albums];
  const [removed] = result.splice(oldIndex, 1);
  result.splice(newIndex, 0, removed);

  // Re-assign explicit flat displayOrder properties
  return result.map((album, idx) => ({
    ...album,
    displayOrder: idx + 1,
  }));
}
