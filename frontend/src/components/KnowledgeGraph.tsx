'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraphNode, GraphEdge } from '@/lib/types';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  User, 
  Tag, 
  Building2, 
  FileText, 
  ExternalLink,
  Info,
  Maximize2
} from 'lucide-react';

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootId?: string | null;
  height?: number | string;
  onNodeClick?: (node: GraphNode) => void;
  interactive?: boolean;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging?: boolean;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  person: { bg: '#10b981', border: '#059669', text: '#ffffff' },
  topic: { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff' },
  org: { bg: '#f59e0b', border: '#d97706', text: '#ffffff' },
  place: { bg: '#06b6d4', border: '#0891b2', text: '#ffffff' },
  document: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' },
  book: { bg: '#6366f1', border: '#4f46e5', text: '#ffffff' },
  paper: { bg: '#0284c7', border: '#0369a1', text: '#ffffff' },
  encyclopedia: { bg: '#14b8a6', border: '#0d9488', text: '#ffffff' },
};

function getNodeColor(node: GraphNode) {
  if (node.is_root) {
    return { bg: '#4f46e5', border: '#3730a3', text: '#ffffff' };
  }
  const typeKey = (node.type || '').toLowerCase();
  if (TYPE_COLORS[typeKey]) return TYPE_COLORS[typeKey];
  if (node.category === 'document') return TYPE_COLORS.document;
  return { bg: '#64748b', border: '#475569', text: '#ffffff' };
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  nodes: initialNodes,
  edges: initialEdges,
  rootId,
  height = 550,
  onNodeClick,
  interactive = true,
}) => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 550 });
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 550,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initialize and run simple force simulation
  useEffect(() => {
    if (!initialNodes || initialNodes.length === 0) {
      setSimNodes([]);
      return;
    }

    const width = dimensions.width;
    const heightVal = typeof height === 'number' ? height : 550;
    const centerX = width / 2;
    const centerY = heightVal / 2;

    // Distribute nodes in a circle initially
    const nodeCount = initialNodes.length;
    const nodes: SimNode[] = initialNodes.map((n, i) => {
      const angle = (i / Math.max(1, nodeCount)) * 2 * Math.PI;
      const radius = n.is_root || n.id === rootId ? 0 : 120 + (i % 3) * 60;
      return {
        ...n,
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
      };
    });

    // Run simple force relaxation iterations
    const nodeMap = new Map<string, SimNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const iterations = 100;
    const kRepel = 2200;
    const kAttract = 0.05;
    const centerStrength = 0.03;

    for (let it = 0; it < iterations; it++) {
      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const distSq = dx * dx + dy * dy + 100;
          const dist = Math.sqrt(distSq);
          const force = kRepel / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      // Attraction along edges
      for (const edge of initialEdges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 90) * kAttract;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      }

      // Center pull
      for (const node of nodes) {
        if (node.is_root || node.id === rootId) {
          node.vx += (centerX - node.x) * 0.15;
          node.vy += (centerY - node.y) * 0.15;
        } else {
          node.vx += (centerX - node.x) * centerStrength;
          node.vy += (centerY - node.y) * centerStrength;
        }

        // Apply velocities with damping
        node.x += node.vx * 0.4;
        node.y += node.vy * 0.4;
        node.vx *= 0.6;
        node.vy *= 0.6;
      }
    }

    setSimNodes(nodes);
  }, [initialNodes, initialEdges, dimensions.width, height, rootId]);

  // Node lookup map
  const simNodeMap = useMemo(() => {
    const map = new Map<string, SimNode>();
    simNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [simNodes]);

  // Filtering
  const filteredNodes = useMemo(() => {
    if (filterType === 'all') return simNodes;
    if (filterType === 'entity') return simNodes.filter((n) => n.category === 'entity');
    if (filterType === 'document') return simNodes.filter((n) => n.category === 'document');
    return simNodes.filter((n) => n.type?.toLowerCase() === filterType.toLowerCase());
  }, [simNodes, filterType]);

  const activeNodeIds = useMemo(() => {
    return new Set(filteredNodes.map((n) => n.id));
  }, [filteredNodes]);

  const visibleEdges = useMemo(() => {
    return initialEdges.filter((e) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));
  }, [initialEdges, activeNodeIds]);

  // Dragging & Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (draggedNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;

      setSimNodes((prev) =>
        prev.map((n) => (n.id === draggedNodeId ? { ...n, x: mouseX, y: mouseY } : n))
      );
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: SimNode) => {
    e.stopPropagation();
    setDraggedNodeId(node.id);
  };

  const handleNodeClick = (node: SimNode) => {
    if (onNodeClick) {
      onNodeClick(node);
      return;
    }
    if (node.category === 'entity' && node.entity_id) {
      router.push(`/entity/${node.entity_id}`);
    } else if (node.category === 'document' && node.document_id) {
      router.push(`/document/${node.document_id}`);
    }
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full border border-slate-200 rounded-xl bg-slate-950 overflow-hidden select-none shadow-sm"
      style={{ height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controls & Filter Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1 backdrop-blur-md shadow-md text-xs">
          {['all', 'entity', 'document', 'person', 'topic'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded capitalize font-medium transition ${
                filterType === t
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Zoom / Reset Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1 backdrop-blur-md shadow-md text-slate-300">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
          className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
          className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(51, 65, 85, 0.4) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {visibleEdges.map((edge, idx) => {
            const src = simNodeMap.get(edge.source);
            const tgt = simNodeMap.get(edge.target);
            if (!src || !tgt) return null;

            const midX = (src.x + tgt.x) / 2;
            const midY = (src.y + tgt.y) / 2;

            return (
              <g key={`edge-${edge.source}-${edge.target}-${idx}`} className="transition-opacity">
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="#334155"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                />
                {edge.label && (
                  <text
                    x={midX}
                    y={midY - 4}
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="middle"
                    className="font-medium pointer-events-none select-none"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {filteredNodes.map((node) => {
            const color = getNodeColor(node);
            const radius = node.is_root ? 24 : node.size ? Math.min(26, Math.max(14, node.size)) : 16;
            const isHovered = hoveredNode?.id === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer transition-transform"
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Root Glow */}
                {node.is_root && (
                  <circle
                    r={radius + 8}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2"
                    strokeOpacity="0.5"
                    className="animate-pulse"
                  />
                )}

                {/* Node Circle */}
                <circle
                  r={radius}
                  fill={color.bg}
                  stroke={isHovered ? '#ffffff' : color.border}
                  strokeWidth={isHovered ? 3 : 2}
                  className="shadow-lg transition duration-200"
                />

                {/* Category Icon */}
                <g transform="translate(-6, -6)" pointerEvents="none" fill="#ffffff">
                  {node.type === 'person' && <User className="w-3 h-3 text-white" />}
                  {node.type === 'topic' && <Tag className="w-3 h-3 text-white" />}
                  {node.type === 'org' && <Building2 className="w-3 h-3 text-white" />}
                  {node.category === 'document' && <FileText className="w-3 h-3 text-white" />}
                </g>

                {/* Node Label */}
                <text
                  y={radius + 14}
                  fill={isHovered ? '#ffffff' : '#cbd5e1'}
                  fontSize="11"
                  fontWeight={node.is_root ? '600' : '400'}
                  textAnchor="middle"
                  className="pointer-events-none select-none transition-colors"
                >
                  {node.label.length > 20 ? `${node.label.slice(0, 18)}…` : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover Info Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 z-20 max-w-sm bg-slate-900/95 border border-slate-700 p-3.5 rounded-xl shadow-xl backdrop-blur-md text-xs text-slate-200 pointer-events-none">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span
              className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider"
              style={{
                backgroundColor: `${getNodeColor(hoveredNode).bg}33`,
                color: getNodeColor(hoveredNode).bg,
                border: `1px solid ${getNodeColor(hoveredNode).border}`,
              }}
            >
              {hoveredNode.category}: {hoveredNode.type || 'entity'}
            </span>
            {hoveredNode.external_id && (
              <span className="text-[10px] text-slate-400 font-mono">
                {hoveredNode.external_id}
              </span>
            )}
          </div>
          <p className="font-semibold text-white text-sm leading-snug">{hoveredNode.label}</p>
          {hoveredNode.description && (
            <p className="mt-1 text-slate-300 text-[11px] line-clamp-2 leading-relaxed">
              {hoveredNode.description}
            </p>
          )}
          <p className="mt-2 text-[10px] text-indigo-400 font-medium">Click node to inspect details →</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 hidden sm:flex items-center gap-3 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Person</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span>Topic</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Org</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Document</span>
        </div>
      </div>
    </div>
  );
};
