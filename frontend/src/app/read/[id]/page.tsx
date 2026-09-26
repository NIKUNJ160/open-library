'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getDocument } from '@/lib/api';
import { DocumentDetail } from '@/lib/types';
import { 
  ArrowLeft, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  List, 
  Loader2,
  Type,
  FileText,
  ExternalLink,
  Layers,
  AlertCircle,
  Download
} from 'lucide-react';

function ReaderContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = params.id as string;
  const initialModeParam = searchParams.get('mode');

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reading Mode: 'passages' | 'ia_book' | 'pdf'
  const [readingMode, setReadingMode] = useState<'passages' | 'ia_book' | 'pdf'>('passages');

  // Reader Settings for Passage Mode
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const [theme, setTheme] = useState<'sepia' | 'light' | 'dark'>('sepia');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const doc = await getDocument(documentId);
        setDocument(doc);
        if (initialModeParam === 'ia' && doc.ia_id) {
          setReadingMode('ia_book');
        } else if (initialModeParam === 'pdf' && doc.pdf_url) {
          setReadingMode('pdf');
        } else if (doc.ia_id && (!doc.chunks || doc.chunks.length <= 1)) {
          // If book only has a single summary chunk but has IA edition, default to flipbook
          setReadingMode('ia_book');
        } else if (doc.pdf_url && (!doc.chunks || doc.chunks.length <= 1)) {
          setReadingMode('pdf');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load reading content');
      } finally {
        setLoading(false);
      }
    }
    if (documentId) {
      loadData();
    }
  }, [documentId, initialModeParam]);

  const chunks = document?.chunks || [];
  const currentChunk = chunks[activeChunkIndex];
  const progressPercent = chunks.length > 0 ? Math.round(((activeChunkIndex + 1) / chunks.length) * 100) : 0;

  // Theme Classes
  const themeStyles = {
    sepia: {
      bg: 'bg-[#F7F5F0]',
      card: 'bg-[#EFECE5]',
      border: 'border-[#D9D5CE]',
      text: 'text-[#171717]',
      secondary: 'text-[#66635F]',
      highlight: 'bg-[#8B1E2D] text-white',
    },
    light: {
      bg: 'bg-[#FFFFFF]',
      card: 'bg-[#F8FAFC]',
      border: 'border-[#E2E8F0]',
      text: 'text-[#0F172A]',
      secondary: 'text-[#64748B]',
      highlight: 'bg-[#8B1E2D] text-white',
    },
    dark: {
      bg: 'bg-[#171717]',
      card: 'bg-[#212121]',
      border: 'border-[#333333]',
      text: 'text-[#EFECE5]',
      secondary: 'text-[#B8B4AE]',
      highlight: 'bg-[#8B1E2D] text-white',
    },
  }[theme];

  const fontSizeClasses = {
    sm: 'text-sm sm:text-base leading-relaxed',
    base: 'text-base sm:text-lg leading-relaxed sm:leading-loose',
    lg: 'text-lg sm:text-xl leading-loose',
    xl: 'text-xl sm:text-2xl leading-loose',
  }[fontSize];

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${themeStyles.bg} ${themeStyles.text}`}>
      {/* Reader Fixed Masthead */}
      <header className={`sticky top-0 z-30 border-b ${themeStyles.border} ${themeStyles.bg}/95 backdrop-blur-md px-4 sm:px-8 h-16 flex items-center justify-between`}>
        <div className="flex items-center gap-4 truncate">
          <Link
            href={`/document/${documentId}`}
            className={`p-2 rounded-md hover:${themeStyles.card} transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${themeStyles.secondary}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Reader</span>
          </Link>
          <div className="h-4 w-px bg-current opacity-20" />
          <h1 className="font-editorial font-bold text-sm sm:text-base truncate max-w-md">
            {document?.title || 'Reading Online'}
          </h1>
        </div>

        {/* Reader Preferences & Table of Contents Controls */}
        <div className="flex items-center gap-2">
          {/* Theme switcher */}
          <div className={`flex items-center border ${themeStyles.border} rounded-md p-0.5 text-xs`}>
            <button
              onClick={() => setTheme('sepia')}
              className={`px-2 py-1 rounded transition text-[11px] font-semibold ${
                theme === 'sepia' ? themeStyles.highlight : `${themeStyles.secondary} hover:${themeStyles.text}`
              }`}
            >
              Sepia
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-2 py-1 rounded transition text-[11px] font-semibold ${
                theme === 'light' ? themeStyles.highlight : `${themeStyles.secondary} hover:${themeStyles.text}`
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-2 py-1 rounded transition text-[11px] font-semibold ${
                theme === 'dark' ? themeStyles.highlight : `${themeStyles.secondary} hover:${themeStyles.text}`
              }`}
            >
              Dark
            </button>
          </div>

          {readingMode === 'passages' && (
            <>
              {/* Font switcher */}
              <button
                onClick={() => setFontFamily(fontFamily === 'serif' ? 'sans' : 'serif')}
                className={`p-2 rounded-md border ${themeStyles.border} hover:${themeStyles.card} text-xs font-bold transition`}
                title="Toggle Font Family"
              >
                {fontFamily === 'serif' ? 'Serif' : 'Sans'}
              </button>

              {/* Font size control */}
              <button
                onClick={() => {
                  const sizes: ('sm' | 'base' | 'lg' | 'xl')[] = ['sm', 'base', 'lg', 'xl'];
                  const nextIndex = (sizes.indexOf(fontSize) + 1) % sizes.length;
                  setFontSize(sizes[nextIndex]);
                }}
                className={`p-2 rounded-md border ${themeStyles.border} hover:${themeStyles.card} text-xs font-bold transition flex items-center gap-0.5`}
                title="Cycle Font Size"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase">{fontSize}</span>
              </button>

              {/* Table of contents drawer button */}
              {chunks.length > 1 && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`p-2 rounded-md border ${themeStyles.border} hover:${themeStyles.card} transition`}
                  title="Table of Contents"
                >
                  <List className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Reading Progress Top Bar (Passages mode) */}
      {readingMode === 'passages' && chunks.length > 0 && (
        <div className="w-full h-1 bg-black/10 dark:bg-white/10">
          <div
            className="h-full bg-library-accent transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Mode Switcher Navigation (when IA Book or PDF is available) */}
      {document && (document.ia_id || document.pdf_url) && (
        <div className={`border-b ${themeStyles.border} ${themeStyles.card} px-4 sm:px-8 py-2.5 flex items-center justify-between flex-wrap gap-2`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-library-muted pr-1">Reading View:</span>
            <button
              onClick={() => setReadingMode('passages')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition flex items-center gap-1.5 ${
                readingMode === 'passages'
                  ? 'bg-library-accent text-white shadow-xs'
                  : `border ${themeStyles.border} hover:${themeStyles.bg}`
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Text Passages</span>
            </button>

            {document.ia_id && (
              <button
                onClick={() => setReadingMode('ia_book')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition flex items-center gap-1.5 ${
                  readingMode === 'ia_book'
                    ? 'bg-library-accent text-white shadow-xs'
                    : `border ${themeStyles.border} hover:${themeStyles.bg}`
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Scanned Book (IA BookReader)</span>
              </button>
            )}

            {document.pdf_url && (
              <button
                onClick={() => setReadingMode('pdf')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition flex items-center gap-1.5 ${
                  readingMode === 'pdf'
                    ? 'bg-library-accent text-white shadow-xs'
                    : `border ${themeStyles.border} hover:${themeStyles.bg}`
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Full-Text PDF</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {document.ia_id && (
              <a
                href={`https://archive.org/details/${document.ia_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-library-accent hover:underline flex items-center gap-1 font-medium"
              >
                <span>Archive.org Record</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {document.pdf_url && (
              <a
                href={document.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-library-accent hover:underline flex items-center gap-1 font-medium"
              >
                <span>Direct PDF</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex max-w-7xl w-full mx-auto relative">
        {/* Table of Contents Drawer (Sidebar) */}
        {sidebarOpen && readingMode === 'passages' && (
          <aside className={`w-72 sm:w-80 border-r ${themeStyles.border} ${themeStyles.card} p-5 space-y-4 fixed sm:sticky top-17 h-[calc(100vh-4.25rem)] overflow-y-auto z-20 shadow-md`}>
            <div className="flex items-center justify-between pb-3 border-b border-current/10">
              <span className="text-xs uppercase font-bold tracking-wider">Passage Chunks</span>
              <span className="text-xs opacity-60 font-mono">{chunks.length} sections</span>
            </div>
            <div className="space-y-1">
              {chunks.map((chunk, idx) => (
                <button
                  key={chunk.chunk_index}
                  onClick={() => {
                    setActiveChunkIndex(idx);
                    setSidebarOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-md text-xs transition flex items-center justify-between ${
                    activeChunkIndex === idx
                      ? `${themeStyles.highlight} font-bold`
                      : `hover:${themeStyles.bg} opacity-80 hover:opacity-100`
                  }`}
                >
                  <span className="truncate pr-2">Passage #{chunk.chunk_index + 1}</span>
                  <span className="text-[10px] font-mono opacity-70">
                    {Math.round(((idx + 1) / chunks.length) * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-library-accent" />
              <p className="text-xs uppercase tracking-wider opacity-70">Preparing publication text & reader...</p>
            </div>
          ) : error || !document ? (
            <div className="max-w-2xl mx-auto p-8 border border-red-300 rounded-lg text-red-700 bg-red-50 text-center space-y-3">
              <p className="font-bold">Unable to open reader</p>
              <p className="text-sm">{error || 'Document content not found.'}</p>
              <Link href="/search" className="inline-block text-xs font-semibold underline">
                Return to Library Catalog
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* MODE 1: Internet Archive Interactive Scanned BookReader */}
              {readingMode === 'ia_book' && document.ia_id && (
                <div className="space-y-4 max-w-5xl mx-auto">
                  <div className="flex items-center justify-between p-3.5 rounded-md border border-sky-300 bg-sky-50 text-sky-950 text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-700 flex-shrink-0" />
                      <span>
                        Digitized original edition hosted on the Internet Archive. Flip through authentic pages, zoom in on text, or search within the volume.
                      </span>
                    </div>
                    <a
                      href={`https://archive.org/details/${document.ia_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold underline hover:text-sky-800 flex-shrink-0"
                    >
                      Archive.org Details ↗
                    </a>
                  </div>

                  <div className="w-full rounded-md border border-library-border overflow-hidden bg-black shadow-lg" style={{ height: '82vh' }}>
                    <iframe
                      src={`https://archive.org/embed/${document.ia_id}?ui=embed`}
                      className="w-full h-full border-0"
                      title={document.title}
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* MODE 2: Open Access Full-Text PDF */}
              {readingMode === 'pdf' && document.pdf_url && (
                <div className="space-y-4 max-w-5xl mx-auto">
                  <div className="flex items-center justify-between p-3.5 rounded-md border border-purple-300 bg-purple-50 text-purple-950 text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-700 flex-shrink-0" />
                      <span>
                        Full-text Open Access scientific publication. Unabridged scholarly manuscript with peer-reviewed figures and references.
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={document.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold underline hover:text-purple-800"
                      >
                        Open in New Tab ↗
                      </a>
                      <a
                        href={document.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="px-2.5 py-1 rounded bg-purple-700 text-white font-semibold text-[11px] hover:bg-purple-800 transition flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  </div>

                  <div className="w-full rounded-md border border-library-border overflow-hidden bg-stone-100 shadow-lg" style={{ height: '85vh' }}>
                    <iframe
                      src={`${document.pdf_url}#toolbar=1`}
                      className="w-full h-full border-0"
                      title={document.title}
                    />
                  </div>
                </div>
              )}

              {/* MODE 3: Text Passages / Reader View */}
              {readingMode === 'passages' && (
                <div className="max-w-3xl mx-auto">
                  <article className={`space-y-8 ${fontFamily === 'serif' ? 'font-editorial' : 'font-sans'}`}>
                    {/* Reading Header */}
                    <div className="space-y-3 border-b border-current/10 pb-6">
                      <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-widest text-library-accent">
                        <span>{document.source}</span>
                        <span>•</span>
                        <span>{document.doc_type || 'Edition'}</span>
                        {document.has_fulltext && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold ml-1">
                            Full Text
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight">
                        {document.title}
                      </h2>
                      {document.metadata_json?.authors && (
                        <p className={`text-sm italic ${themeStyles.secondary}`}>
                          By {Array.isArray(document.metadata_json.authors)
                            ? document.metadata_json.authors.map((a: any) => typeof a === 'string' ? a : a.name).join(', ')
                            : String(document.metadata_json.authors)}
                        </p>
                      )}
                    </div>

                    {/* Educational Banner if summary only */}
                    {!document.has_fulltext && !document.ia_id && !document.pdf_url && (
                      <div className="p-4 rounded-md border border-amber-300 bg-amber-50 text-amber-950 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertCircle className="w-4 h-4 text-amber-700" />
                          <span>Catalog Synopsis & Bibliographic Record</span>
                        </div>
                        <p className="leading-relaxed">
                          Search results and library records index synopses, abstracts, and metadata for modern copyrighted works. To read unabridged copyrighted books or proprietary journals, use digital lending or institutional subscriptions via the repository link on the document page.
                        </p>
                      </div>
                    )}

                    {/* Passage Content */}
                    {chunks.length > 0 ? (
                      <div className={`space-y-6 ${fontSizeClasses}`}>
                        <div className={`flex items-center justify-between text-xs font-mono font-medium ${themeStyles.secondary} uppercase tracking-widest pb-2`}>
                          <span>Section {activeChunkIndex + 1} of {chunks.length}</span>
                          <span>{progressPercent}% Complete</span>
                        </div>
                        <p className="leading-relaxed sm:leading-loose whitespace-pre-wrap selection:bg-library-accent selection:text-white">
                          {currentChunk ? currentChunk.text : document.content}
                        </p>
                      </div>
                    ) : (
                      <div className={`space-y-6 ${fontSizeClasses}`}>
                        <p className="leading-relaxed sm:leading-loose whitespace-pre-wrap">
                          {document.content || 'Full text preview is not currently available for this edition.'}
                        </p>
                      </div>
                    )}

                    {/* Pagination Controls */}
                    {chunks.length > 1 && (
                      <div className={`pt-12 mt-12 border-t border-current/10 flex items-center justify-between text-sm`}>
                        <button
                          disabled={activeChunkIndex === 0}
                          onClick={() => setActiveChunkIndex((idx) => Math.max(0, idx - 1))}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md border ${themeStyles.border} transition disabled:opacity-30 disabled:pointer-events-none hover:${themeStyles.card}`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Previous Section</span>
                        </button>

                        <span className={`text-xs font-mono font-medium ${themeStyles.secondary}`}>
                          {activeChunkIndex + 1} / {chunks.length}
                        </span>

                        <button
                          disabled={activeChunkIndex >= chunks.length - 1}
                          onClick={() => setActiveChunkIndex((idx) => Math.min(chunks.length - 1, idx + 1))}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md border ${themeStyles.border} transition disabled:opacity-30 disabled:pointer-events-none hover:${themeStyles.card}`}
                        >
                          <span>Next Section</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </article>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ReaderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-library-accent animate-spin mb-3" />
          <p className="text-xs uppercase tracking-wider text-library-secondary">
            Opening Reader...
          </p>
        </div>
      }
    >
      <ReaderContent />
    </Suspense>
  );
}
