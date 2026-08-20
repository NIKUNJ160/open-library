import React from 'react';
import { Album } from '../../../shared/types/library';
import { BookOpen, FileText, Image as ImageIcon, Scale, Folder, GripVertical } from 'lucide-react';

interface AlbumCardProps {
  album: Album;
  onClick: (album: Album) => void;
  dragHandleProps?: Record<string, any>;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album, onClick, dragHandleProps }) => {
  const getCategoryBadge = () => {
    switch (album.category) {
      case 'BOOK':
        return { label: 'Book', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <BookOpen className="w-3.5 h-3.5" /> };
      case 'RESEARCH_PAPER':
        return { label: 'Research Paper', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <FileText className="w-3.5 h-3.5" /> };
      case 'GOVT_DOC':
        return { label: 'Government Doc', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Scale className="w-3.5 h-3.5" /> };
      case 'ARTICLE':
        return { label: 'Article', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: <FileText className="w-3.5 h-3.5" /> };
      case 'PHOTO':
        return { label: 'Photo Album', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: <ImageIcon className="w-3.5 h-3.5" /> };
      default:
        return { label: 'Collection', bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: <Folder className="w-3.5 h-3.5" /> };
    }
  };

  const badge = getCategoryBadge();

  return (
    <div
      onClick={() => onClick(album)}
      className="group relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer hover:border-brand-500"
    >
      {/* Drag handle */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder album"
          aria-label={`Drag handle for ${album.title}`}
          className="absolute top-3 right-3 z-10 p-1.5 bg-white/80 backdrop-blur-md rounded-lg text-slate-400 hover:text-slate-700 shadow-sm cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Cover Header */}
      <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
        {album.coverMediaId ? (
          <img
            src={`https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600`}
            alt={album.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
            {badge.icon}
            <span className="text-xs font-medium">No cover image</span>
          </div>
        )}

        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-sm shadow-sm bg-white/90">
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-900 text-base group-hover:text-brand-600 transition-colors line-clamp-1">
          {album.title}
        </h3>
        {album.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{album.description}</p>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
          <span>Date: {album.date}</span>
          <span className="font-medium text-slate-600">Flat Album</span>
        </div>
      </div>
    </div>
  );
};
