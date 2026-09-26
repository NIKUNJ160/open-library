'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { searchDocuments } from '@/lib/api';
import { SearchResponse, SearchResultItem } from '@/lib/types';
import { SearchBar } from '@/components/SearchBar';
import { BookCard } from '@/components/BookCard';
import { CitationModal } from '@/components/CitationModal';
import { 
  Loader2, 
  AlertCircle, 
  Filter, 
  Zap, 
  LayoutGrid, 
  List, 
  BookOpen, 
  Calendar, 
  Quote, 
  ExternalLink,
  Clock
} from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const sourceFilter = searchParams.get('source') || '';
  const docTypeFilter = searchParams.get('doc_type') || '';
  const enableRerank = searchParams.get('rerank') !== 'false';

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCitationDoc, setSelectedCitationDoc] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!query) {
      setData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    searchDocuments({
      q: query,
      source: sourceFilter || undefined,
      doc_type: docTypeFilter || undefined,
      enable_rerank: enableRerank,
    })
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to search documents');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [query, sourceFilter, docTypeFilter, enableRerank]);

  const buildFilterUrl = (newSource?: string, newDocType?: string, newRerank?: boolean) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    
    const src = newSource !== undefined ? newSource : sourceFilter;
    if (src) params.set('source', src);

    const dt = newDocType !== undefined ? newDocType : docTypeFilter;
    if (dt) params.set('doc_type', dt);

    const rr = newRerank !== undefined ? newRerank : enableRerank;
    if (!rr) params.set('rerank', 'false');

    return `/search?${params.toString()}`;
  };

  const sourcesList = [
    { label: 'All Sources', value: '' },
    { label: 'Open Library (Books)', value: 'openlibrary' },
    { label: 'Wikipedia (Encyclopedia)', value: 'wikipedia' },
    { label: 'OpenAlex (Scholarly)', value: 'openalex' },
    { label: 'Crossref (DOIs)', value: 'crossref' },
    { label: 'Europe PMC (Preprints)', value: 'europepmc' },
  ];

  const typesList = [
    { label: 'All Formats', value: '' },
    { label: 'Books', value: 'book' },
    { label: 'Papers', value: 'paper' },
    { label: 'Articles', value: 'article' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Header Banner */}
      <div className="bg-library-card border border-library-border rounded-md p-6 sm:p-8 space-y-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-library-accent">
            Library Catalog Search
          </span>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-library-dark">
            {query ? `Results for “${query}”` : 'Search the Public Catalog'}
          </h1>
        </div>
        <div className="max-w-3xl">
          <SearchBar defaultValue={query} size="large" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Filters */}
        <aside className="space-y-6">
          <div className="bg-white border border-library-border rounded-md p-5 space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-library-border text-xs font-bold uppercase tracking-wider text-library-dark">
              <Filter className="w-4 h-4 text-library-accent" />
              <span>Catalog Filters</span>
            </div>

            {/* Neural Reranking Switch */}
            <div className="p-3 rounded-md bg-library-card/60 border border-library-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-library-dark flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-library-accent" />
                  <span>Neural Rerank</span>
                </span>
                <Link
                  href={buildFilterUrl(undefined, undefined, !enableRerank)}
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded transition ${
                    enableRerank
                      ? 'bg-library-accent text-white shadow-xs'
                      : 'bg-library-card border border-library-border text-library-dark hover:border-library-dark'
                  }`}
                >
                  {enableRerank ? 'Active' : 'Off'}
                </Link>
              </div>
              <p className="text-[11px] text-library-secondary leading-snug">
                Joint cross-encoder inference for high-precision semantic ranking.
              </p>
            </div>

            {/* Source Provenance Filter */}
            <div className="space-y-2">
              <h4 className="text-[11px] uppercase font-bold tracking-wider text-library-muted">
                Corpus Source
              </h4>
              <div className="space-y-1 text-xs">
                {sourcesList.map((src) => (
                  <Link
                    key={src.value}
                    href={buildFilterUrl(src.value, undefined)}
                    className={`block px-2.5 py-1.5 rounded transition ${
                      sourceFilter === src.value
                        ? 'bg-library-accent text-white font-bold'
                        : 'text-library-dark hover:bg-library-card'
                    }`}
                  >
                    {src.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Document Type Filter */}
            <div className="space-y-2">
              <h4 className="text-[11px] uppercase font-bold tracking-wider text-library-muted">
                Work Format
              </h4>
              <div className="space-y-1 text-xs">
                {typesList.map((dt) => (
                  <Link
                    key={dt.value}
                    href={buildFilterUrl(undefined, dt.value)}
                    className={`block px-2.5 py-1.5 rounded transition ${
                      docTypeFilter === dt.value
                        ? 'bg-library-accent text-white font-bold'
                        : 'text-library-dark hover:bg-library-card'
                    }`}
                  >
                    {dt.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Search Results Area */}
        <section className="lg:col-span-3 space-y-6">
          {/* Top Results Toolbar */}
          <div className="bg-white border border-library-border rounded-md px-4 py-3 flex items-center justify-between text-xs text-library-secondary">
            <div className="flex items-center gap-3">
              {data && (
                <span>
                  Found <strong>{data.total}</strong> works ({data.search_time_ms} ms)
                </span>
              )}
              {data?.reranked && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-library-accent px-1.5 py-0.5 rounded bg-library-card border border-library-border">
                  Neural Reranked
                </span>
              )}
            </div>

            {/* View Mode Toggle: Grid vs List (Section 12) */}
            <div className="flex items-center gap-1 border border-library-border rounded p-0.5 bg-library-card/50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-library-accent' : 'text-library-muted hover:text-library-dark'
                }`}
                title="Grid View (Book Covers)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-library-accent' : 'text-library-muted hover:text-library-dark'
                }`}
                title="List View (Bibliographic Rows)"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Result States */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-library-border rounded-md">
              <Loader2 className="w-7 h-7 text-library-accent animate-spin mb-3" />
              <p className="text-xs uppercase tracking-wider text-library-secondary">
                Retrieving catalog & neural scores...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-6 text-red-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Query Failed</h4>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && data && data.results.length === 0 && (
            <div className="bg-white border border-library-border rounded-md p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-library-muted mx-auto" />
              <h3 className="font-editorial text-lg font-bold text-library-dark">No Works Found</h3>
              <p className="text-xs text-library-secondary max-w-md mx-auto">
                No catalog items matched your query. Try broadening your terms or removing format filters.
              </p>
            </div>
          )}

          {/* Results: Grid View */}
          {!loading && !error && data && data.results.length > 0 && viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {data.results.map((item) => (
                <BookCard
                  key={item.id}
                  item={item}
                  onCite={(doc) => setSelectedCitationDoc({ id: doc.id, title: doc.title })}
                />
              ))}
            </div>
          )}

          {/* Results: List View (Section 12 specification) */}
          {!loading && !error && data && data.results.length > 0 && viewMode === 'list' && (
            <div className="space-y-3">
              {data.results.map((item) => {
                const year = item.published_at ? new Date(item.published_at).getFullYear() : null;
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-library-border rounded-md p-5 hover:border-library-accent/60 transition flex flex-col sm:flex-row items-start justify-between gap-4 group"
                  >
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider">
                        <span className="px-2 py-0.5 rounded bg-library-card border border-library-border text-library-secondary">
                          {item.source}
                        </span>
                        <span className="text-library-accent">
                          {item.doc_type || 'work'}
                        </span>
                        {year && (
                          <span className="text-library-muted font-mono">
                            • {year}
                          </span>
                        )}
                        <span className="text-library-muted">
                          • {item.license}
                        </span>
                      </div>

                      <Link
                        href={`/document/${item.id}`}
                        className="font-editorial text-lg font-bold text-library-dark group-hover:text-library-accent transition block leading-snug"
                      >
                        {item.title}
                      </Link>

                      {item.authors && item.authors.length > 0 && (
                        <p className="text-xs text-library-secondary italic">
                          By {item.authors.join(', ')}
                        </p>
                      )}

                      {item.snippet && (
                        <p className="text-xs text-library-secondary leading-relaxed line-clamp-2">
                          {item.snippet}
                        </p>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-library-border/50">
                      <Link
                        href={`/read/${item.id}`}
                        className="px-3.5 py-1.5 rounded bg-library-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-library-accent-hover transition flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read</span>
                      </Link>
                      <button
                        onClick={() => setSelectedCitationDoc({ id: item.id, title: item.title })}
                        className="px-3 py-1.5 rounded border border-library-border hover:bg-library-card text-xs font-medium text-library-dark transition flex items-center gap-1"
                      >
                        <Quote className="w-3 h-3 text-library-muted" />
                        <span>Cite</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Citation Modal */}
      {selectedCitationDoc && (
        <CitationModal
          documentId={selectedCitationDoc.id}
          documentTitle={selectedCitationDoc.title}
          onClose={() => setSelectedCitationDoc(null)}
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-library-accent animate-spin mb-3" />
          <p className="text-xs uppercase tracking-wider text-library-secondary">
            Loading Catalog Search...
          </p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
