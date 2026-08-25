"use client";

import { useState } from "react";
import { 
  MessageSquare, Send, Database, Loader2, 
  Sparkles, Check, Paperclip, ExternalLink, RefreshCw, FileText
} from "lucide-react";
import { fetchFromApi } from "../api-client";

interface Source {
  content: string;
  chunkIndex: number;
  documentTitle?: string;
  sourceUrl?: string;
  sourceName?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am your AI research assistant. Ask me questions about any of your vectorized documents, and I'll answer them using grounded contexts.",
    },
  ]);
  
  const [question, setQuestion] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);

  // Ingestion states
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestContent, setIngestContent] = useState("");
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setQueryLoading(true);

    try {
      const res = await fetchFromApi("/search/rag/query", {
        method: "POST",
        body: JSON.stringify({
          question: userMessage.content,
          topK: 5,
        }),
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        sources: res.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err.message || "Failed to communicate with RAG pipeline"}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleIngestText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestTitle.trim() || !ingestContent.trim()) return;
    setIngestLoading(true);
    setIngestSuccess(null);

    try {
      const res = await fetchFromApi("/search/rag/ingest", {
        method: "POST",
        body: JSON.stringify({
          title: ingestTitle.trim(),
          content: ingestContent.trim(),
          sourceUrl: ingestUrl.trim() || undefined,
          sourceName: "Custom Dashboard Ingest",
          contentType: "article",
        }),
      });

      setIngestSuccess(`Successfully vectorized! Created ${res.chunksCount} chunks.`);
      setIngestTitle("");
      setIngestContent("");
      setIngestUrl("");
      setTimeout(() => setIngestSuccess(null), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to ingest content");
    } finally {
      setIngestLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-12rem)] min-h-[500px]">
      
      {/* Sidebar - Add custom grounding document */}
      <aside className="lg:col-span-1 border border-slate-800 bg-slate-900/40 rounded-2xl p-5 backdrop-blur flex flex-col space-y-4 overflow-y-auto">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Database className="h-4 w-4 text-indigo-400" />
          Ingest Context
        </h2>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Vectorize and partition raw articles or custom research notes. Once uploaded, the vector search engine will locate relevant chunks to answer chatbot queries.
        </p>

        {ingestSuccess && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-2.5 text-xs text-green-400 flex items-center gap-1.5">
            <Check className="h-4 w-4" />
            {ingestSuccess}
          </div>
        )}

        <form onSubmit={handleIngestText} className="space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={ingestTitle}
                onChange={(e) => setIngestTitle(e.target.value)}
                placeholder="e.g. Einstein Relativity Notes"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-700 focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Source URL
              </label>
              <input
                type="text"
                value={ingestUrl}
                onChange={(e) => setIngestUrl(e.target.value)}
                placeholder="e.g. https://domain.com/article"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-700 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Full Text Content
              </label>
              <textarea
                value={ingestContent}
                onChange={(e) => setIngestContent(e.target.value)}
                placeholder="Paste full paper section or raw content text here..."
                rows={8}
                className="w-full flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-700 focus:border-indigo-500 focus:outline-none resize-none font-sans"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={ingestLoading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1 shadow-md shadow-indigo-600/10"
          >
            {ingestLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Ingesting...
              </>
            ) : (
              <>
                <Paperclip className="h-3.5 w-3.5" /> Ingest Document
              </>
            )}
          </button>
        </form>
      </aside>

      {/* Main Panel - RAG Q&A Chat window */}
      <section className="lg:col-span-3 border border-slate-800 bg-slate-900/15 rounded-2xl flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="border-b border-slate-800 bg-slate-900/40 p-4 flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-indigo-400" />
          <div>
            <h1 className="text-sm font-bold text-slate-200">Grounded Research Chat</h1>
            <p className="text-[10px] text-slate-500">Queries are matched semantically inside pgvector against ingested document chunks.</p>
          </div>
        </div>

        {/* Chat message logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((msg) => {
            const isAssistant = msg.role === "assistant";
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${isAssistant ? "self-start" : "self-end items-end ml-auto"}`}
              >
                <div
                  className={`rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                    isAssistant
                      ? "bg-slate-900 border border-slate-800 text-slate-200"
                      : "bg-indigo-600 text-white font-medium"
                  }`}
                >
                  {msg.content}
                </div>

                {/* Grounding sources rendering */}
                {isAssistant && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pl-2 border-l border-indigo-500/30 space-y-1 w-full">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Grounded Context Sources:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          className="group relative rounded bg-slate-950 border border-slate-850 px-2 py-1 text-[9px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-default"
                          title={src.content}
                        >
                          <FileText className="h-2.5 w-2.5 text-slate-500" />
                          <span className="max-w-[140px] truncate">
                            {src.documentTitle || "Document"}
                          </span>
                          {src.sourceUrl && (
                            <a
                              href={src.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:text-indigo-300"
                            >
                              <ExternalLink className="h-2 w-2" />
                            </a>
                          )}
                          
                          {/* Tooltip for raw chunk content */}
                          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block w-72 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[9px] text-slate-400 shadow-2xl z-55 max-h-40 overflow-y-auto">
                            <span className="font-bold text-indigo-400 block mb-1">
                              Source {i + 1} - Chunk {src.chunkIndex}:
                            </span>
                            {src.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {queryLoading && (
            <div className="flex items-center gap-2 self-start rounded-2xl bg-slate-900 border border-slate-800 p-4 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              <span>Matching chunks and generating model response...</span>
            </div>
          )}
        </div>

        {/* Input area */}
        <form onSubmit={handleSendQuestion} className="border-t border-slate-800 bg-slate-900/40 p-4 flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={queryLoading}
            placeholder="Type question about your research base..."
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-650 focus:border-indigo-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={queryLoading}
            className="rounded-xl bg-indigo-600 px-5 text-white hover:bg-indigo-500 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  );
}
