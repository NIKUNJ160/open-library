"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Network, Loader2, Info, User, HelpCircle, 
  BookOpen, Folder, ArrowRight, Share2 
} from "lucide-react";
import { fetchFromApi } from "../api-client";

interface GraphNode {
  id: string;
  name: string;
  type: string;
  documentId?: string;
  metadata?: Record<string, any>;
}

interface GraphRelation {
  relationId: string;
  type: string;
  metadata?: Record<string, any>;
  target?: GraphNode;
  source?: GraphNode;
}

interface GraphResponse {
  entity: GraphNode;
  outbound: GraphRelation[];
  inbound: GraphRelation[];
}

interface CollectionItem {
  id: string;
  documentId?: string;
  title: string;
}

interface Collection {
  id: string;
  name: string;
  items?: CollectionItem[];
}

function GraphExplorerComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Active query node ID
  const activeNodeId = searchParams.get("id") || "";

  // States
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Starting points state (from collections)
  const [collections, setCollections] = useState<Collection[]>([]);
  const [resolvingDocId, setResolvingDocId] = useState<string | null>(null);

  // Load collections as starting points
  useEffect(() => {
    if (!activeNodeId) {
      fetchFromApi("/collections")
        .then((data) => setCollections(data))
        .catch(() => {});
    }
  }, [activeNodeId]);

  // Load graph data when activeNodeId changes
  useEffect(() => {
    if (!activeNodeId) {
      setGraphData(null);
      return;
    }

    const fetchGraph = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFromApi(`/graph/entity/${activeNodeId}`);
        setGraphData(data);
      } catch (err: any) {
        setError(err.message || "Failed to resolve node neighbors");
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [activeNodeId]);

  const handleResolveDocumentGraph = async (documentId: string) => {
    setResolvingDocId(documentId);
    try {
      // In NestJS, autoGraphDocument resolves or creates the node and returns the node ID
      const res = await fetchFromApi(`/graph/document/${documentId}/graph`, {
        method: "POST",
      });
      if (res.documentNodeId) {
        router.push(`/graph?id=${res.documentNodeId}`);
      } else {
        alert("Could not extract graph nodes for this document.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to resolve document graph");
    } finally {
      setResolvingDocId(null);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    router.push(`/graph?id=${nodeId}`);
  };

  // Color mapping based on entity types
  const getNodeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "document":
        return { bg: "bg-indigo-600", text: "text-indigo-400", border: "border-indigo-500", fill: "#4f46e5" };
      case "concept":
        return { bg: "bg-emerald-600", text: "text-emerald-400", border: "border-emerald-500", fill: "#059669" };
      case "author":
        return { bg: "bg-sky-650", text: "text-sky-400", border: "border-sky-500", fill: "#0284c7" };
      case "institution":
        return { bg: "bg-fuchsia-600", text: "text-fuchsia-400", border: "border-fuchsia-500", fill: "#c026d3" };
      default:
        return { bg: "bg-slate-600", text: "text-slate-400", border: "border-slate-500", fill: "#475569" };
    }
  };

  // Compute SVG Layout dimensions
  const width = 600;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;

  // Compile unique nodes to render
  const renderNodes: { id: string; name: string; type: string; x: number; y: number }[] = [];
  const renderEdges: { sourceId: string; targetId: string; type: string }[] = [];

  if (graphData) {
    // 1. Center node
    renderNodes.push({
      id: graphData.entity.id,
      name: graphData.entity.name,
      type: graphData.entity.type,
      x: centerX,
      y: centerY,
    });

    // Gather unique neighbors
    const neighbors: { id: string; name: string; type: string; isOutbound: boolean; relationType: string }[] = [];
    const seenNeighborIds = new Set<string>();

    graphData.outbound.forEach((rel) => {
      if (rel.target && rel.target.id !== graphData.entity.id) {
        if (!seenNeighborIds.has(rel.target.id)) {
          seenNeighborIds.add(rel.target.id);
          neighbors.push({
            id: rel.target.id,
            name: rel.target.name,
            type: rel.target.type,
            isOutbound: true,
            relationType: rel.type,
          });
        }
        renderEdges.push({
          sourceId: graphData.entity.id,
          targetId: rel.target.id,
          type: rel.type,
        });
      }
    });

    graphData.inbound.forEach((rel) => {
      if (rel.source && rel.source.id !== graphData.entity.id) {
        if (!seenNeighborIds.has(rel.source.id)) {
          seenNeighborIds.add(rel.source.id);
          neighbors.push({
            id: rel.source.id,
            name: rel.source.name,
            type: rel.source.type,
            isOutbound: false,
            relationType: rel.type,
          });
        }
        renderEdges.push({
          sourceId: rel.source.id,
          targetId: graphData.entity.id,
          type: rel.type,
        });
      }
    });

    // 2. Position neighbors radially
    const radius = 150;
    neighbors.forEach((node, index) => {
      const angle = (index * 2 * Math.PI) / neighbors.length;
      renderNodes.push({
        id: node.id,
        name: node.name,
        type: node.type,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Network className="h-5 w-5 text-indigo-400" />
            Knowledge Graph Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Traverse concepts, research papers, and entities connected semantically by the AI pipeline.
          </p>
        </div>
        {activeNodeId && (
          <button
            onClick={() => router.push("/graph")}
            className="rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 transition-colors"
          >
            Clear Explorer
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-400">Resolving neighborhood nodes...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-400">
          {error}
        </div>
      ) : graphData ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* SVG Visualizer Board */}
          <div className="lg:col-span-3 border border-slate-800 bg-slate-950/40 rounded-2xl p-4 flex items-center justify-center overflow-hidden min-h-[420px]">
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full max-w-2xl h-auto select-none"
            >
              {/* Markers for arrows */}
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
                </marker>
              </defs>

              {/* Draw Edges */}
              {renderEdges.map((edge, i) => {
                const src = renderNodes.find((n) => n.id === edge.sourceId);
                const tgt = renderNodes.find((n) => n.id === edge.targetId);
                if (!src || !tgt) return null;

                return (
                  <g key={i}>
                    {/* Line */}
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke="#1e293b"
                      strokeWidth="2"
                      markerEnd="url(#arrow)"
                    />
                    {/* Edge Label */}
                    <text
                      x={(src.x + tgt.x) / 2}
                      y={(src.y + tgt.y) / 2 - 4}
                      fill="#475569"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="bg-slate-950 px-1"
                    >
                      {edge.type}
                    </text>
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {renderNodes.map((node) => {
                const isCenter = node.id === graphData.entity.id;
                const colors = getNodeColor(node.type);
                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${node.x},${node.y})`}
                    className="cursor-pointer"
                    onClick={() => handleNodeClick(node.id)}
                  >
                    {/* Circle body */}
                    <circle
                      r={isCenter ? "16" : "12"}
                      fill={colors.fill}
                      stroke={isCenter ? "#818cf8" : "#1e293b"}
                      strokeWidth={isCenter ? "3" : "1.5"}
                      className="transition-all hover:scale-110"
                    />
                    {/* Label */}
                    <text
                      y={isCenter ? "30" : "24"}
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight={isCenter ? "bold" : "normal"}
                      textAnchor="middle"
                      className="pointer-events-none drop-shadow"
                    >
                      {node.name.length > 22 ? `${node.name.slice(0, 20)}...` : node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Node Inspector Details Panel */}
          <div className="lg:col-span-1 border border-slate-800 bg-slate-900/30 rounded-2xl p-5 space-y-4 backdrop-blur">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="h-4 w-4" />
              Node Inspector
            </h3>

            <div className="space-y-3">
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Label / Name</span>
                <span className="text-sm font-bold text-slate-200 block mt-0.5">{graphData.entity.name}</span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Entity Type</span>
                <span className="text-xs font-semibold text-slate-400 capitalize block mt-0.5">{graphData.entity.type}</span>
              </div>

              {graphData.entity.metadata && Object.keys(graphData.entity.metadata).length > 0 && (
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Metadata</span>
                  <div className="rounded bg-slate-950 p-2 border border-slate-850 font-mono text-[9px] text-slate-400 max-h-48 overflow-y-auto space-y-1">
                    {Object.entries(graphData.entity.metadata).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-indigo-400">{k}:</span> {JSON.stringify(v)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-4 text-[10px] text-slate-500 space-y-1">
              <span className="font-bold uppercase tracking-wider block text-slate-400">Interaction Tip:</span>
              <p>Click on any neighboring node in the visualization board to center the graph around it and fetch its connections.</p>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State starting point selector */
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/10 p-6 max-w-2xl mx-auto space-y-4 text-center">
            <Network className="h-8 w-8 text-indigo-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">No active graph node loaded</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Open a research paper details page and click &ldquo;Vectorize & Auto-Graph&rdquo; to populate relations. Or select one of your collected documents below to generate/view its neighborhood structure:
            </p>
          </div>

          {/* Render collection items as starting points */}
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              Select Starting Point from Collections
            </h3>

            <div className="space-y-2">
              {collections.map((col) => (
                <div key={col.id} className="space-y-2">
                  {col.items && col.items.map((item) => {
                    const isResolving = resolvingDocId === item.documentId;
                    if (!item.documentId) return null; // Can only graph database stubs
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-800 bg-slate-900/15 p-4 flex justify-between items-center hover:bg-slate-900/30 hover:border-slate-700 transition-all cursor-pointer"
                        onClick={() => !isResolving && handleResolveDocumentGraph(item.documentId!)}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Folder className="h-4 w-4 text-slate-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-200 truncate">{item.title}</span>
                        </div>
                        <button
                          disabled={isResolving}
                          className="rounded-lg bg-indigo-600/15 border border-indigo-500/20 text-indigo-300 px-3 py-1 text-xs font-semibold flex items-center gap-1 hover:bg-indigo-500/25 transition-all"
                        >
                          {isResolving ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" /> Graphing...
                            </>
                          ) : (
                            <>
                              View Graph <ArrowRight className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}

              {collections.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-6">
                  Add items to your collection first to start exploring their connections!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GraphExplorerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    }>
      <GraphExplorerComponent />
    </Suspense>
  );
}
