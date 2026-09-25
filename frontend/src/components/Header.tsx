import React from 'react';
import Link from 'next/link';
import { BookOpen, Search, Sparkles, Database } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm group-hover:bg-indigo-700 transition">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">Open Library</span>
            <span className="ml-1.5 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Knowledge Engine
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/search" className="hover:text-indigo-600 transition flex items-center gap-1.5">
            <Search className="w-4 h-4" />
            <span>Search</span>
          </Link>
          <Link href="/ask" className="text-indigo-600 hover:text-indigo-700 font-semibold transition flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Ask AI</span>
          </Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-600 transition flex items-center gap-1.5"
          >
            <Database className="w-4 h-4" />
            <span>API Docs</span>
          </a>
        </nav>
      </div>
    </header>
  );
};
