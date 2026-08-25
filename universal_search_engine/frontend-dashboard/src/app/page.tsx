"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Book, FileText, Database, ShieldAlert, Cpu, Landmark, BookOpen } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}&category=${category}`);
  };

  const categories = [
    { id: "all", label: "All", icon: Search },
    { id: "books", label: "Books", icon: Book },
    { id: "papers", label: "Research Papers", icon: FileText },
    { id: "datasets", label: "Datasets", icon: Database },
    { id: "patents", label: "Patents", icon: Cpu },
    { id: "repos", label: "Repositories", icon: BookOpen },
    { id: "gov", label: "Gov Pubs", icon: Landmark },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12 md:py-24 text-center">
      {/* Hero Badge */}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-400 ring-1 ring-inset ring-indigo-500/20 mb-6">
        <Cpu className="h-3.5 w-3.5" />
        Aggregating over 30+ Open Knowledge Sources
      </span>

      {/* Hero Header */}
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 sm:text-6xl max-w-3xl leading-tight">
        Federated Search Engine for <span className="text-indigo-400">Open Knowledge</span>
      </h1>
      <p className="mt-4 text-base text-slate-400 max-w-xl">
        Discover books, research papers, raw datasets, patents, and repositories via a unified AI-powered API interface.
      </p>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mt-10 w-full max-w-2xl px-4">
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for 'quantum computing', 'machine learning'..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-6 pr-32 py-4.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-md transition-all shadow-xl"
            required
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-2.5 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/10 flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>

        {/* Category Pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border transition-all ${
                  isSelected
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </form>
    </div>
  );
}
