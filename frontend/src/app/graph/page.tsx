'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KnowledgeGraph } from '@/components/KnowledgeGraph';
import { getGraphOverview, getEntities } from '@/lib/api';
import { GraphResponse, EntitySummary } from '@/lib/types';
import { 
  Network, 
  Search, 
  User, 
  Tag, 
  Building2, 
  ExternalLink, 
  ArrowRight, 
  Loader2, 
  Share2, 
  ListFilter,
  Sparkles
} from 'lucide-react';

export default function GlobalGraphPage() {
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [overview, entList] = await Promise.all([
          getGraphOverview({ limit_entities: 30, limit_edges: 50 }).catch(() => ({
            nodes: [],
            edges: [],
          })),
          getEntities({
            q: searchQuery || undefined,
            entity_type: selectedType !== 'all' ? selectedType : undefined,
            page_size: 24,
          }).catch(() => ({ total: 0, page: 1, page_size: 24, items: [] })),
        ]);
        setGraphData(overview);
        setEntities(entList.items);
      } catch (err) {
        console.error('Failed to load graph data:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      loadData();
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedType]);

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'person':
        return <User className="w-4 h-4 text-emerald-700" />;
      case 'org':
        return <Building2 className="w-4 h-4 text-amber-700" />;
      default:
        return <Tag className="w-4 h-4 text-purple-700" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Hero Header */}
      <div className="bg-library-dark border border-stone-800 rounded-xl p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-library-accent/20 border border-library-accent/40 text-amber-200 text-xs font-semibold">
            <Network className="w-3.5 h-3.5" />
            <span>Phase 5: Knowledge Graph & Entity Resolution</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Knowledge Graph & Entity Explorer
          </h1>
          <p className="text-stone-300 text-sm sm:text-base leading-relaxed font-sans">
            Explore interconnected authors, foundational theories, canonical Wikidata entities,
            and scholarly citations linking open knowledge across disciplines.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-library-border rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-library-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entities (e.g. Einstein, Attention, CRISPR)..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-library-border bg-library-card text-sm focus:outline-none focus:border-library-accent focus:ring-1 focus:ring-library-accent text-library-dark placeholder:text-library-muted transition"
          />
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          {/* Entity Type Filter */}
          <div className="flex items-center bg-library-card p-1 rounded-lg border border-library-border text-xs font-medium text-library-secondary">
            {['all', 'person', 'topic', 'org'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded capitalize transition ${
                  selectedType === type
                    ? 'bg-library-accent text-white font-semibold shadow-xs'
                    : 'hover:text-library-dark'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-library-card p-1 rounded-lg border border-library-border text-xs font-medium text-library-secondary">
            <button
              onClick={() => setViewMode('graph')}
              className={`p-1.5 rounded transition ${
                viewMode === 'graph' ? 'bg-library-accent text-white shadow-xs' : 'hover:text-library-dark'
              }`}
              title="Graph View"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition ${
                viewMode === 'list' ? 'bg-library-accent text-white shadow-xs' : 'hover:text-library-dark'
              }`}
              title="Directory List View"
            >
              <ListFilter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-library-accent animate-spin mb-3" />
          <p className="text-library-secondary text-sm">Traversing knowledge graph...</p>
        </div>
      ) : viewMode === 'graph' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-library-secondary">
            <p>
              Showing top interconnected knowledge hubs. Click any node to open its dedicated
              subgraph profile.
            </p>
            <span className="text-library-muted">{graphData?.nodes.length || 0} nodes rendered</span>
          </div>

          {graphData && graphData.nodes.length > 0 ? (
            <KnowledgeGraph
              nodes={graphData.nodes}
              edges={graphData.edges}
              rootId={null}
              height={600}
            />
          ) : (
            <div className="p-16 text-center bg-white border border-library-border rounded-xl text-library-muted">
              No graph connections found in the database. Run sample ingestion to populate entities.
            </div>
          )}
        </div>
      ) : null}

      {/* Entity Cards Directory Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-editorial text-xl sm:text-2xl font-bold text-library-dark">
            Canonical Entity Directory ({entities.length})
          </h2>
          <span className="text-xs text-library-secondary">Resolved via ORCID & Wikidata QIDs</span>
        </div>

        {entities.length === 0 ? (
          <div className="p-12 text-center bg-white border border-library-border rounded-xl text-library-muted">
            No matching entities found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entities.map((entity) => (
              <div
                key={entity.id}
                className="bg-white border border-library-border hover:border-library-accent p-5 rounded-xl shadow-xs hover:shadow-sm transition flex flex-col justify-between group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-library-card border border-library-border">
                        {getTypeIcon(entity.entity_type)}
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-library-accent/10 text-library-accent border border-library-accent/20">
                        {entity.entity_type}
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-library-card border border-library-border text-library-secondary">
                      {entity.doc_count} works
                    </span>
                  </div>

                  <Link
                    href={`/entity/${entity.id}`}
                    className="font-editorial text-base font-bold text-library-dark group-hover:text-library-accent transition block leading-snug"
                  >
                    {entity.name}
                  </Link>

                  {entity.description && (
                    <p className="text-xs text-library-secondary line-clamp-2 leading-relaxed font-sans">
                      {entity.description}
                    </p>
                  )}

                  {entity.external_id && (
                    <div className="pt-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-library-card border border-library-border text-library-muted">
                        {entity.external_id}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-library-border/60 flex items-center justify-between text-xs">
                  <Link
                    href={`/entity/${entity.id}`}
                    className="text-library-accent font-semibold hover:text-library-accent-hover inline-flex items-center gap-1"
                  >
                    <span>Explore Subgraph</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
