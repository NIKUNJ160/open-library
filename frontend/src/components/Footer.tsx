'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Sparkles, Globe, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const pathname = usePathname();

  if (pathname?.startsWith('/read/')) {
    return null;
  }

  return (
    <footer className="border-t border-library-border bg-library-card text-library-secondary pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-library-border/80">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4 pr-6">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="font-editorial text-2xl font-bold text-library-dark tracking-tight">
                THE LIBRARY
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-library-accent text-white">
                Open Edition
              </span>
            </Link>
            <p className="text-sm text-library-secondary leading-relaxed max-w-sm">
              A public digital knowledge institution inspired by the world&apos;s greatest archival
              and academic libraries. Discover books, scholars, research publications, and
              interconnected concepts.
            </p>
            <div className="flex items-center gap-4 text-xs text-library-muted pt-2">
              <span className="inline-flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                <span>Open Data & Public Domain</span>
              </span>
              <span>•</span>
              <span>CC0 & CC-BY Compliant</span>
            </div>
          </div>

          {/* Catalog Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold text-library-dark tracking-wider">
              Catalog
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/search?doc_type=book" className="hover:text-library-accent transition">
                  Books & Works
                </Link>
              </li>
              <li>
                <Link href="/graph" className="hover:text-library-accent transition">
                  Authors & Scholars
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-library-accent transition">
                  Subjects & Themes
                </Link>
              </li>
              <li>
                <Link href="/graph" className="hover:text-library-accent transition">
                  Knowledge Graph
                </Link>
              </li>
              <li>
                <Link href="/ask" className="hover:text-library-accent transition flex items-center gap-1.5 text-library-accent font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask AI Assistant</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* About Section */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold text-library-dark tracking-wider">
              About
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-library-accent transition">
                  About the Library
                </Link>
              </li>
              <li>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-library-accent transition"
                >
                  REST API Docs
                </a>
              </li>
              <li>
                <span className="text-library-muted">Accessibility</span>
              </li>
              <li>
                <span className="text-library-muted">Privacy & Terms</span>
              </li>
              <li>
                <span className="text-library-muted">Citation Standards</span>
              </li>
            </ul>
          </div>

          {/* Institutional Sources */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold text-library-dark tracking-wider">
              Corpus Sources
            </h4>
            <ul className="space-y-2 text-xs text-library-secondary">
              <li>
                <a href="https://openlibrary.org" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Open Library (Internet Archive)
                </a>
              </li>
              <li>
                <a href="https://wikipedia.org" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Wikipedia & Wikidata
                </a>
              </li>
              <li>
                <a href="https://openalex.org" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  OpenAlex Scholarly Graph
                </a>
              </li>
              <li>
                <a href="https://crossref.org" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Crossref Metadata Registry
                </a>
              </li>
              <li>
                <a href="https://europepmc.org" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Europe PMC & PubMed
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-library-muted">
          <p>© 2026 Open Library Knowledge Engine. Free, open, and accessible to the world.</p>
          <div className="flex items-center gap-1 text-library-secondary">
            <span>Built with respect for human curiosity and public science</span>
            <Heart className="w-3.5 h-3.5 text-library-accent inline ml-1" />
          </div>
        </div>
      </div>
    </footer>
  );
};
