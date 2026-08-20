import React from 'react';
import { MediaItem } from '../../../shared/types/library';
import { MediaTile } from './MediaTile';

interface TilePreviewGridProps {
  items: MediaItem[];
  onTileClick: (item: MediaItem) => void;
}

export const TilePreviewGrid: React.FC<TilePreviewGridProps> = ({ items, onTileClick }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
        <p className="text-slate-500 font-medium text-sm">No items in this album yet.</p>
        <p className="text-slate-400 text-xs mt-1">Upload photos or add documents to preview them here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => (
        <MediaTile key={item.id} item={item} onClick={onTileClick} />
      ))}
    </div>
  );
};
