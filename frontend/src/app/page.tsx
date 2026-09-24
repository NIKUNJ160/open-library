import { SearchBar } from '@/components/SearchBar';
import { BookOpen, Globe, FileText, Sparkles, Database, Layers } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const sources = [
    {
      name: 'Open Library',
      desc: 'Over 20M books, editions, authors, and bibliographic works.',
      icon: BookOpen,
      badge: 'Books',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      name: 'Wikipedia & Wikidata',
      desc: 'Encyclopedic articles and structured knowledge ontology.',
      icon: Globe,
      badge: 'Encyclopedia',
      color: 'text-sky-600 bg-sky-50 border-sky-200',
    },
    {
      name: 'OpenAlex & Crossref',
      desc: 'Global research papers, DOIs, authors, institutions, and citations.',
      icon: FileText,
      badge: 'Scholarly',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      name: 'Europe PMC & arXiv',
      desc: 'Preprints, medical publications, and biomedical abstracts.',
      icon: Layers,
      badge: 'Preprints & Bio',
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
  ];

  const suggestedQueries = [
    'Theory of Relativity',
    'Origin of Species',
    'CRISPR Cas9 gene editing',
    'Quantum computing fundamentals',
    'Public health statistics',
  ];

  return (
    <div className="flex flex-col items-center justify-center pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Universal Public Knowledge Platform</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Explore the World&apos;s <span className="text-indigo-600">Open Knowledge</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600">
          Search across public domain books, scientific literature, encyclopedias, and open data archives with full citation transparency.
        </p>
      </div>

      {/* Main Search Bar */}
      <div className="w-full max-w-2xl mb-6">
        <SearchBar size="large" />
      </div>

      {/* Suggested Queries */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-16 text-xs text-slate-500">
        <span className="font-medium text-slate-400">Popular:</span>
        {suggestedQueries.map((query) => (
          <Link
            key={query}
            href={`/search?q=${encodeURIComponent(query)}`}
            className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition"
          >
            {query}
          </Link>
        ))}
      </div>

      {/* Sources Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sources.map((src) => {
          const Icon = src.icon;
          return (
            <div
              key={src.name}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:shadow-md transition-shadow flex items-start gap-4"
            >
              <div className={`p-3 rounded-xl border ${src.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">{src.name}</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {src.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{src.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
