'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { KnowledgeGraph } from '@/components/KnowledgeGraph';
import { getEntity, getEntityGraph } from '@/lib/api';
import { EntityDetail, GraphResponse } from '@/lib/types';
import { 
  User, 
  Tag, 
  Building2, 
  ExternalLink, 
  FileText, 
  Share2, 
  BookOpen, 
  Calendar, 
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function EntityDetailPage() {
  const params = useParams();
  const entityId = parseInt(params.id as string, 10);

  const [entity, setEntity] = useState<EntityDetail | null>(null);
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'graph' | 'documents'>('graph');

  useEffect(() => {
    if (isNaN(entityId)) {
      setError('Invalid entity ID');
      setLoading(false);
      return;
    }

    async function loadEntityData() {
      setLoading(true);
      setError(null);
      try {
        const [ent, graph] = await Promise.all([
          getEntity(entityId),
          getEntityGraph(entityId).catch(() => ({ nodes: [], edges: [] })),
        ]);
        setEntity(ent);
        setGraphData(graph);
      } catch (err: any) {
        setError(err.message || 'Failed to load entity details');
      } finally {
        setLoading(false);
      }
    }

    loadEntityData();
  }, [entityId]);

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'person':
        return <User className="w-5 h-5 text-emerald-700" />;
      case 'org':
        return <Building2 className="w-5 h-5 text-amber-700" />;
      default:
        return <Tag className="w-5 h-5 text-purple-700" />;
    }
  };

  const getExternalLink = (extId: string, source?: string | null) => {
    if (extId.startsWith('0000-') || extId.includes('orcid.org')) {
      const cleanOrcid = extId.replace('https://orcid.org/', '');
      return {
        label: `ORCID: ${cleanOrcid}`,
        url: `https://orcid.org/${cleanOrcid}`,
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      };
    }
    if (extId.startsWith('Q') && !isNaN(Number(extId.slice(1)))) {
      return {
        label: `Wikidata: ${extId}`,
        url: `https://www.wikidata.org/wiki/${extId}`,
        badgeColor: 'bg-library-card text-library-dark border-library-border',
      };
    }
    return {
      label: extId,
      url: null,
      badgeColor: 'bg-library-card text-library-secondary border-library-border',
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Breadcrumb Navigation */}
      <div className="mb-6 flex items-center gap-2 text-xs text-library-muted">
        <Link href="/graph" className="hover:text-library-accent transition flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Knowledge Graph</span>
        </Link>
        <span>/</span>
        <span className="font-semibold text-library-dark truncate">
          {entity ? entity.name : `Entity #${entityId}`}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-library-accent animate-spin mb-3" />
          <p className="text-library-secondary text-sm">Resolving knowledge graph and entity links...</p>
        </div>
        ) : error || !entity ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 max-w-xl mx-auto my-12 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base mb-1">Entity Not Found</h3>
              <p className="text-sm">{error || 'The requested entity could not be retrieved.'}</p>
              <Link
                href="/graph"
                className="mt-3 inline-block text-xs font-semibold text-red-800 underline hover:text-red-900"
              >
                Back to Graph Explorer
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Entity Header Profile Banner */}
            <div className="bg-white border border-library-border rounded-xl p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-3 max-w-3xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-library-card border border-library-border">
                      {getTypeIcon(entity.entity_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-library-accent/10 text-library-accent border border-library-accent/20">
                          {entity.entity_type}
                        </span>
                        {entity.source && (
                          <span className="text-xs text-library-secondary font-medium">
                            via {entity.source}
                          </span>
                        )}
                      </div>
                      <h1 className="font-editorial text-2xl sm:text-4xl font-bold text-library-dark mt-1 tracking-tight">
                        {entity.name}
                      </h1>
                    </div>
                  </div>

                  {entity.description && (
                    <p className="text-library-secondary text-sm leading-relaxed pt-1 font-sans">
                      {entity.description}
                    </p>
                  )}

                  {/* Aliases & External Identifiers */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {entity.external_id && (() => {
                      const ext = getExternalLink(entity.external_id, entity.source);
                      return ext.url ? (
                        <a
                          href={ext.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition hover:opacity-80 ${ext.badgeColor}`}
                        >
                          <span>{ext.label}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${ext.badgeColor}`}>
                          {ext.label}
                        </span>
                      );
                    })()}

                    {entity.aliases && entity.aliases.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-library-muted">
                        <span className="font-medium text-library-secondary">Also known as:</span>
                        {entity.aliases.map((alias, i) => (
                          <span
                            key={i}
                            className="bg-library-card text-library-dark px-2 py-0.5 rounded border border-library-border"
                          >
                            {alias}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats Pill */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center p-4 bg-library-card border border-library-border rounded-xl min-w-[160px] flex-shrink-0">
                  <span className="text-xs font-medium text-library-secondary uppercase tracking-wider">
                    Linked Works
                  </span>
                  <span className="font-editorial text-3xl font-bold text-library-accent mt-0.5">
                    {entity.linked_documents.length}
                  </span>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="mt-8 border-t border-library-border pt-4 flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('graph')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === 'graph'
                      ? 'bg-library-accent text-white shadow-xs'
                      : 'text-library-secondary hover:text-library-dark hover:bg-library-card'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  <span>Knowledge Subgraph</span>
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === 'documents'
                      ? 'bg-library-accent text-white shadow-xs'
                      : 'text-library-secondary hover:text-library-dark hover:bg-library-card'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Linked Documents ({entity.linked_documents.length})</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Interactive Knowledge Graph */}
            {activeTab === 'graph' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-library-secondary">
                  <p>
                    Interactive network showing books, scholarly papers, and co-occurring entities
                    connected to <strong>{entity.name}</strong>.
                  </p>
                  <span className="text-library-muted">Drag nodes or click to inspect</span>
                </div>
                {graphData && graphData.nodes.length > 0 ? (
                  <KnowledgeGraph
                    nodes={graphData.nodes}
                    edges={graphData.edges}
                    rootId={`entity-${entity.id}`}
                    height={550}
                  />
                ) : (
                  <div className="p-12 text-center bg-white border border-library-border rounded-xl text-library-muted">
                    No graph connections available for this entity.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Linked Documents List */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <h3 className="font-editorial text-xl font-bold text-library-dark">
                  All Documents Linked to {entity.name}
                </h3>
                {entity.linked_documents.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-library-border rounded-xl text-library-muted">
                    No linked documents found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {entity.linked_documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-white border border-library-border hover:border-library-accent p-5 rounded-xl shadow-xs transition flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-library-card text-library-secondary border border-library-border">
                              {doc.source}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-library-accent/10 text-library-accent border border-library-accent/20 capitalize">
                              Role: {doc.role}
                            </span>
                          </div>

                          <Link
                            href={`/document/${doc.id}`}
                            className="font-editorial text-base font-bold text-library-dark hover:text-library-accent transition block leading-snug line-clamp-2"
                          >
                            {doc.title}
                          </Link>
                        </div>

                        <div className="mt-4 pt-3 border-t border-library-border/60 flex items-center justify-between text-xs text-library-secondary">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-library-muted" />
                            <span>
                              {doc.published_at
                                ? new Date(doc.published_at).getFullYear()
                                : 'Public Record'}
                            </span>
                          </div>
                          <Link
                            href={`/document/${doc.id}`}
                            className="font-semibold text-library-accent hover:text-library-accent-hover inline-flex items-center gap-1"
                          >
                            <span>Inspect</span>
                            <span>→</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
}
