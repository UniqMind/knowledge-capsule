import React, { useState, useEffect, useRef } from 'react';
import { Network, Plus, ZoomIn, ZoomOut, RotateCcw, Link, Trash2, X, Filter } from 'lucide-react';
import { KnowledgeCapsuleItem, KnowledgeGraphConnection } from '../utils/storage';

interface Node {
  id: string;
  label: string;
  pdfId: string;
  pdfName: string;
  status: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
}

interface KnowledgeGraphProps {
  capsules: KnowledgeCapsuleItem[];
  connections: KnowledgeGraphConnection[];
  pdfNames: Record<string, string>;
  onNavigateToCapsule: (capsuleId: string, pdfId: string) => void;
  onAddConnection: (sourceId: string, targetId: string, type: string) => void;
  onDeleteConnection: (connectionId: string) => void;
  activePdfId?: string | null;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  capsules,
  connections,
  pdfNames,
  onNavigateToCapsule,
  onAddConnection,
  onDeleteConnection,
  activePdfId = null
}) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Link Mode State
  const [linkMode, setLinkMode] = useState<boolean>(false);
  const [linkSource, setLinkSource] = useState<Node | null>(null);
  const [linkType, setLinkType] = useState<string>('relates-to');

  // Filter state
  const [pdfFilter, setPdfFilter] = useState<string>(activePdfId || 'all');

  const svgRef = useRef<SVGSVGElement>(null);
  const isDraggingCanvasRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggingNodeRef = useRef<Node | null>(null);

  // Initialize nodes and edges
  useEffect(() => {
    // Filter capsules based on selection
    const filteredCapsules = pdfFilter === 'all' 
      ? capsules 
      : capsules.filter(c => c.pdfId === pdfFilter);

    const filteredConnections = pdfFilter === 'all'
      ? connections
      : connections.filter(conn => {
          const src = capsules.find(c => c.id === conn.sourceId);
          const tgt = capsules.find(c => c.id === conn.targetId);
          return src && tgt && src.pdfId === pdfFilter && tgt.pdfId === pdfFilter;
        });

    // Seed coordinates in a circle to start
    const width = 600;
    const height = 400;
    
    const seededNodes: Node[] = filteredCapsules.map((c, i) => {
      const angle = (i / filteredCapsules.length) * 2 * Math.PI;
      const radius = 100 + Math.random() * 30;
      
      // Keep coordinates if node was already present to prevent twitching
      const existing = nodes.find(n => n.id === c.id);
      
      return {
        id: c.id,
        label: c.label || `Capsule ${c.number}`,
        pdfId: c.pdfId,
        pdfName: pdfNames[c.pdfId] || 'Unknown Document',
        status: c.progressStatus,
        color: c.colorCategory,
        x: existing ? existing.x : width / 2 + Math.cos(angle) * radius,
        y: existing ? existing.y : height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null
      };
    });

    const mappedEdges: Edge[] = filteredConnections.map(conn => ({
      id: conn.id,
      source: conn.sourceId,
      target: conn.targetId,
      type: conn.type
    }));

    setNodes(seededNodes);
    setEdges(mappedEdges);
  }, [capsules, connections, pdfFilter]);

  // Physics Simulation Loop
  useEffect(() => {
    if (nodes.length === 0) return;

    let animFrame: number;
    const width = 600;
    const height = 400;
    const center = { x: width / 2, y: height / 2 };

    const updatePhysics = () => {
      setNodes(prevNodes => {
        const nextNodes = prevNodes.map(n => ({ ...n }));
        
        // 1. Charge repulsion force (between all pairs)
        for (let i = 0; i < nextNodes.length; i++) {
          const u = nextNodes[i];
          for (let j = i + 1; j < nextNodes.length; j++) {
            const v = nextNodes[j];
            
            const dx = v.x - u.x;
            const dy = v.y - u.y;
            const distSq = dx * dx + dy * dy + 0.1; // avoid division by zero
            const dist = Math.sqrt(distSq);
            
            if (dist < 280) {
              const force = 3.5 / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              
              if (u.fx === null) { u.vx -= fx; u.vy -= fy; }
              if (v.fx === null) { v.vx += fx; v.vy += fy; }
            }
          }
        }

        // 2. Link tension force (along edges)
        edges.forEach(edge => {
          const sourceNode = nextNodes.find(n => n.id === edge.source);
          const targetNode = nextNodes.find(n => n.id === edge.target);
          
          if (sourceNode && targetNode) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
            const desiredLen = 140;
            const force = (dist - desiredLen) * 0.005; // spring stiffness
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (sourceNode.fx === null) { sourceNode.vx += fx; sourceNode.vy += fy; }
            if (targetNode.fx === null) { targetNode.vx -= fx; targetNode.vy -= fy; }
          }
        });

        // 3. Gravity force toward center & position update
        nextNodes.forEach(node => {
          if (node.fx !== null && node.fy !== null) {
            node.x = node.fx;
            node.y = node.fy;
            node.vx = 0;
            node.vy = 0;
          } else {
            // Pull toward center slightly
            const dx = center.x - node.x;
            const dy = center.y - node.y;
            node.vx += dx * 0.001;
            node.vy += dy * 0.001;

            // Apply friction & update
            node.x += node.vx;
            node.y += node.vy;
            node.vx *= 0.82;
            node.vy *= 0.82;

            // Boundary collision
            node.x = Math.max(20, Math.min(width - 20, node.x));
            node.y = Math.max(20, Math.min(height - 20, node.y));
          }
        });

        return nextNodes;
      });

      animFrame = requestAnimationFrame(updatePhysics);
    };

    animFrame = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animFrame);
  }, [edges]);

  // Dragging Canvas handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof SVGElement && e.target.tagName === 'svg') {
      isDraggingCanvasRef.current = true;
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = svgRef.current;
    if (!container) return;

    if (isDraggingCanvasRef.current) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
      return;
    }

    if (draggingNodeRef.current) {
      const rect = container.getBoundingClientRect();
      // Translate mouse coordinates into zoomed SVG space
      const svgX = (e.clientX - rect.left - pan.x) / zoom;
      const svgY = (e.clientY - rect.top - pan.y) / zoom;
      
      draggingNodeRef.current.fx = svgX;
      draggingNodeRef.current.fy = svgY;
      
      // Update in node list immediately
      setNodes(prev => prev.map(n => n.id === draggingNodeRef.current!.id ? {
        ...n,
        fx: svgX,
        fy: svgY,
        x: svgX,
        y: svgY
      } : n));
    }
  };

  const handleMouseUp = () => {
    isDraggingCanvasRef.current = false;
    if (draggingNodeRef.current) {
      draggingNodeRef.current.fx = null;
      draggingNodeRef.current.fy = null;
      const nodeId = draggingNodeRef.current.id;
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, fx: null, fy: null } : n));
      draggingNodeRef.current = null;
    }
  };

  const handleNodeDragStart = (e: React.MouseEvent, node: Node) => {
    e.stopPropagation();
    draggingNodeRef.current = node;
  };

  const handleNodeClick = (e: React.MouseEvent, node: Node) => {
    e.stopPropagation();
    if (linkMode) {
      if (!linkSource) {
        setLinkSource(node);
      } else if (linkSource.id === node.id) {
        setLinkSource(null); // Cancel select
      } else {
        // Create link!
        onAddConnection(linkSource.id, node.id, linkType);
        setLinkMode(false);
        setLinkSource(null);
      }
    } else {
      setSelectedNode(node);
    }
  };

  const handleNodeDoubleClick = (node: Node) => {
    onNavigateToCapsule(node.id, node.pdfId);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not-started': return '#94a3b8';
      case 'learning': return '#f59e0b';
      case 'partial': return '#f97316';
      case 'understood': return '#3b82f6';
      case 'mastered': return '#10b981';
      default: return '#cbd5e1';
    }
  };

  const getNodeColor = (colorCat: string) => {
    switch (colorCat) {
      case 'yellow': return 'fill-yellow-400 stroke-yellow-500';
      case 'blue': return 'fill-blue-400 stroke-blue-500';
      case 'green': return 'fill-green-400 stroke-green-500';
      case 'purple': return 'fill-purple-400 stroke-purple-500';
      case 'red': return 'fill-rose-400 stroke-rose-500';
      case 'orange': return 'fill-orange-400 stroke-orange-500';
      default: return 'fill-slate-400 stroke-slate-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0c0d12]/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden relative shadow-inner">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur z-10 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
          <Network className="h-4 w-4 text-indigo-500" />
          <span>Knowledge Graph Connection Workspace</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <div className="flex items-center gap-1.5 mr-2">
            <Filter className="h-3 w-3 text-slate-400" />
            <select
              value={pdfFilter}
              onChange={(e) => setPdfFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg px-2 py-1 text-[11px] focus:outline-none"
            >
              <option value="all">All Documents</option>
              {Object.entries(pdfNames).map(([id, name]) => (
                <option key={id} value={id}>{name.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
            title="Reset view"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main SVG Graph */}
      <div className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-[#0c0d12]">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-transparent z-10">
            <Network className="h-10 w-10 text-slate-350 dark:text-slate-700 animate-pulse mb-3" />
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">No capsules on this document</h3>
            <p className="text-xs text-slate-450 mt-1 max-w-[280px]">
              Highlight some sentences first in the PDF reader to populate notes in this workspace.
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Zoom/Pan Group Container */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges Drawing */}
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="20"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" className="fill-slate-300 dark:fill-slate-800" />
                </marker>
              </defs>

              {edges.map((edge) => {
                const src = nodes.find(n => n.id === edge.source);
                const tgt = nodes.find(n => n.id === edge.target);
                if (!src || !tgt) return null;

                const dx = tgt.x - src.x;
                const dy = tgt.y - src.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const mx = src.x + dx / 2;
                const my = src.y + dy / 2;

                return (
                  <g key={edge.id} className="group/edge">
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      className="stroke-slate-300 dark:stroke-slate-800 stroke-[1.5px] group-hover/edge:stroke-indigo-400 transition"
                      markerEnd="url(#arrow)"
                    />
                    
                    {/* Relationship label */}
                    <rect
                      x={mx - 25}
                      y={my - 7}
                      width={50}
                      height={14}
                      rx={3}
                      className="fill-white dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-800 stroke-[0.5px]"
                    />
                    <text
                      x={mx}
                      y={my + 3}
                      textAnchor="middle"
                      className="text-[8px] font-bold fill-slate-400 dark:fill-slate-500 uppercase tracking-wider"
                    >
                      {edge.type}
                    </text>
                  </g>
                );
              })}

              {/* Nodes Drawing */}
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isLinkSelected = linkSource?.id === node.id;
                const borderStatusColor = getStatusColor(node.status);
                
                return (
                  <g
                    key={node.id}
                    className="cursor-pointer group/node"
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseDown={(e) => handleNodeDragStart(e, node)}
                    onClick={(e) => handleNodeClick(e, node)}
                    onDoubleClick={() => handleNodeDoubleClick(node)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Halo focus effect */}
                    <circle
                      r={18}
                      className={`fill-transparent transition duration-300 ${
                        isSelected 
                          ? 'stroke-indigo-500/30 dark:stroke-indigo-400/30 stroke-8 animate-pulse' 
                          : 'stroke-transparent group-hover/node:stroke-slate-200/50 dark:group-hover/node:stroke-slate-800/40 stroke-4'
                      }`}
                    />

                    {/* Node status ring */}
                    <circle
                      r={14}
                      fill="none"
                      stroke={borderStatusColor}
                      strokeWidth={2}
                    />

                    {/* Node base bubble */}
                    <circle
                      r={11}
                      className={`${getNodeColor(node.color)} ${
                        isLinkSelected ? 'animate-bounce stroke-indigo-500' : ''
                      }`}
                    />

                    {/* First letter label */}
                    <text
                      textAnchor="middle"
                      y={3}
                      className="text-[9px] font-black fill-white select-none pointer-events-none"
                    >
                      {node.label.substring(0, 2).toUpperCase()}
                    </text>

                    {/* Node Label Text under circle */}
                    <text
                      y={25}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-slate-700 dark:fill-slate-350 select-none pointer-events-none"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Floating Quick Action Overlay */}
        <div className="absolute bottom-3 left-3 flex gap-2 z-10">
          <button
            onClick={() => {
              setLinkMode(!linkMode);
              setLinkSource(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm transition cursor-pointer ${
              linkMode 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            <Link className="h-3.5 w-3.5" />
            {linkMode ? 'Select Target Node...' : 'Connect Capsules'}
          </button>

          {linkMode && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-md flex items-center gap-2 text-[10px]">
              <span className="font-semibold text-slate-400 uppercase">Relation:</span>
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-750 rounded px-1.5 py-0.5"
              >
                <option value="triggers">Triggers</option>
                <option value="causes">Causes</option>
                <option value="blocks">Blocks</option>
                <option value="worsens">Worsens</option>
                <option value="reduces">Reduces</option>
                <option value="relates-to">Relates To</option>
              </select>
              
              <button 
                onClick={() => { setLinkMode(false); setLinkSource(null); }}
                className="text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Hover label tooltip */}
        {hoveredNode && (
          <div className="absolute top-3 left-3 bg-slate-900/90 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow pointer-events-none z-10 max-w-[200px]">
            <p className="font-bold">{hoveredNode.label}</p>
            <p className="text-[9px] text-slate-350 mt-0.5 truncate">{hoveredNode.pdfName.replace(/_/g, ' ')}</p>
            <p className="text-[8px] text-indigo-300 font-semibold uppercase tracking-wider mt-1">Double click to open PDF</p>
          </div>
        )}
      </div>

      {/* Selected Node Details Right Sidebar Drawer */}
      {selectedNode && (
        <div className="absolute right-0 top-0 bottom-0 w-64 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 overflow-y-auto z-20 flex flex-col justify-between animate-slide-left">
          <div>
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-2 mb-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Node Details</span>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: getStatusColor(selectedNode.status) }} />
              {selectedNode.label}
            </h3>
            
            <p className="text-[10px] text-slate-450 mt-1 uppercase font-semibold">
              Doc: {selectedNode.pdfName.replace(/_/g, ' ')}
            </p>

            {/* List links containing this node */}
            <div className="mt-5">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                Active Connections ({edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length})
              </span>
              
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                {edges
                  .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                  .map(edge => {
                    const isSrc = edge.source === selectedNode.id;
                    const connectedId = isSrc ? edge.target : edge.source;
                    const connectedNode = nodes.find(n => n.id === connectedId);
                    
                    return (
                      <div key={edge.id} className="p-2 bg-slate-50 dark:bg-slate-950/65 rounded-lg border border-slate-100 dark:border-slate-800/40 flex items-center justify-between gap-1 text-[10px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-350 truncate max-w-[120px]">
                          {isSrc ? '→ ' : '← '} {connectedNode ? connectedNode.label : 'Unknown'}
                        </span>
                        <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded uppercase font-bold">
                          {edge.type}
                        </span>
                        <button
                          onClick={() => onDeleteConnection(edge.id)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateToCapsule(selectedNode.id, selectedNode.pdfId)}
            className="w-full mt-4 flex items-center justify-center gap-1 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow cursor-pointer"
          >
            <Link className="h-3.5 w-3.5" />
            Open Highlight Location
          </button>
        </div>
      )}
    </div>
  );
};
