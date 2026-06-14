// @ts-nocheck
'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from '@/lib/framer-motion-shim';
import { ZoomIn, ZoomOut, Maximize2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ScriptData } from '@/types';

// ─── Language Color Map ───────────────────────────────────────────
const LANGUAGE_COLORS: Record<string, string> = {
  python: '#3572A5',
  chimerax: '#E84393',
  pymol: '#8E44AD',
  javascript: '#F7DF1E',
  typescript: '#3178C6',
  shell: '#89E051',
  r: '#198CE7',
  ruby: '#701516',
  perl: '#0298C3',
  java: '#B07219',
  go: '#00ADD8',
};

const DEFAULT_COLOR = '#6b7280';

// ─── Edge Types ────────────────────────────────────────────────────
type EdgeType = 'language' | 'category' | 'dependency';

interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
}

interface GraphNode {
  id: string;
  name: string;
  language: string;
  category: string;
  executions: number;
  dependencies: string[];
  x: number;
  y: number;
  radius: number;
}

// ─── Force-Directed Layout Calculation ─────────────────────────────
function computeForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  iterations = 120
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  // Initialize positions in a circle
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.35;

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    positions.set(node.id, {
      x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
      y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
    });
  });

  // Build adjacency for faster lookups
  const edgeMap = new Map<string, Set<string>>();
  edges.forEach(e => {
    if (!edgeMap.has(e.source)) edgeMap.set(e.source, new Set());
    if (!edgeMap.has(e.target)) edgeMap.set(e.target, new Set());
    edgeMap.get(e.source)!.add(e.target);
    edgeMap.get(e.target)!.add(e.source);
  });

  // Simple force simulation
  const repulsion = 800;
  const attraction = 0.005;
  const damping = 0.9;
  const velocities = new Map<string, { vx: number; vy: number }>();
  nodes.forEach(n => velocities.set(n.id, { vx: 0, vy: 0 }));

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations; // cooling factor

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const pa = positions.get(a.id)!;
        const pb = positions.get(b.id)!;
        let dx = pa.x - pb.x;
        let dy = pa.y - pb.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (repulsion * alpha) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const va = velocities.get(a.id)!;
        const vb = velocities.get(b.id)!;
        va.vx += fx;
        va.vy += fy;
        vb.vx -= fx;
        vb.vy -= fy;
      }
    }

    // Attraction along edges
    edges.forEach(edge => {
      const pa = positions.get(edge.source);
      const pb = positions.get(edge.target);
      if (!pa || !pb) return;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attraction * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const va = velocities.get(edge.source);
      const vb = velocities.get(edge.target);
      if (va) { va.vx += fx; va.vy += fy; }
      if (vb) { vb.vx -= fx; vb.vy -= fy; }
    });

    // Center gravity
    nodes.forEach(n => {
      const p = positions.get(n.id)!;
      const v = velocities.get(n.id)!;
      v.vx += (cx - p.x) * 0.001 * alpha;
      v.vy += (cy - p.y) * 0.001 * alpha;
    });

    // Apply velocities
    nodes.forEach(n => {
      const p = positions.get(n.id)!;
      const v = velocities.get(n.id)!;
      v.vx *= damping;
      v.vy *= damping;
      // Clamp velocity
      const maxV = 10;
      v.vx = Math.max(-maxV, Math.min(maxV, v.vx));
      v.vy = Math.max(-maxV, Math.min(maxV, v.vy));
      p.x += v.vx;
      p.y += v.vy;
      // Keep in bounds
      const margin = 40;
      p.x = Math.max(margin, Math.min(width - margin, p.x));
      p.y = Math.max(margin, Math.min(height - margin, p.y));
    });
  }

  return positions;
}

// ─── Extract Dependencies from Script Content ─────────────────────
function extractDependencies(content: string): string[] {
  if (!content) return [];
  const deps = new Set<string>();
  // Match import X / from X import Y / import X as Y
  const importRegex = /^(?:from\s+([a-zA-Z_][\w.]*)\s+import|import\s+([a-zA-Z_][\w.]*))/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const dep = match[1] || match[2];
    if (dep) {
      // Get top-level module
      const topLevel = dep.split('.')[0];
      deps.add(topLevel);
    }
  }
  return Array.from(deps);
}

// ─── Main Component ───────────────────────────────────────────────

interface ScriptGraphProps {
  scripts: ScriptData[];
  onSelectScript?: (script: ScriptData) => void;
}

export function ScriptGraph({ scripts, onSelectScript }: ScriptGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [filterTypes, setFilterTypes] = useState<Record<EdgeType, boolean>>({
    language: true,
    category: true,
    dependency: true,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Observe container size (debounced with requestAnimationFrame)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId: number;
    const observer = new ResizeObserver(entries => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const entry = entries[0];
        if (entry) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Build graph data
  const { nodes, edges, positions } = useMemo(() => {
    if (scripts.length === 0) {
      return { nodes: [], edges: [], positions: new Map() };
    }

    const maxExec = Math.max(...scripts.map(s => s._count?.executions || 0), 1);

    // Build nodes
    const graphNodes: GraphNode[] = scripts.map(s => ({
      id: s.id,
      name: s.name,
      language: s.language,
      category: s.category || 'Uncategorized',
      executions: s._count?.executions || 0,
      dependencies: extractDependencies(s.content || ''),
      x: 0,
      y: 0,
      radius: 8 + ((s._count?.executions || 0) / maxExec) * 18,
    }));

    // Pre-compute dependency map once (O(n) instead of O(n^2) calls)
    const depsMap = new Map<string, string[]>();
    scripts.forEach(s => {
      depsMap.set(s.id, extractDependencies(s.content || ''));
    });

    // Build edges
    const edgeSet = new Set<string>();
    const graphEdges: GraphEdge[] = [];

    for (let i = 0; i < scripts.length; i++) {
      for (let j = i + 1; j < scripts.length; j++) {
        const a = scripts[i];
        const b = scripts[j];

        // Shared language
        if (a.language === b.language) {
          const key = `lang:${a.id}:${b.id}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            graphEdges.push({ source: a.id, target: b.id, type: 'language' });
          }
        }

        // Shared category
        if ((a.category || 'Uncategorized') === (b.category || 'Uncategorized')) {
          const key = `cat:${a.id}:${b.id}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            graphEdges.push({ source: a.id, target: b.id, type: 'category' });
          }
        }

        // Shared dependencies (lookup from pre-computed map)
        const depsA = depsMap.get(a.id) || [];
        const depsB = depsMap.get(b.id) || [];
        const shared = depsA.filter(d => depsB.includes(d));
        if (shared.length > 0) {
          const key = `dep:${a.id}:${b.id}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            graphEdges.push({ source: a.id, target: b.id, type: 'dependency' });
          }
        }
      }
    }

    const layout = computeForceLayout(graphNodes, graphEdges, dimensions.width, dimensions.height);

    return { nodes: graphNodes, edges: graphEdges, positions: layout };
  }, [scripts, dimensions]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    return edges.filter(e => filterTypes[e.type]);
  }, [edges, filterTypes]);

  // Connected nodes for hovered node
  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const connected = new Set<string>();
    connected.add(hoveredNode);
    filteredEdges.forEach(e => {
      if (e.source === hoveredNode) connected.add(e.target);
      if (e.target === hoveredNode) connected.add(e.source);
    });
    return connected;
  }, [hoveredNode, filteredEdges]);

  // Zoom controls
  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z * 1.3, 4)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z / 1.3, 0.3)), []);
  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Wheel zoom - uses native event listener with passive:false to allow preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.max(0.3, Math.min(4, z * delta)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Edge style by type
  const getEdgeStyle = (type: EdgeType, isHighlighted: boolean) => {
    const base = isHighlighted ? 1 : 0.15;
    switch (type) {
      case 'language':
        return { stroke: `rgba(156, 163, 175, ${isHighlighted ? 0.6 : 0.08})`, strokeWidth: isHighlighted ? 1.5 : 0.5 };
      case 'category':
        return { stroke: `rgba(245, 158, 11, ${isHighlighted ? 0.7 : 0.1})`, strokeWidth: isHighlighted ? 2 : 0.7 };
      case 'dependency':
        return { stroke: `rgba(16, 185, 129, ${isHighlighted ? 0.8 : 0.1})`, strokeWidth: isHighlighted ? 3 : 1 };
    }
  };

  // Tooltip data
  const hoveredScript = useMemo(() => {
    if (!hoveredNode) return null;
    return scripts.find(s => s.id === hoveredNode) || null;
  }, [hoveredNode, scripts]);

  // Node position map for tooltip
  const hoveredNodePos = useMemo(() => {
    if (!hoveredNode) return null;
    const pos = positions.get(hoveredNode);
    if (!pos) return null;
    return { x: pos.x * zoom + pan.x, y: pos.y * zoom + pan.y };
  }, [hoveredNode, positions, zoom, pan]);

  if (scripts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
        <p>No scripts to visualize</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gray-950 rounded-xl overflow-hidden border border-gray-800/50">
      {/* SVG Graph */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="graph-svg"
        >
          <defs>
            {/* Glow filter for highlighted nodes */}
            <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Animated dash for dependency edges */}
            <pattern id="dep-dash" patternUnits="userSpaceOnUse" width="8" height="1">
              <line x1="0" y1="0" x2="4" y2="0" stroke="#10b981" strokeWidth="1" />
            </pattern>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {filteredEdges.map((edge, i) => {
              const sourcePos = positions.get(edge.source);
              const targetPos = positions.get(edge.target);
              if (!sourcePos || !targetPos) return null;

              const isHighlighted = hoveredNode
                ? (edge.source === hoveredNode || edge.target === hoveredNode)
                : true;

              const style = getEdgeStyle(edge.type, isHighlighted);

              return (
                <motion.path
                  key={`edge-${i}`}
                  d={`M${sourcePos.x},${sourcePos.y} L${targetPos.x},${targetPos.y}`}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={edge.type === 'dependency' ? '6 3' : undefined}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: i * 0.005 }}
                  className="graph-edge"
                  fill="none"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node, i) => {
              const pos = positions.get(node.id);
              if (!pos) return null;

              const isHovered = hoveredNode === node.id;
              const isConnected = hoveredNode ? connectedNodes.has(node.id) : true;
              const nodeOpacity = hoveredNode ? (isConnected ? 1 : 0.2) : 1;
              const color = LANGUAGE_COLORS[node.language] || DEFAULT_COLOR;

              return (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: nodeOpacity, scale: isHovered ? 1.3 : 1 }}
                  transition={{
                    opacity: { duration: 0.3 },
                    scale: { type: 'spring', stiffness: 300, damping: 20 },
                    delay: i * 0.02,
                  }}
                  style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => {
                    setSelectedNode(selectedNode === node.id ? null : node.id);
                    if (onSelectScript) onSelectScript(scripts.find(s => s.id === node.id)!);
                  }}
                  className="graph-node"
                >
                  {/* Outer glow ring for hovered */}
                  {isHovered && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={node.radius + 6}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      opacity="0.3"
                      className="graph-node-ring"
                    />
                  )}
                  {/* Main circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={node.radius}
                    fill={color}
                    fillOpacity={0.85}
                    stroke={isHovered ? '#fff' : color}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    filter={isHovered ? 'url(#node-glow)' : undefined}
                    className="graph-node-circle"
                  />
                  {/* Language initial */}
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={node.radius > 14 ? 9 : 7}
                    fontWeight="bold"
                    className="pointer-events-none select-none"
                  >
                    {node.language.slice(0, 2).toUpperCase()}
                  </text>
                </motion.g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredScript && hoveredNodePos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute pointer-events-none z-30 graph-tooltip"
            style={{
              left: Math.min(hoveredNodePos.x + 16, dimensions.width - 200),
              top: Math.min(hoveredNodePos.y - 16, dimensions.height - 80),
            }}
          >
            <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-lg px-3 py-2 shadow-xl shadow-black/30">
              <p className="text-xs font-semibold text-white truncate max-w-[180px]">{hoveredScript.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: LANGUAGE_COLORS[hoveredScript.language] || DEFAULT_COLOR }}
                />
                <span className="text-[10px] text-gray-400">{hoveredScript.language}</span>
                <span className="text-[10px] text-gray-600">·</span>
                <span className="text-[10px] text-gray-400">{hoveredScript.category}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">{hoveredScript._count?.executions || 0} executions</p>
              <p className="text-[9px] text-emerald-400/60 mt-0.5 italic">Click to view details</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-gray-900/90 backdrop-blur-md border border-gray-700/50 rounded-lg px-3 py-2 z-20">
        <p className="text-[10px] font-medium text-gray-400 mb-1.5">Relationships</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-gray-400/60" />
            <span className="text-[10px] text-gray-400">Same language</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.7 bg-amber-500/70" />
            <span className="text-[10px] text-gray-400">Same category</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-emerald-500/80" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #10b981 0, #10b981 4px, transparent 4px, transparent 7px)' }} />
            <span className="text-[10px] text-gray-400">Shared dependency</span>
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-20">
        <Button
          variant="ghost"
          size="icon-sm"
          className="bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-700/50 backdrop-blur-md"
          onClick={handleZoomIn}
          aria-label="Zoom in"
        >
          <ZoomIn className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-700/50 backdrop-blur-md"
          onClick={handleZoomOut}
          aria-label="Zoom out"
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-700/50 backdrop-blur-md"
          onClick={handleReset}
          aria-label="Reset view"
        >
          <Maximize2 className="size-3.5" />
        </Button>
      </div>

      {/* Filter Button */}
      <div className="absolute top-3 left-3 z-20">
        <Button
          variant="ghost"
          size="sm"
          className={`bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-700/50 backdrop-blur-md gap-1.5 ${filterOpen ? 'ring-1 ring-emerald-500/50' : ''}`}
          onClick={() => setFilterOpen(!filterOpen)}
          aria-label="Filter relationships"
        >
          <Filter className="size-3.5" />
          <span className="text-[10px]">Filter</span>
        </Button>

        <AnimatePresence>
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-1 left-0 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-lg p-2 min-w-[160px]"
            >
              <p className="text-[10px] font-medium text-gray-400 mb-1.5">Show relationships</p>
              {([
                { key: 'language' as EdgeType, label: 'Same language', color: 'bg-gray-400' },
                { key: 'category' as EdgeType, label: 'Same category', color: 'bg-amber-500' },
                { key: 'dependency' as EdgeType, label: 'Shared dependency', color: 'bg-emerald-500' },
              ]).map(item => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-800/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filterTypes[item.key]}
                    onChange={e => setFilterTypes(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="sr-only"
                  />
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                      filterTypes[item.key]
                        ? `${item.color} border-transparent`
                        : 'border-gray-600 bg-transparent'
                    }`}
                  >
                    {filterTypes[item.key] && (
                      <svg className="w-2 h-2 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-300">{item.label}</span>
                </label>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats Badge */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
        <Badge variant="outline" className="bg-gray-900/80 border-gray-700/50 text-gray-400 text-[10px] backdrop-blur-md">
          {nodes.length} nodes
        </Badge>
        <Badge variant="outline" className="bg-gray-900/80 border-gray-700/50 text-gray-400 text-[10px] backdrop-blur-md">
          {filteredEdges.length} edges
        </Badge>
        <Badge variant="outline" className="bg-gray-900/80 border-gray-700/50 text-gray-400 text-[10px] backdrop-blur-md">
          {Math.round(zoom * 100)}%
        </Badge>
      </div>

      {/* Minimap */}
      {nodes.length > 0 && positions.size > 0 && (
        <div className="graph-minimap absolute bottom-12 right-3 z-20 rounded-lg overflow-hidden border border-gray-700/40 bg-gray-900/70 backdrop-blur-sm" style={{ width: 120, height: 80 }}>
          <svg width={120} height={80} viewBox="0 0 120 80">
            {(() => {
              const xs = Array.from(positions.values()).map(p => p.x);
              const ys = Array.from(positions.values()).map(p => p.y);
              const minX = Math.min(...xs, 0);
              const maxX = Math.max(...xs, 1);
              const minY = Math.min(...ys, 0);
              const maxY = Math.max(...ys, 1);
              const rangeX = maxX - minX || 1;
              const rangeY = maxY - minY || 1;
              const scale = Math.min(110 / rangeX, 70 / rangeY);
              const toMini = (x: number, y: number) => ({
                mx: 5 + (x - minX) * scale,
                my: 5 + (y - minY) * scale
              });
              return (
                <>
                  {filteredEdges.map((edge, i) => {
                    const sp = positions.get(edge.source);
                    const tp = positions.get(edge.target);
                    if (!sp || !tp) return null;
                    const s = toMini(sp.x, sp.y);
                    const t = toMini(tp.x, tp.y);
                    return <line key={`me-${i}`} x1={s.mx} y1={s.my} x2={t.mx} y2={t.my} stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />;
                  })}
                  {nodes.map(node => {
                    const pos = positions.get(node.id);
                    if (!pos) return null;
                    const m = toMini(pos.x, pos.y);
                    const col = LANGUAGE_COLORS[node.language?.toLowerCase()] || DEFAULT_COLOR;
                    return <circle key={`mn-${node.id}`} cx={m.mx} cy={m.my} r={1.5} fill={col} opacity={0.7} />;
                  })}
                  {/* Viewport indicator */}
                  <rect
                    x={5 + (-pan.x / zoom - minX) * scale}
                    y={5 + (-pan.y / zoom - minY) * scale}
                    width={(dimensions.width / zoom) * scale}
                    height={(dimensions.height / zoom) * scale}
                    fill="none"
                    stroke="rgba(16,185,129,0.5)"
                    strokeWidth={1}
                    rx={2}
                  />
                </>
              );
            })()}
          </svg>
        </div>
      )}
    </div>
  );
}
