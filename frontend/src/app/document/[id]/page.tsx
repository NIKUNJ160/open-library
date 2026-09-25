'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDocument } from '@/lib/api';
import { DocumentDetail } from '@/lib/types';
import { LicenseBadge } from '@/components/LicenseBadge';
import { CitationModal } from '@/components/CitationModal';
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Layers,
  Quote,
  Award,
  Hash,
  BookOpen,
  Tag
} from 'lucide-react';

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [citationOpen, setCitationOpen] = useState(false);

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

  const meta = doc.metadata_json || {};
  const doi = meta.doi;
  const pmid = meta.pmid;
  const pmcid = meta.pmcid;
  const venue = meta.venue || meta.journal;
  const citedBy = meta.cited_by_count;
  const topics = meta.topics || [];
  const authors = meta.authors || [];

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            onClick={() => setCitationOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition shadow-sm border border-indigo-100"
          >
            <Quote className="w-3.5 h-3.5" />
            <span>Cite / Export</span>
          </button>
        </div>

        {/* Main Document Card */}
        <article className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 flex-wrap">
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
              {venue && (
                <>
                  <span>•</span>
                  <span className="text-slate-700 font-medium normal-case italic">{venue}</span>
                </>
              )}
            </div>
            <LicenseBadge license={doc.license} />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
            {doc.title}
          </h1>

          {/* Scholarly Identifiers & Authors */}
          <div className="space-y-3 pt-1">
            {/* Authors with ORCID badges */}
            {authors.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center text-xs text-slate-700">
                <span className="font-semibold text-slate-500">Authors:</span>
                {authors.map((a: any, idx: number) => {
                  const name = typeof a === 'string' ? a : a.name;
                  const orcid = typeof a === 'object' ? a.orcid : null;
                  return (
                    <span key={idx} className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                      <span>{name}</span>
                      {orcid && (
                        <a
                          href={orcid.startsWith('http') ? orcid : `https://orcid.org/${orcid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-[10px] text-emerald-600 hover:text-emerald-700 font-mono"
                          title={`ORCID: ${orcid}`}
                        >
                          <Award className="w-3 h-3 text-emerald-500" />
                        </a>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Badges for DOI, PMID, PMCID, Citations */}
            <div className="flex flex-wrap gap-2 text-xs">
              {doi && (
                <a
                  href={`https://doi.org/${doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition font-mono text-[11px]"
                >
                  <Hash className="w-3 h-3" />
                  <span>DOI: {doi}</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </a>
              )}

              {pmid && (
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition font-mono text-[11px]"
                >
                  <span>PMID: {pmid}</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </a>
              )}

              {pmcid && (
                <a
                  href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition font-mono text-[11px]"
                >
                  <span>{pmcid}</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </a>
              )}

              {citedBy !== undefined && citedBy > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-semibold text-[11px]">
                  <span>Cited by {citedBy.toLocaleString()}</span>
                </span>
              )}
            </div>

            {/* Topics / Concepts */}
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {topics.map((t: string) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]"
                  >
                    <Tag className="w-2.5 h-2.5 text-slate-400" />
                    <span>{t}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Content Body */}
          {doc.content && (
            <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-5">
              {doc.content}
            </div>
          )}

          {/* Chunks preview if available */}
          {doc.chunks && doc.chunks.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Passage Chunks & Dense Vectors ({doc.chunks.length})</span>
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCitationOpen(true)}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium"
              >
                <Quote className="w-3.5 h-3.5 text-indigo-500" />
                <span>Export Citation</span>
              </button>
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
          </div>
        </article>
      </div>

      {/* Citation Modal */}
      <CitationModal
        documentId={doc.id}
        documentTitle={doc.title}
        isOpen={citationOpen}
        onClose={() => setCitationOpen(false)}
      />
    </>
  );
}
