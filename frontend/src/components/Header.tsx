'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Search, 
  Sparkles, 
  Network, 
  BookOpen, 
  Menu, 
  X,
  Database
} from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { name: 'Catalog', href: '/search' },
    { name: 'Books', href: '/search?doc_type=book' },
    { name: 'Papers', href: '/search?doc_type=paper' },
    { name: 'Knowledge Graph', href: '/graph', icon: Network },
    { name: 'Ask AI', href: '/ask', icon: Sparkles, accent: true },
  ];

  if (pathname?.startsWith('/read/')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-library-border bg-library-bg/95 backdrop-blur-md">
      {/* Top Banner / Masthead */}
      <div className="border-b border-library-border/50 py-1.5 px-4 sm:px-6 lg:px-8 bg-library-card/40 text-[11px] text-library-secondary flex items-center justify-between">
        <span className="uppercase tracking-widest font-semibold text-library-muted">
          Digital Public Knowledge Archive
        </span>
        <div className="flex items-center gap-4">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-library-accent transition flex items-center gap-1 font-medium"
          >
            <Database className="w-3 h-3 text-library-muted" />
            <span>API Docs</span>
          </a>
          <span className="text-library-border">•</span>
          <span className="text-library-muted">Open Access & Public Domain</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
        {/* Brand / Logo */}
        <Link href="/" className="flex flex-col group flex-shrink-0">
          <span className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-library-dark group-hover:text-library-accent transition">
            THE LIBRARY
          </span>
          <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-library-muted -mt-0.5">
            Knowledge Engine
          </span>
        </Link>

        {/* Global Compact Search Bar (Desktop) */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-md relative items-center"
        >
          <Search className="w-4 h-4 text-library-muted absolute left-3.5 pointer-events-none" />
          <input
            id="header-search-desktop"
            name="q"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search books, authors, subjects, DOIs..."
            aria-label="Search books, authors, subjects, and DOIs"
            autoComplete="off"
            className="w-full bg-white border border-library-border rounded-md pl-10 pr-4 py-2 text-xs text-library-dark placeholder-library-muted focus:outline-none focus:border-library-accent focus:ring-1 focus:ring-library-accent transition"
          />
        </form>

        {/* Navigation Items (Desktop) */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-library-secondary">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            if (item.accent) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-library-accent text-white font-bold hover:bg-library-accent-hover transition shadow-sm"
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{item.name}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`inline-flex items-center gap-1.5 transition py-1 ${
                  isActive
                    ? 'text-library-accent border-b-2 border-library-accent font-bold'
                    : 'hover:text-library-dark'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 text-library-muted" />}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-md border border-library-border text-library-dark hover:bg-library-card transition"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-library-border bg-library-bg px-4 py-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-library-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="header-search-mobile"
              name="q_mobile"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog..."
              aria-label="Search catalog"
              autoComplete="off"
              className="w-full bg-white border border-library-border rounded-md pl-10 pr-4 py-2.5 text-sm text-library-dark focus:outline-none focus:border-library-accent"
            />
          </form>

          <nav className="flex flex-col space-y-2 pt-2 text-sm font-semibold uppercase tracking-wider">
            {navLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-md transition flex items-center justify-between ${
                  pathname === item.href
                    ? 'bg-library-card text-library-accent font-bold'
                    : 'hover:bg-library-card text-library-dark'
                }`}
              >
                <span>{item.name}</span>
                {item.icon && <item.icon className="w-4 h-4 text-library-muted" />}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};
