'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getDocument } from '@/lib/api';
import { DocumentDetail } from '@/lib/types';
import { 
  ArrowLeft, 
  BookOpen, 
  Settings2, 
  Sun, 
  Moon, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  List, 
  Loader2,
  Type
} from 'lucide-react';

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reader Settings
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
      } catch (err: any) {
        setError(err.message || 'Failed to load reading content');
      } finally {
        setLoading(false);
      }
    }
    if (documentId) {
      loadData();
    }
  }, [documentId]);

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
      secondary: 'text-[#A0A0A0]',
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
              className={`px-2 py-1 rounded transition text-[11px] font-medium ${
                theme === 'sepia' ? themeStyles.highlight : 'opacity-70 hover:opacity-100'
              }`}
            >
              Sepia
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-2 py-1 rounded transition text-[11px] font-medium ${
                theme === 'light' ? themeStyles.highlight : 'opacity-70 hover:opacity-100'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-2 py-1 rounded transition text-[11px] font-medium ${
                theme === 'dark' ? themeStyles.highlight : 'opacity-70 hover:opacity-100'
              }`}
            >
              Dark
            </button>
          </div>

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
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-md border ${themeStyles.border} hover:${themeStyles.card} transition`}
            title="Table of Contents"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Reading Progress Top Bar */}
      <div className="w-full h-1 bg-black/10 dark:bg-white/10">
        <div
          className="h-full bg-library-accent transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex-1 flex max-w-7xl w-full mx-auto relative">
        {/* Table of Contents Drawer (Sidebar) */}
        {sidebarOpen && (
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

        {/* Main Reading Surface */}
        <main className="flex-1 max-w-3xl mx-auto px-6 sm:px-12 py-12 sm:py-16">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-library-accent" />
              <p className="text-xs uppercase tracking-wider opacity-70">Preparing publication text...</p>
            </div>
          ) : error || !document ? (
            <div className="p-8 border border-red-300 rounded-lg text-red-700 bg-red-50 text-center space-y-3">
              <p className="font-bold">Unable to open reader</p>
              <p className="text-sm">{error || 'Document content not found.'}</p>
              <Link href="/search" className="inline-block text-xs font-semibold underline">
                Return to Library Catalog
              </Link>
            </div>
          ) : (
            <article className={`space-y-8 ${fontFamily === 'serif' ? 'font-editorial' : 'font-sans'}`}>
              {/* Reading Header */}
              <div className="space-y-3 border-b border-current/10 pb-6">
                <span className="text-xs uppercase font-bold tracking-widest text-library-accent">
                  {document.source} • {document.doc_type || 'Edition'}
                </span>
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

              {/* Passage Content */}
              {chunks.length > 0 ? (
                <div className={`space-y-6 ${fontSizeClasses}`}>
                  <div className="flex items-center justify-between text-xs font-mono opacity-50 uppercase tracking-widest pb-2">
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

                  <span className="text-xs font-mono opacity-60">
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
          )}
        </main>
      </div>
    </div>
  );
}
