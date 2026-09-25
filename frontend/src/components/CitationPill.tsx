'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SourceCitation } from '@/lib/types';
import { ExternalLink, BookOpen, FileText, Globe, Layers } from 'lucide-react';

interface CitationPillProps {
  index: number;
  source?: SourceCitation;
}

export const CitationPill: React.FC<CitationPillProps> = ({ index, source }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getSourceIcon = (src?: string) => {
    switch (src?.toLowerCase()) {
      case 'openlibrary':
        return <BookOpen className="w-3 h-3 text-amber-600" />;
      case 'wikipedia':
        return <Globe className="w-3 h-3 text-sky-600" />;
      case 'openalex':
      case 'crossref':
      case 'europepmc':
        return <FileText className="w-3 h-3 text-emerald-600" />;
      default:
        return <Layers className="w-3 h-3 text-indigo-600" />;
    }
  };

  if (!source) {
    return (
      <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold font-mono mx-0.5 select-none">
        [{index}]
      </span>
    );
  }

  return (
    <span
      className="relative inline-block mx-0.5 select-none align-baseline"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-indigo-100/80 hover:bg-indigo-200 text-indigo-800 text-[11px] font-bold font-mono cursor-pointer transition shadow-xs"
        onClick={() => setShowTooltip(!showTooltip)}
      >
        [{index}]
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900 text-slate-100 rounded-xl shadow-xl z-50 text-xs border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-slate-400">
              {getSourceIcon(source.source)}
              <span>{source.source}</span>
            </span>
            <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
              {source.license}
            </span>
          </div>

          <h5 className="font-bold text-white mb-1 line-clamp-2 leading-snug">
            {source.title}
          </h5>

          <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed mb-2.5">
            {source.snippet}
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
            <Link
              href={`/document/${source.doc_id}`}
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              View Document &rarr;
            </Link>
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200"
              >
                <span>Upstream</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
          {/* Tooltip caret */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </span>
  );
};
