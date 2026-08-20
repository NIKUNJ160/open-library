import React from 'react';
import { MediaItem } from '../../../shared/types/library';
import { FileText, Image as ImageIcon } from 'lucide-react';

interface MediaTileProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
}

export const MediaTile: React.FC<MediaTileProps> = ({ item, onClick }) => {
  const isDocument = item.mediaType === 'PDF_DOCUMENT' || item.mediaType === 'MARKDOWN_ARTICLE';

  return (
    <div
      onClick={() => onClick(item)}
      className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-brand-500"
    >
      <img
        src={item.thumbnailUrl}
        alt={item.title}
        loading="lazy"
        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
        <div className="flex items-center gap-1.5 text-white">
          {isDocument ? <FileText className="w-4 h-4 text-indigo-300" /> : <ImageIcon className="w-4 h-4 text-sky-300" />}
          <span className="text-xs font-semibold line-clamp-1">{item.title}</span>
        </div>
      </div>
    </div>
  );
};
