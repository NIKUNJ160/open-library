'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchDocuments } from '@/lib/api';
import { SearchResponse } from '@/lib/types';
import { SearchBar } from '@/components/SearchBar';
import { SearchResultCard } from '@/components/SearchResultCard';
import { Loader2, AlertCircle, Filter, BookOpen } from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const sourceFilter = searchParams.get('source') || '';
  const docTypeFilter = searchParams.get('doc_type') || '';

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [query, sourceFilter, docTypeFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Search Bar */}
      <div className="max-w-3xl mb-8">
        <SearchBar initialQuery={query} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Filters Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="p-4 bg-white rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm mb-4">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>Filters</span>
            </div>

            {/* Source Filter */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Source
              </h4>
              <div className="space-y-1 text-sm">
                {['All', 'Open Library', 'Wikipedia', 'OpenAlex', 'Europe PMC'].map((s) => {
                  const val = s === 'All' ? '' : s.toLowerCase().replace(/\s+/g, '');
                  const isSelected = sourceFilter === val;
                  return (
                    <a
                      key={s}
                      href={`/search?q=${encodeURIComponent(query)}${val ? `&source=${val}` : ''}`}
                      className={`block px-2.5 py-1.5 rounded-lg transition ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Search Results */}
        <div className="lg:col-span-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-sm">Searching knowledge repositories...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Backend Offline or Reconnecting</p>
                <p className="text-xs text-amber-700 mt-1">
                  Ensure the FastAPI backend is running at <code className="bg-amber-100 px-1 py-0.5 rounded">http://localhost:8000</code>.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200">
                <span>
                  Showing {data.results.length} of {data.total} results for &quot;{data.query}&quot;
                </span>
                <span>Page {data.page}</span>
              </div>

              {data.results.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-700">No matching knowledge documents</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Try broader search keywords or remove applied filters.
                  </p>
                </div>
              ) : (
                data.results.map((item) => (
                  <SearchResultCard key={item.id} item={item} />
                ))
              )}
            </div>
          )}

          {!loading && !error && !data && !query && (
            <div className="text-center py-20 text-slate-400">
              <p className="text-sm">Enter a search query above to explore documents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
