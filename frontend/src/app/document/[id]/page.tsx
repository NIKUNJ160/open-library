'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getDocument } from '@/lib/api';
import { DocumentDetail } from '@/lib/types';
import { CitationModal } from '@/components/CitationModal';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Quote,
  ExternalLink,
  Tag,
  User,
  Hash,
  Globe,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [citationOpen, setCitationOpen] = useState(false);
  const [coverError, setCoverError] = useState(false);

  useEffect(() => {
    if (!documentId) return;

    getDocument(documentId)
      .then((data) => setDoc(data))
      .catch((err) => setError(err.message || 'Failed to load document'))
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-library-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-library-accent mb-3" />
        <p className="text-xs uppercase tracking-wider font-semibold">Retrieving bibliographic catalog record...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-editorial text-2xl font-bold text-library-dark">Document Unavailable</h2>
        <p className="text-sm text-library-secondary">{error || 'Could not locate this catalog record.'}</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-library-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-library-accent-hover transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </button>
      </div>
    );
  }

  const meta = doc.metadata_json || {};
  const authors: string[] = meta.authors
    ? Array.isArray(meta.authors)
      ? meta.authors.map((a: any) => (typeof a === 'string' ? a : a.name || a.display_name))
      : [String(meta.authors)]
    : [];

  const year = doc.published_at ? new Date(doc.published_at).getFullYear() : null;

  return (
    <div className="space-y-12">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-library-muted">
          <Link href="/search" className="hover:text-library-accent transition flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Catalog Search</span>
          </Link>
          <span>/</span>
          <span className="uppercase font-semibold text-library-secondary">{doc.source}</span>
          <span>/</span>
          <span className="font-bold text-library-dark truncate max-w-sm">{doc.title}</span>
        </div>

        {/* Section 13: Two-Column Book / Document Presentation */}
        <section className="bg-white border border-library-border rounded-md p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12">
            {/* Left Column: Simulated Book Cover & Quick Actions */}
            <div className="md:col-span-4 lg:col-span-4 space-y-5">
              {doc.cover_url && !coverError ? (
                <div className="relative aspect-[2/3] w-full rounded bg-stone-900 border border-stone-800 shadow-md overflow-hidden group">
                  <img
                    src={doc.cover_url}
                    alt={doc.title}
                    className="w-full h-full object-cover"
                    onError={() => setCoverError(true)}
                  />
                  {/* Subtle Spine Crease & Shadow */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none border-r border-white/10" />
                  {/* Format Badge */}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-black/80 backdrop-blur-sm text-white border border-white/20 shadow-sm pointer-events-none">
                    {doc.doc_type || 'edition'}
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[2/3] w-full rounded bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 p-6 shadow-md flex flex-col justify-between overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-black/30 border-r border-white/10" />
                  <div className="pl-3 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-stone-300">
                      {doc.doc_type || 'edition'}
                    </span>
                    <span className="text-[10px] font-mono text-stone-300">{year || 'Archive'}</span>
                  </div>

                  <div className="pl-3 space-y-2">
                    <h2 className="font-editorial text-xl sm:text-2xl font-bold text-white leading-snug drop-shadow-sm">
                      {doc.title}
                    </h2>
                    {authors.length > 0 && (
                      <p className="text-xs text-stone-200 italic font-medium">
                        By {authors.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Link
                  href={`/read/${doc.id}`}
                  className="w-full py-3 px-4 rounded bg-library-accent text-white font-bold text-xs uppercase tracking-wider hover:bg-library-accent-hover transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Read Online</span>
                </Link>

                {doc.ia_id && (
                  <Link
                    href={`/read/${doc.id}?mode=ia`}
                    className="w-full py-2.5 px-3 rounded border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-950 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-sky-700" />
                    <span>Interactive Flipbook</span>
                  </Link>
                )}

                {doc.pdf_url && (
                  <a
                    href={doc.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-950 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-purple-700" />
                    <span>Open Full-Text PDF</span>
                  </a>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCitationOpen(true)}
                    className="py-2.5 px-3 rounded border border-library-border hover:bg-library-card text-xs font-semibold text-library-dark transition flex items-center justify-center gap-1.5"
                  >
                    <Quote className="w-3.5 h-3.5 text-library-muted" />
                    <span>Cite / Export</span>
                  </button>

                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded border border-library-border hover:bg-library-card text-xs font-semibold text-library-dark transition flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-library-muted" />
                      <span>Original</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="py-2.5 px-3 rounded border border-library-border/50 text-xs font-medium text-library-muted opacity-50"
                    >
                      Repository
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Bibliographic Details */}
            <div className="md:col-span-8 lg:col-span-8 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-library-accent flex-wrap">
                  <span>{doc.source}</span>
                  <span>•</span>
                  <span>{doc.doc_type}</span>
                  <span>•</span>
                  <span>{doc.license}</span>
                  {doc.has_fulltext && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300/80 font-bold ml-1">
                      Full Text Available
                    </span>
                  )}
                </div>
                <h1 className="font-editorial text-2xl sm:text-4xl font-extrabold text-library-dark leading-tight">
                  {doc.title}
                </h1>
                {authors.length > 0 && (
                  <p className="text-base text-library-secondary italic pt-1">
                    By {authors.join(', ')}
                  </p>
                )}
              </div>

              {/* Publication Status & Rights Notice */}
              {doc.has_fulltext || doc.ia_id || doc.pdf_url ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-950 flex items-start gap-2.5">
                  <BookOpen className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Unabridged Full Text: </span>
                    <span>
                      {doc.ia_id
                        ? 'Includes digitized historical volume from the Internet Archive with interactive page-flip reader, zoom, and text search.'
                        : doc.pdf_url
                        ? 'Published under Open Access with complete unabridged scientific publication PDF available.'
                        : doc.source === 'wikipedia'
                        ? 'Complete multi-section encyclopedia article available unabridged in reader mode.'
                        : 'Unabridged public domain text available to read.'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Bibliographic Record & Synopsis: </span>
                    <span>
                      Search indexes display executive synopses and metadata for modern copyrighted works. To read or borrow complete copyrighted volumes, visit the original library or publisher repository linked below.
                    </span>
                  </div>
                </div>
              )}

              {/* Metadata Table */}
              <div className="border border-library-border rounded-md bg-library-bg/60 p-4 divide-y divide-library-border/60 text-xs">
                {year && (
                  <div className="py-2 flex justify-between">
                    <span className="text-library-muted uppercase tracking-wider font-semibold">Publication Year</span>
                    <span className="font-mono font-medium text-library-dark">{year}</span>
                  </div>
                )}
                <div className="py-2 flex justify-between">
                  <span className="text-library-muted uppercase tracking-wider font-semibold">Language</span>
                  <span className="capitalize font-medium text-library-dark">{doc.language || 'English'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-library-muted uppercase tracking-wider font-semibold">License Rights</span>
                  <span className="font-medium text-library-dark">{doc.license}</span>
                </div>
                {meta.doi && (
                  <div className="py-2 flex justify-between">
                    <span className="text-library-muted uppercase tracking-wider font-semibold">Digital Object Identifier (DOI)</span>
                    <span className="font-mono text-library-accent font-semibold">{meta.doi}</span>
                  </div>
                )}
                {meta.venue && (
                  <div className="py-2 flex justify-between">
                    <span className="text-library-muted uppercase tracking-wider font-semibold">Journal / Venue</span>
                    <span className="font-medium text-library-dark">{meta.venue}</span>
                  </div>
                )}
                {doc.chunks && (
                  <div className="py-2 flex justify-between">
                    <span className="text-library-muted uppercase tracking-wider font-semibold">Indexed Passage Chunks</span>
                    <span className="font-mono font-medium text-library-dark">{doc.chunks.length} sections</span>
                  </div>
                )}
              </div>

              {/* Description / Summary Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase font-bold tracking-wider text-library-dark">
                    About this Work
                  </h3>
                  <span className="text-[10px] text-library-muted uppercase font-mono">
                    {doc.has_fulltext ? 'Full Text / Synopsis' : 'Executive Abstract'}
                  </span>
                </div>
                <p className="text-sm text-library-secondary leading-relaxed whitespace-pre-line">
                  {doc.content || 'No detailed synopsis provided for this record.'}
                </p>
              </div>

              {/* Linked Knowledge Graph Entities */}
              {doc.entities && doc.entities.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-library-border/80">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs uppercase font-bold tracking-wider text-library-dark">
                      Resolved Entities & Authorities
                    </h3>
                    <Link href="/graph" className="text-xs text-library-accent font-bold hover:underline">
                      Explore Graph →
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {doc.entities.map((ent) => (
                      <Link
                        key={ent.id}
                        href={`/entity/${ent.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-library-card border border-library-border hover:border-library-accent hover:text-library-accent transition text-xs"
                      >
                        <User className="w-3.5 h-3.5 text-library-muted" />
                        <span className="font-semibold">{ent.name}</span>
                        <span className="text-[10px] text-library-muted uppercase">({ent.role})</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section: Indexed Passages Preview */}
        {doc.chunks && doc.chunks.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-library-border pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-library-muted">
                  Passage Chunks
                </span>
                <h2 className="font-editorial text-xl sm:text-2xl font-bold text-library-dark">
                  Indexed Full-Text Sections ({doc.chunks.length})
                </h2>
              </div>
              <Link
                href={`/read/${doc.id}`}
                className="text-xs uppercase font-bold text-library-accent hover:underline flex items-center gap-1"
              >
                <span>Read Full Document</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doc.chunks.slice(0, 4).map((chunk) => (
                <div
                  key={chunk.chunk_index}
                  className="bg-white border border-library-border rounded-md p-5 space-y-2 hover:border-library-accent/60 transition"
                >
                  <span className="text-[10px] uppercase font-mono text-library-muted tracking-wider">
                    Section #{chunk.chunk_index + 1}
                  </span>
                  <p className="text-xs text-library-secondary leading-relaxed line-clamp-4">
                    {chunk.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Citation Modal */}
      {citationOpen && (
        <CitationModal
          documentId={doc.id}
          documentTitle={doc.title}
          onClose={() => setCitationOpen(false)}
        />
      )}
    </div>
  );
}
