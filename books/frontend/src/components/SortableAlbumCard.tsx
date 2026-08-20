import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Album } from '../../../shared/types/library';
import { AlbumCard } from './AlbumCard';

interface SortableAlbumCardProps {
  album: Album;
  onClick: (album: Album) => void;
}

export const SortableAlbumCard: React.FC<SortableAlbumCardProps> = ({ album, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: album.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AlbumCard
        album={album}
        onClick={onClick}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};
