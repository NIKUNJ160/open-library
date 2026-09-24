'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';

interface SearchBarProps {
  initialQuery?: string;
  size?: 'normal' | 'large';
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialQuery = '',
  size = 'normal',
  className = '',
}) => {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const isLarge = size === 'large';

  return (
    <form onSubmit={handleSubmit} className={`w-full ${className}`}>
      <div className="relative flex items-center shadow-sm hover:shadow transition-shadow rounded-2xl bg-white border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
        <div className={`pointer-events-none pl-4 text-slate-400 ${isLarge ? 'pl-5' : 'pl-4'}`}>
          <Search className={isLarge ? 'w-6 h-6' : 'w-5 h-5'} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search books, research papers, Wikipedia articles, or open datasets..."
          className={`w-full bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none ${
            isLarge ? 'py-4 pl-3 pr-28 text-lg' : 'py-2.5 pl-3 pr-24 text-sm'
          }`}
        />
        <div className="absolute right-2">
          <button
            type="submit"
            className={`inline-flex items-center gap-1.5 font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition ${
              isLarge ? 'px-5 py-2.5 text-base' : 'px-3.5 py-1.5 text-xs'
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
