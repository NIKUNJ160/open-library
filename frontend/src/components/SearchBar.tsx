'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';

interface SearchBarProps {
  initialQuery?: string;
  defaultValue?: string;
  size?: 'normal' | 'large';
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialQuery = '',
  defaultValue,
  size = 'normal',
  className = '',
}) => {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue ?? initialQuery);

  useEffect(() => {
    if (defaultValue !== undefined) {
      setQuery(defaultValue);
    }
  }, [defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const isLarge = size === 'large';

  return (
    <form onSubmit={handleSubmit} className={`w-full ${className}`}>
      <div className="relative flex items-center shadow-xs hover:shadow-sm transition-shadow rounded-xl bg-white border border-library-border focus-within:border-library-accent focus-within:ring-1 focus-within:ring-library-accent">
        <div className={`pointer-events-none pl-4 text-library-muted ${isLarge ? 'pl-5' : 'pl-4'}`}>
          <Search className={isLarge ? 'w-5 h-5' : 'w-4 h-4'} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search books, research papers, Wikipedia articles, or open datasets..."
          className={`w-full bg-transparent text-library-dark placeholder:text-library-muted focus:outline-none ${
            isLarge ? 'py-4 pl-3 pr-28 text-base sm:text-lg' : 'py-2.5 pl-3 pr-24 text-sm'
          }`}
        />
        <div className="absolute right-2">
          <button
            type="submit"
            className={`inline-flex items-center gap-1.5 font-semibold text-white bg-library-accent hover:bg-library-accent-hover rounded-lg transition ${
              isLarge ? 'px-5 py-2.5 text-sm uppercase tracking-wider' : 'px-3.5 py-1.5 text-xs'
            }`}
          >
            <span>Search</span>
            <ArrowRight className={isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          </button>
        </div>
      </div>
    </form>
  );
};
