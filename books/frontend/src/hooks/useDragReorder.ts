import { useCallback } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { DateGroup, Album } from '../../../shared/types/library';
import { reorderFlatAlbumList } from '../utils/dndInvariants';
import { reorderAlbumsApi } from '../services/apiClient';
import { saveLocalAlbumOrder } from '../services/storageAdapter';

export function useDragReorder(
  dateGroups: DateGroup[],
  setDateGroups: React.Dispatch<React.SetStateAction<DateGroup[]>>
) {
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      // Flatten all albums to re-sequence displayOrder indices
      const allAlbums: Album[] = [];
      dateGroups.forEach((g) => allAlbums.push(...g.albums));

      const reorderedAll = reorderFlatAlbumList(allAlbums, activeId, overId);

      // Re-map back into date groups while preserving flat invariant
      const newGroups = dateGroups.map((group) => {
        const groupAlbumIds = new Set(group.albums.map((a) => a.id));
        const updatedGroupAlbums = reorderedAll.filter((a) => groupAlbumIds.has(a.id));
        return {
          ...group,
          albums: updatedGroupAlbums,
        };
      });

      // Optimistically update UI
      setDateGroups(newGroups);

      // Save local cache & API sync
      const orderedIds = reorderedAll.map((a) => a.id);
      saveLocalAlbumOrder(orderedIds);

      try {
        await reorderAlbumsApi(orderedIds);
      } catch (err) {
        console.error('Failed to sync album order to server:', err);
      }
    },
    [dateGroups, setDateGroups]
  );

  return { handleDragEnd };
}
