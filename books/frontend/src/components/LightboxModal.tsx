import React from 'react';
import { MediaItem } from '../../../shared/types/library';
import { X, ExternalLink } from 'lucide-react';

interface LightboxModalProps {
  item: MediaItem | null;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800 text-white">
          <h3 className="font-semibold text-lg line-clamp-1">{item.title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 bg-black flex items-center justify-center p-4 overflow-hidden min-h-[300px]">
          <img
            src={item.url}
            alt={item.title}
            className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md"
          />
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Type: {item.mediaType}</span>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-medium"
          >
            <span>Open Original</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
