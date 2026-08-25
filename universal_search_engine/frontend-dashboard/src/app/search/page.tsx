"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Filter, Calendar, Award, User, ExternalLink, BookmarkPlus, Plus, Check } from "lucide-react";
import { fetchFromApi } from "../api-client";

interface SearchResult {
  title: string;
  authors: string | string[];
  description?: string;
  url: string;
  publishedDate?: string;
  contentType: string;
  sourceName: string;
  doi?: string;
  isbn?: string;
}

interface SearchResponse {
  query: string;
  totalResults: number;
  executionTimeMs: number;
  results: SearchResult[];
  warnings?: string[];
}

interface Collection {
  id: string;
  name: string;
  description?: string;
}

function SearchResultsComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search parameters
  const q = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "all";
  const [queryInput, setQueryInput] = useState(q);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  // States
  const [loading, setLoading] = useState(false);
  const [resultsData, setResultsData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedItemToCollect, setSelectedItemToCollect] = useState<SearchResult | null>(null);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch results when query or category updates
  useEffect(() => {
    if (!q) return;
    
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const categoryQuery = selectedCategory !== "all" ? `&category=${selectedCategory}` : "";
        const data = await fetchFromApi(`/search?q=${encodeURIComponent(q)}${categoryQuery}`);
        setResultsData(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch search results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q, selectedCategory]);

  // Fetch collections on mount for the modal
  useEffect(() => {
    fetchFromApi("/collections")
      .then((data) => setCollections(data))
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    router.push(`/search?q=${encodeURIComponent(queryInput.trim())}&category=${selectedCategory}`);
  };

  const handleAddToCollection = async (collectionId: string) => {
    if (!selectedItemToCollect) return;

    try {
      // Normalize authors list
      let parsedAuthors: string[] = [];
      if (Array.isArray(selectedItemToCollect.authors)) {
        parsedAuthors = selectedItemToCollect.authors;
      } else if (typeof selectedItemToCollect.authors === "string") {
        try {
          parsedAuthors = JSON.parse(selectedItemToCollect.authors);
        } catch {
          parsedAuthors = [selectedItemToCollect.authors];
        }
      }

      await fetchFromApi(`/collections/${collectionId}/items`, {
        method: "POST",
        body: JSON.stringify({
          title: selectedItemToCollect.title,
          sourceUrl: selectedItemToCollect.url,
          sourceName: selectedItemToCollect.sourceName,
          contentType: selectedItemToCollect.contentType,
          authors: parsedAuthors,
          metadata: {
            doi: selectedItemToCollect.doi,
            isbn: selectedItemToCollect.isbn,
            publishedDate: selectedItemToCollect.publishedDate,
          },
        }),
      });

      setSuccessMessage(`Successfully added to collection!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowCollectModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to add item to collection");
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      const newCol = await fetchFromApi("/collections", {
        method: "POST",
        body: JSON.stringify({
          name: newCollectionName.trim(),
          description: "Created from search dashboard",
        }),
      });
      setCollections([...collections, newCol]);
      setNewCollectionName("");
      setShowNewCollectionForm(false);
      handleAddToCollection(newCol.id);
    } catch (err: any) {
      alert(err.message || "Failed to create collection");
    }
  };

  const handleVectorize = (result: SearchResult) => {
    // Redirect to detail page with full params, which will trigger/offer vectorization on load
    const params = new URLSearchParams({
      title: result.title,
      url: result.url,
      source: result.sourceName,
      type: result.contentType,
      description: result.description || "",
      publishedDate: result.publishedDate || "",
    });

    if (Array.isArray(result.authors)) {
      result.authors.forEach((auth) => params.append("author", auth));
    } else if (result.authors) {
      params.append("author", result.authors);
    }

    router.push(`/paper?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 shrink-0 space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-4">
            <Filter className="h-4 w-4 text-indigo-400" />
            Filter Category
          </h3>
          <div className="space-y-1.5">
            {[
              { id: "all", label: "All Categories" },
              { id: "books", label: "Books" },
              { id: "papers", label: "Research Papers" },
              { id: "datasets", label: "Datasets" },
              { id: "patents", label: "Patents" },
              { id: "repos", label: "Repositories" },
              { id: "gov", label: "Gov Pubs" },
              { id: "doc", label: "Documentation" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  if (q) {
                    router.push(`/search?q=${encodeURIComponent(q)}&category=${cat.id}`);
                  }
                }}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600/10 border border-indigo-500/30 text-indigo-300"
                    : "border border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <span>{cat.label}</span>
                {selectedCategory === cat.id && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Results Panel */}
      <section className="flex-1 space-y-6">
        {/* Search form inside dashboard */}
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Type query to search..."
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/15"
          >
            Search
          </button>
        </form>

        {/* Success Alert */}
        {successMessage && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400 flex items-center gap-2">
            <Check className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {/* Loading and Results UI */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-400">Federating queries across 22+ API endpoints...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-400">
            {error}
          </div>
        ) : resultsData ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider px-1">
              <span>Found {resultsData.totalResults} results</span>
              <span>Execution Time: {resultsData.executionTimeMs} ms</span>
            </div>

            {resultsData.warnings && resultsData.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 text-xs text-amber-400 space-y-1">
                <span className="font-bold">Partial results returned (warnings):</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {resultsData.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

            {resultsData.results.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/10 py-16 text-center text-sm text-slate-400">
                No matching results found. Try adjusting filters or search query.
              </div>
            ) : (
              <div className="space-y-4">
                {resultsData.results.map((result, idx) => {
                  const authorsText = Array.isArray(result.authors)
                    ? result.authors.join(", ")
                    : result.authors;
                  return (
                    <article
                      key={idx}
                      className="rounded-xl border border-slate-800/80 bg-slate-900/20 p-5 hover:bg-slate-900/40 hover:border-slate-800 transition-all flex flex-col md:flex-row justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                            {result.contentType}
                          </span>
                          <span className="inline-flex items-center rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {result.sourceName}
                          </span>
                        </div>

                        <h2 className="text-base font-bold text-slate-100 leading-snug">
                          {result.title}
                        </h2>

                        {authorsText && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span>{authorsText}</span>
                          </div>
                        )}

                        {result.publishedDate && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{result.publishedDate}</span>
                          </div>
                        )}

                        {result.description && (
                          <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mt-1">
                            {result.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex md:flex-col justify-end gap-2 shrink-0 self-end md:self-stretch">
                        <button
                          onClick={() => {
                            setSelectedItemToCollect(result);
                            setShowCollectModal(true);
                          }}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-colors"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" />
                          <span>Collect</span>
                        </button>
                        <button
                          onClick={() => handleVectorize(result)}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/10"
                        >
                          <Award className="h-3.5 w-3.5" />
                          <span>AI Widgets</span>
                        </button>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Link</span>
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-800 py-20 text-center text-sm text-slate-500">
            Enter a search term above to federate queries.
          </div>
        )}
      </section>

      {/* Collect Modal */}
      {showCollectModal && selectedItemToCollect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-100">
              Add to Collection
            </h2>
            <p className="text-xs text-slate-400 line-clamp-2">
              &ldquo;{selectedItemToCollect.title}&rdquo;
            </p>

            {/* List current collections */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => handleAddToCollection(col.id)}
                  className="w-full flex items-center justify-between rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-200 transition-colors"
                >
                  <span className="font-semibold">{col.name}</span>
                  <Plus className="h-3.5 w-3.5 text-slate-400" />
                </button>
              ))}
            </div>

            {/* Create new collection trigger */}
            {!showNewCollectionForm ? (
              <button
                onClick={() => setShowNewCollectionForm(true)}
                className="w-full py-2.5 rounded-lg border border-dashed border-slate-800 text-xs font-semibold text-slate-400 hover:border-slate-700 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="h-4 w-4" />
                Create New Collection
              </button>
            ) : (
              <form onSubmit={handleCreateCollection} className="space-y-3 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Collection name (e.g. Thesis, Machine Learning)"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  required
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowNewCollectionForm(false)}
                    className="px-3 py-1.5 text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded bg-indigo-600 px-3 py-1.5 font-bold text-white hover:bg-indigo-500"
                  >
                    Create & Add
                  </button>
                </div>
              </form>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowCollectModal(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    }>
      <SearchResultsComponent />
    </Suspense>
  );
}
