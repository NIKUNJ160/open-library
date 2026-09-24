'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDocument } from '@/lib/api';
import { DocumentDetail } from '@/lib/types';
import { LicenseBadge } from '@/components/LicenseBadge';
import { ArrowLeft, ExternalLink, Calendar, BookOpen, Layers, ShieldCheck, Tag } from 'lucide-react';
import Link from 'next/link';

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    getDocument(documentId)
      .then((data) => setDoc(data))
      .catch((err) => setError(err.message || 'Failed to load document'))
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500">
        <p>Loading document details...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Document Unavailable</h2>
        <p className="text-sm text-slate-500 mb-6">{error || 'Could not locate this record.'}</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Search</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Main Document Card */}
      <article className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        {/* Header Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100">{doc.source}</span>
            <span>•</span>
            <span className="capitalize">{doc.doc_type}</span>
            {doc.published_at && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {doc.published_at.slice(0, 10)}
                </span>
              </>
            )}
          </div>
          <LicenseBadge license={doc.license} />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
          {doc.title}
        </h1>

        {/* Content Body */}
        {doc.content && (
          <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {doc.content}
          </div>
        )}

        {/* Chunks preview if available */}
        {doc.chunks && doc.chunks.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Passage Chunks ({doc.chunks.length})</span>
            </h3>
            <div className="space-y-2">
              {doc.chunks.map((chunk) => (
                <div
                  key={chunk.chunk_index}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600"
                >
                  <span className="font-semibold text-slate-400 mr-2">
                    Chunk #{chunk.chunk_index + 1}:
                  </span>
                  {chunk.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Provenance & External Links */}
        <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="font-mono text-slate-400">
            Source Record ID: {doc.source_id}
          </div>
          {doc.url && (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              <span>View Upstream Resource</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </article>
    </div>
  );
}
