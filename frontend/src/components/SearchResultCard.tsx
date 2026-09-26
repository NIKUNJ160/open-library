'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SearchResultItem } from '@/lib/types';
import { LicenseBadge } from './LicenseBadge';
import { CitationModal } from './CitationModal';
import { ExternalLink, BookOpen, FileText, Globe, Layers, Quote } from 'lucide-react';

interface SearchResultCardProps {
  item: SearchResultItem;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({ item }) => {
  const [citationOpen, setCitationOpen] = useState(false);

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'openlibrary':
        return <BookOpen className="w-4 h-4 text-amber-600" />;
      case 'wikipedia':
        return <Globe className="w-4 h-4 text-sky-600" />;
      case 'openalex':
      case 'crossref':
      case 'europepmc':
      case 'pubmed':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      default:
        return <Layers className="w-4 h-4 text-indigo-600" />;
    }
  };

  const isDoi = item.source === 'crossref' || item.source_id.startsWith('10.');

  return (
    <>
      <article className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider flex-wrap">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100">
              {getSourceIcon(item.source)}
              <span>{item.source}</span>
            </span>
            <span>•</span>
            <span className="capitalize">{item.doc_type}</span>
            {item.published_at && (
              <>
                <span>•</span>
                <span>{item.published_at.slice(0, 10)}</span>
              </>
            )}
            {isDoi && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] lowercase">
                doi:{item.source_id}
              </span>
            )}
          </div>
          <LicenseBadge license={item.license} />
        </div>

        <h3 className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition mb-2">
          <Link href={`/document/${item.id}`}>{item.title}</Link>
        </h3>

        {item.authors && item.authors.length > 0 && (
          <p className="text-xs text-slate-700 mb-2 font-medium">
            Authors: {item.authors.slice(0, 4).join(', ')}
            {item.authors.length > 4 ? ` et al.` : ''}
          </p>
        )}

        <p className="text-sm text-slate-700 leading-relaxed mb-4 line-clamp-3">
          {item.snippet}
        </p>

        <div className="flex items-center justify-between text-xs text-slate-700 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-slate-600">ID: {item.source_id}</span>
            <button
              onClick={() => setCitationOpen(true)}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-indigo-700 font-medium px-2 py-1 rounded-md hover:bg-slate-100 transition"
              title="Export Citation"
            >
              <Quote className="w-3.5 h-3.5 text-indigo-700" />
              <span>Cite</span>
            </button>
          </div>

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <span>Original Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </article>

      {/* Citation Modal */}
      <CitationModal
        documentId={item.id}
        documentTitle={item.title}
        isOpen={citationOpen}
        onClose={() => setCitationOpen(false)}
      />
    </>
  );
};
