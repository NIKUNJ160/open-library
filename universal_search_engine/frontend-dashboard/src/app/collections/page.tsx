"use client";

import { useState, useEffect } from "react";
import { 
  Bookmark, Folder, Plus, Trash2, Quote, Loader2, 
  ExternalLink, User, Download, FileText, Check 
} from "lucide-react";
import { fetchFromApi } from "../api-client";

interface CollectionItem {
  id: string;
  title: string;
  sourceUrl?: string;
  sourceName?: string;
  contentType?: string;
  authors?: string; // stored as JSON string or comma-separated
  createdAt: string;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  items?: CollectionItem[];
  createdAt: string;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  
  // Loading & forms
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Citation export
  const [exportFormat, setExportFormat] = useState<"apa" | "mla" | "chicago" | "bibtex" | "ris">("bibtex");
  const [citations, setCitations] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Load collections
  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await fetchFromApi("/collections");
      setCollections(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const handleSelectCollection = async (id: string) => {
    setLoading(true);
    try {
      const col = await fetchFromApi(`/collections/${id}`);
      setSelectedCollection(col);
    } catch (err: any) {
      alert(err.message || "Failed to load collection details");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreateLoading(true);
    try {
      const newCol = await fetchFromApi("/collections", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      setCollections([newCol, ...collections]);
      setName("");
      setDescription("");
      setShowCreateForm(false);
      handleSelectCollection(newCol.id);
    } catch (err: any) {
      alert(err.message || "Failed to create collection");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entire collection?")) return;
    try {
      await fetchFromApi(`/collections/${id}`, {
        method: "DELETE",
      });
      setCollections(collections.filter((col) => col.id !== id));
      if (selectedCollection?.id === id) {
        setSelectedCollection(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete collection");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedCollection) return;
    if (!confirm("Remove this document from the collection?")) return;
    try {
      const updated = await fetchFromApi(`/collections/${selectedCollection.id}/items/${itemId}`, {
        method: "DELETE",
      });
      setSelectedCollection(updated);
      // Update collections list counter in sidebar
      setCollections(collections.map((c) => c.id === updated.id ? updated : c));
    } catch (err: any) {
      alert(err.message || "Failed to remove item");
    }
  };

  const handleExportCitations = async () => {
    if (!selectedCollection) return;
    setExportLoading(true);
    try {
      const res = await fetchFromApi("/citations/export", {
        method: "POST",
        body: JSON.stringify({
          format: exportFormat,
          collectionId: selectedCollection.id,
        }),
      });
      setCitations(res);
      setShowExportModal(true);
    } catch (err: any) {
      alert(err.message || "Failed to export citations");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadCitationsFile = () => {
    if (citations.length === 0 || !selectedCollection) return;
    const fileContent = citations.join("\n\n");
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(blob);
    
    let fileExtension = "txt";
    if (exportFormat === "bibtex") fileExtension = "bib";
    else if (exportFormat === "ris") fileExtension = "ris";
    
    element.download = `${selectedCollection.name.toLowerCase().replace(/\s+/g, "_")}_citations.${fileExtension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* Sidebar - Collections List */}
      <aside className="md:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-indigo-400" />
            Collections
          </h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded p-1 bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 transition-colors"
            title="Create collection"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Create collection form */}
        {showCreateForm && (
          <form onSubmit={handleCreateCollection} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (e.g. LLM Papers)"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
              required
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (Optional)"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-2 py-1 text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="rounded bg-indigo-600 px-3 py-1 font-bold text-white hover:bg-indigo-500 transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Collections List */}
        {loading && collections.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="space-y-1.5">
            {collections.map((col) => (
              <div
                key={col.id}
                className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all cursor-pointer ${
                  selectedCollection?.id === col.id
                    ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-300 shadow-md"
                    : "border-slate-800/80 bg-slate-900/10 hover:bg-slate-900/30 text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => handleSelectCollection(col.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Folder className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="text-xs font-semibold truncate leading-none">
                    {col.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCollection(col.id);
                  }}
                  className="hidden group-hover:block p-1 text-slate-500 hover:text-red-400 transition-colors"
                  title="Delete collection"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {collections.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-6">
                No collections yet. Click the + icon to add one!
              </p>
            )}
          </div>
        )}
      </aside>

      {/* Main Panel - Collection Items */}
      <section className="md:col-span-3 space-y-6">
        {selectedCollection ? (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Folder className="h-5 w-5 text-indigo-400" />
                  {selectedCollection.name}
                </h1>
                {selectedCollection.description && (
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedCollection.description}
                  </p>
                )}
              </div>

              {/* Citations Export Action */}
              <div className="flex items-center gap-2">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="apa">APA Style</option>
                  <option value="mla">MLA Style</option>
                  <option value="chicago">Chicago Style</option>
                  <option value="bibtex">BibTeX Format</option>
                  <option value="ris">RIS Format</option>
                </select>
                <button
                  onClick={handleExportCitations}
                  disabled={exportLoading || !selectedCollection.items || selectedCollection.items.length === 0}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow shadow-indigo-600/10"
                >
                  {exportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Quote className="h-3.5 w-3.5" />}
                  Export Citations
                </button>
              </div>
            </div>

            {/* List items */}
            {selectedCollection.items && selectedCollection.items.length > 0 ? (
              <div className="space-y-3">
                {selectedCollection.items.map((item) => {
                  let authorsText = "";
                  if (item.authors) {
                    try {
                      const parsed = JSON.parse(item.authors);
                      authorsText = Array.isArray(parsed) ? parsed.join(", ") : parsed;
                    } catch {
                      authorsText = item.authors;
                    }
                  }

                  return (
                    <article
                      key={item.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/15 p-4 flex justify-between items-start gap-4 hover:bg-slate-900/25 transition-all"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.contentType && (
                            <span className="inline-flex items-center rounded bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
                              {item.contentType}
                            </span>
                          )}
                          {item.sourceName && (
                            <span className="inline-flex items-center rounded bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              {item.sourceName}
                            </span>
                          )}
                        </div>

                        <h3 className="text-xs font-bold text-slate-200 leading-snug">
                          {item.title}
                        </h3>

                        {authorsText && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <User className="h-3 w-3 shrink-0 text-slate-500" />
                            <span>{authorsText}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-center">
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Visit Source Link"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-500 hover:text-red-400 hover:border-red-500/10 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-800 py-16 text-center text-xs text-slate-500">
                This collection has no items yet. Run a search to collect documents!
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-800 py-32 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-3">
            <Bookmark className="h-8 w-8 text-slate-600" />
            <p>Select a collection from the sidebar to view collected stubs and export citations.</p>
          </div>
        )}
      </section>

      {/* Export modal displaying citations list */}
      {showExportModal && selectedCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Quote className="h-4 w-4 text-indigo-400" />
                Citations Export — {selectedCollection.name} ({exportFormat.toUpperCase()})
              </h2>
              <button
                onClick={handleDownloadCitationsFile}
                className="rounded-lg bg-indigo-600/15 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download File
              </button>
            </div>

            {/* Citations viewport */}
            <div className="rounded-lg bg-slate-950 border border-slate-850 p-4 font-mono text-[10px] break-all leading-normal max-h-96 overflow-y-auto space-y-4 text-slate-300 select-all">
              {citations.map((cite, i) => (
                <div key={i} className="whitespace-pre-wrap border-b border-slate-900 pb-3 last:border-0 last:pb-0">
                  {cite}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(citations.join("\n\n"));
                  alert("Copied to Clipboard!");
                }}
                className="rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 px-4 py-2 font-bold text-slate-300 hover:text-slate-100"
              >
                Copy All
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-500"
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
