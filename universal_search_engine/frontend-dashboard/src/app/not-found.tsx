import Link from "next/link";
import { Search, Home, Bookmark, MessageSquare, Share2, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6">
        <HelpCircle className="h-8 w-8" />
      </div>

      <span className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
        404 — Page Not Found
      </span>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-100 sm:text-5xl">
        This route does not exist
      </h1>
      <p className="mt-4 max-w-md text-sm text-slate-400">
        The requested URL was not recognized by the frontend application. 
        If you were attempting to access the backend API (Swagger docs or health endpoints), those run directly on the NestJS API server.
      </p>

      {/* Suggested Routes Grid */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg text-left">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-sm font-medium text-slate-200 hover:border-indigo-500/40 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
        >
          <Home className="h-4 w-4 text-indigo-400" />
          <div>
            <div className="font-semibold text-xs text-slate-100">Home</div>
            <div className="text-xs text-slate-500">Universal search landing page</div>
          </div>
        </Link>

        <Link
          href="/search"
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-sm font-medium text-slate-200 hover:border-indigo-500/40 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
        >
          <Search className="h-4 w-4 text-indigo-400" />
          <div>
            <div className="font-semibold text-xs text-slate-100">Search & Results</div>
            <div className="text-xs text-slate-500">Search 33 knowledge sources</div>
          </div>
        </Link>

        <Link
          href="/ask"
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-sm font-medium text-slate-200 hover:border-indigo-500/40 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
        >
          <MessageSquare className="h-4 w-4 text-indigo-400" />
          <div>
            <div className="font-semibold text-xs text-slate-100">RAG Q&A Assistant</div>
            <div className="text-xs text-slate-500">Grounded semantic query answers</div>
          </div>
        </Link>

        <Link
          href="/collections"
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-sm font-medium text-slate-200 hover:border-indigo-500/40 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
        >
          <Bookmark className="h-4 w-4 text-indigo-400" />
          <div>
            <div className="font-semibold text-xs text-slate-100">Collections</div>
            <div className="text-xs text-slate-500">Saved papers & citation export</div>
          </div>
        </Link>

        <Link
          href="/graph"
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-sm font-medium text-slate-200 hover:border-indigo-500/40 hover:bg-slate-900 hover:text-white transition-all shadow-sm sm:col-span-2"
        >
          <Share2 className="h-4 w-4 text-indigo-400" />
          <div>
            <div className="font-semibold text-xs text-slate-100">Knowledge Graph Explorer</div>
            <div className="text-xs text-slate-500">Explore extracted entity triples and relations</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
