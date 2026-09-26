'use client';

import React from 'react';
import Link from 'next/link';
import { SearchResultItem } from '@/lib/types';
import { BookOpen, Calendar, Quote, ExternalLink } from 'lucide-react';

interface BookCardProps {
  item: SearchResultItem;
  onCite?: (item: SearchResultItem) => void;
}

// Deterministic subtle cover backgrounds for books without image files
const COVER_PALETTES = [
  { bg: 'from-amber-900 to-amber-950', border: 'border-amber-800/60', ribbon: 'bg-amber-500' },
  { bg: 'from-red-900 to-stone-950', border: 'border-red-800/60', ribbon: 'bg-red-500' },
  { bg: 'from-slate-800 to-slate-950', border: 'border-slate-700/60', ribbon: 'bg-sky-500' },
  { bg: 'from-emerald-900 to-emerald-950', border: 'border-emerald-800/60', ribbon: 'bg-emerald-500' },
  { bg: 'from-indigo-950 to-stone-950', border: 'border-indigo-900/60', ribbon: 'bg-indigo-500' },
];

export const BookCard: React.FC<BookCardProps> = ({ item, onCite }) => {
  // Select color deterministically based on title length
  const paletteIndex = item.title.length % COVER_PALETTES.length;
  const palette = COVER_PALETTES[paletteIndex];

  const year = item.published_at
    ? new Date(item.published_at).getFullYear()
    : null;

  return (
    <div className="group flex flex-col justify-between bg-white border border-library-border rounded-md p-4 transition-all duration-200 hover:border-library-accent/60 hover:shadow-sm">
      <div className="space-y-3">
        {/* Book Cover Container */}
        <Link
          href={`/document/${item.id}`}
          className={`block relative aspect-[2/3] w-full rounded-sm bg-gradient-to-b ${palette.bg} border ${palette.border} p-4 shadow-sm overflow-hidden group-hover:scale-[1.01] transition-transform`}
        >
          {/* Subtle Book Spine Effect */}
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/20 border-r border-white/10" />

          {/* Top Tag & Bookmark Ribbon */}
          <div className="flex items-center justify-between pl-2">
            <span className="text-[9px] uppercase font-bold tracking-widest text-stone-200">
              {item.doc_type || 'work'}
            </span>
            <div className={`w-2 h-4 ${palette.ribbon} rounded-b-sm shadow-sm`} />
          </div>

          {/* Book Cover Typography */}
          <div className="absolute inset-x-5 bottom-5 space-y-1.5 pl-1">
            <h3 className="font-editorial text-base sm:text-lg font-bold text-white line-clamp-3 leading-snug drop-shadow-sm">
              {item.title}
            </h3>
            {item.authors && item.authors.length > 0 && (
              <p className="text-xs text-stone-200 font-medium line-clamp-1 italic">
                {item.authors.join(', ')}
              </p>
            )}
          </div>
        </Link>

        {/* Book Metadata */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-library-muted">
            <span className="uppercase tracking-wider font-semibold text-library-secondary">
              {item.source}
            </span>
            {year && (
              <div className="flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3" />
                <span>{year}</span>
              </div>
            )}
          </div>

          <Link
            href={`/document/${item.id}`}
            className="font-editorial font-bold text-base text-library-dark group-hover:text-library-accent transition line-clamp-2 leading-snug block"
          >
            {item.title}
          </Link>

          {item.authors && item.authors.length > 0 && (
            <p className="text-xs text-library-secondary line-clamp-1">
              By {item.authors.slice(0, 2).join(', ')}
              {item.authors.length > 2 && ' et al.'}
            </p>
          )}

          {item.snippet && (
            <p className="text-xs text-library-secondary line-clamp-2 leading-relaxed pt-0.5">
              {item.snippet}
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-library-border/60 flex items-center justify-between gap-2 text-xs">
        <Link
          href={`/read/${item.id}`}
          className="inline-flex items-center gap-1 text-library-accent font-semibold hover:underline"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Read</span>
        </Link>

        {onCite && (
          <button
            onClick={() => onCite(item)}
            className="inline-flex items-center gap-1 text-library-muted hover:text-library-dark transition font-medium"
          >
            <Quote className="w-3 h-3" />
            <span>Cite</span>
          </button>
        )}

        <Link
          href={`/document/${item.id}`}
          className="text-library-muted hover:text-library-dark transition text-[11px]"
        >
          Details →
        </Link>
      </div>
    </div>
  );
};
