"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Loader2, Sparkles, Brain, Quote, FileText, Check, 
  Database, Network, MessageSquare, ChevronRight, Share2 
} from "lucide-react";
import { fetchFromApi } from "../api-client";

interface CitationFormat {
  id: string;
  name: string;
}

const citationFormats: CitationFormat[] = [
  { id: "apa", name: "APA" },
  { id: "mla", name: "MLA" },
  { id: "chicago", name: "Chicago" },
  { id: "harvard", name: "Harvard" },
  { id: "vancouver", name: "Vancouver" },
  { id: "bibtex", name: "BibTeX" },
  { id: "ris", name: "RIS" },
];

function PaperDetailsComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse document details from search query params
  const title = searchParams.get("title") || "";
  const url = searchParams.get("url") || "";
  const source = searchParams.get("source") || "";
  const type = searchParams.get("type") || "document";
  const description = searchParams.get("description") || "";
  const publishedDate = searchParams.get("publishedDate") || "";
  const authors = searchParams.getAll("author") || [];

  // Local states
  const [loading, setLoading] = useState(false);
  const [ingestedId, setIngestedId] = useState<string | null>(null);
  const [graphed, setGraphed] = useState(false);
  const [graphedNodesCount, setGraphedNodesCount] = useState(0);
  
  // AI results states
  const [summary, setSummary] = useState<string | null>(null);
  const [eli5, setEli5] = useState<string | null>(null);
  const [citation, setCitation] = useState<string | null>(null);
  const [selectedCitationFormat, setSelectedCitationFormat] = useState("apa");
  
  // Q&A state
  const [question, setQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);

  // Auto-fetch citation in default APA style on mount
  useEffect(() => {
    if (!title) return;
    fetchCitation("apa");
  }, [title]);

  const fetchCitation = async (format: string) => {
    setLoading(true);
    try {
      const year = publishedDate ? new Date(publishedDate).getFullYear() || 2026 : 2026;
      const res = await fetchFromApi("/ai/cite", {
        method: "POST",
        body: JSON.stringify({
          format,
          metadata: {
            title,
            authors: authors.length > 0 ? authors : ["Unknown Author"],
            source,
            year,
            url,
          },
        }),
      });
      setCitation(res.citation);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCitationFormatChange = (format: string) => {
    setSelectedCitationFormat(format);
    fetchCitation(format);
  };

  const handleSummarize = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const res = await fetchFromApi("/ai/summarize", {
        method: "POST",
        body: JSON.stringify({
          text: description || title,
          length: "medium",
          tone: "professional",
        }),
      });
      setSummary(res.summary);
    } catch (err: any) {
      alert(err.message || "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const handleEli5 = async () => {
    setLoading(true);
    setEli5(null);
    try {
      const res = await fetchFromApi("/ai/eli5", {
        method: "POST",
        body: JSON.stringify({
          text: description || title,
        }),
      });
      setEli5(res.explanation);
    } catch (err: any) {
      alert(err.message || "Failed to generate ELI5 explanation");
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setQaAnswer(null);
    try {
      const res = await fetchFromApi("/ai/ask", {
        method: "POST",
        body: JSON.stringify({
          text: description || title,
          question: question.trim(),
        }),
      });
      setQaAnswer(res.answer);
    } catch (err: any) {
      alert(err.message || "Failed to generate answer");
    } finally {
      setLoading(false);
    }
  };

  const handleIngestAndGraph = async () => {
    setLoading(true);
    try {
      // 1. Ingest document into vector store
      const ingestRes = await fetchFromApi("/search/rag/ingest", {
        method: "POST",
        body: JSON.stringify({
          title,
          content: description || `Document titled "${title}" published by ${source}.`,
          sourceUrl: url,
          sourceName: source,
          contentType: type,
          authors: authors,
          metadata: {
            publishedDate,
          },
        }),
      });
      
      setIngestedId(ingestRes.documentId);

      // 2. Trigger auto graphing using the new document ID
      const graphRes = await fetchFromApi(`/graph/document/${ingestRes.documentId}/graph`, {
        method: "POST",
      });

      setGraphed(true);
      setGraphedNodesCount(graphRes.nodesCreated || 0);
    } catch (err: any) {
      alert(err.message || "Failed to vectorize document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Back link */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Search Results
      </button>

      {/* Header card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 md:p-8 space-y-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            {type}
          </span>
          <span className="inline-flex items-center rounded bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            {source}
          </span>
          {ingestedId && (
            <span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-2.5 py-0.5 text-xs font-bold text-green-400">
              <Database className="h-3 w-3" /> Vectorized
            </span>
          )}
        </div>

        <h1 className="text-2xl font-extrabold text-slate-100 sm:text-3xl leading-tight">
          {title}
        </h1>

        {authors.length > 0 && (
          <p className="text-sm text-slate-400 font-medium">
            By: {authors.join(", ")}
          </p>
        )}

        {publishedDate && (
          <p className="text-xs text-slate-500">
            Published: {publishedDate}
          </p>
        )}

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-all"
          >
            Open Source Document
            <ArrowLeft className="h-3.5 w-3.5 rotate-135" />
          </a>
        )}
      </div>

      {/* Grid: Details & AI Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Summary & Description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              Document Abstract / Metadata
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {description || "No abstract or description provided for this item."}
            </p>
          </div>

          {/* AI summaries section */}
          {(summary || eli5) && (
            <div className="space-y-6">
              {summary && (
                <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-6 space-y-3">
                  <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5" />
                    AI Summary
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {summary}
                  </p>
                </div>
              )}

              {eli5 && (
                <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-6 space-y-3">
                  <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                    <Brain className="h-4.5 w-4.5" />
                    Explain Like I&apos;m Five (ELI5)
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {eli5}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Citations & Ingestion */}
        <div className="space-y-6">
          
          {/* Vector store Ingestion Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 backdrop-blur">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-400" />
              Vector Knowledge Base
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vectorizing index chunks this text inside the pgvector store, mapping concepts and entities, and linking them to your visual Knowledge Graph.
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-4 gap-2 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                Processing...
              </div>
            ) : graphed ? (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-green-400">
                  <Check className="h-4 w-4" />
                  Graphed successfully!
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Extracted and linked <span className="font-bold text-green-400">{graphedNodesCount}</span> entity relationship triples using the Nvidia NIM model.
                </p>
                <button
                  onClick={() => router.push(`/graph`)}
                  className="w-full mt-2 rounded bg-green-600/20 border border-green-500/30 py-1.5 text-center text-xs font-semibold text-green-300 hover:bg-green-600/30 transition-colors flex items-center justify-center gap-1"
                >
                  <Network className="h-3.5 w-3.5" />
                  View Graph Explorer
                </button>
              </div>
            ) : (
              <button
                onClick={handleIngestAndGraph}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white transition-colors shadow-lg shadow-indigo-600/15"
              >
                <Network className="h-4 w-4" />
                Vectorize & Auto-Graph
              </button>
            )}
          </div>

          {/* Citation Widget */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 backdrop-blur">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Quote className="h-4 w-4 text-indigo-400" />
              Citation Exporter
            </h3>
            
            <div className="flex flex-wrap gap-1.5">
              {citationFormats.map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => handleCitationFormatChange(fmt.id)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold border transition-colors ${
                    selectedCitationFormat === fmt.id
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {fmt.name}
                </button>
              ))}
            </div>

            {citation ? (
              <div className="rounded bg-slate-950 p-3 border border-slate-850 select-all font-mono text-[10px] break-all leading-normal text-slate-300">
                {citation}
              </div>
            ) : (
              <div className="text-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mx-auto text-indigo-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI sandbox: Summarize/ELI5 buttons and Q&A */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/10 p-6 md:p-8 space-y-6">
        <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          AI Research Sandbox
        </h3>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSummarize}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 px-4 py-2.5 text-xs font-semibold text-indigo-300 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate Summary
          </button>
          <button
            onClick={handleEli5}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition-colors"
          >
            <Brain className="h-4 w-4" />
            Explain Like I&apos;m 5
          </button>
        </div>

        {/* Q&A Over this Document */}
        <div className="border-t border-slate-800 pt-6 space-y-4">
          <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            Ask a Question
          </h4>

          <form onSubmit={handleAskQuestion} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about this document abstract..."
              className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 text-xs font-bold text-white transition-colors"
            >
              Ask
            </button>
          </form>

          {qaAnswer && (
            <div className="rounded-xl border border-slate-850 bg-slate-950 p-4 text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-indigo-400 block mb-1">Answer:</span>
              {qaAnswer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaperDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    }>
      <PaperDetailsComponent />
    </Suspense>
  );
}
