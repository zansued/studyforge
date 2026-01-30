import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  Plus,
  Trash2,
  Download,
  Palette,
  GripVertical,
  Check,
  Maximize2,
  Layout,
  Save,
  FolderOpen,
  GitBranch,
  Circle,
  Network,
  TreeDeciduous,
  Focus,
  Expand,
  Move
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NODE_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", 
  "#ef4444", "#06b6d4", "#f97316", "#ec4899"
];

const defaultNodes = [
  { id: "root", text: "Tema Central", x: 400, y: 300, color: "#f59e0b", isRoot: true },
];

const defaultConnections = [];

const SAVED_LAYOUTS_KEY = "mindmap_saved_layouts";

export default function InteractiveMindMap({ 
  initialNodes = null, 
  initialConnections = null,
  onSave,
  title = "Mapa Mental"
}) {
  const [nodes, setNodes] = useState(initialNodes || defaultNodes);
  const [connections, setConnections] = useState(initialConnections || defaultConnections);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [editText, setEditText] = useState("");
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [showSaveLayoutDialog, setShowSaveLayoutDialog] = useState(false);
  const [showLoadLayoutDialog, setShowLoadLayoutDialog] = useState(false);
  const [layoutName, setLayoutName] = useState("");
  const [savedLayouts, setSavedLayouts] = useState([]);
  const [isMiddleMousePanning, setIsMiddleMousePanning] = useState(false);
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Load saved layouts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_LAYOUTS_KEY);
    if (saved) {
      setSavedLayouts(JSON.parse(saved));
    }
  }, []);

  // Initialize root node with title
  useEffect(() => {
    if (!initialNodes && title) {
      setNodes([{ id: "root", text: title, x: 400, y: 300, color: "#f59e0b", isRoot: true }]);
    }
  }, [title, initialNodes]);

  // Get mouse position relative to SVG
  const getMousePos = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale
    };
  }, [offset, scale]);

  // Zoom handlers
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.3));
  const handleResetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // Center view on all nodes
  const handleCenterView = () => {
    if (nodes.length === 0) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    
    // Calculate bounds of all nodes
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y));
    
    const contentWidth = maxX - minX + 200;
    const contentHeight = maxY - minY + 150;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate scale to fit content
    const scaleX = rect.width / contentWidth;
    const scaleY = rect.height / contentHeight;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY) * 0.85, 0.3), 2);
    
    // Calculate offset to center content
    const newOffsetX = rect.width / 2 - centerX * newScale;
    const newOffsetY = rect.height / 2 - centerY * newScale;
    
    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  // Fit all nodes in view
  const handleFitToView = () => {
    if (nodes.length === 0) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    
    const minX = Math.min(...nodes.map(n => n.x)) - 100;
    const maxX = Math.max(...nodes.map(n => n.x)) + 100;
    const minY = Math.min(...nodes.map(n => n.y)) - 75;
    const maxY = Math.max(...nodes.map(n => n.y)) + 75;
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const scaleX = rect.width / contentWidth;
    const scaleY = rect.height / contentHeight;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 2);
    
    const newOffsetX = -minX * newScale + (rect.width - contentWidth * newScale) / 2;
    const newOffsetY = -minY * newScale + (rect.height - contentHeight * newScale) / 2;
    
    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  // Pan handlers
  const handleMouseDown = (e) => {
    // Middle mouse button (wheel click) for panning
    if (e.button === 1) {
      e.preventDefault();
      setIsMiddleMousePanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }
    
    // Left click on background for panning
    if (e.button === 0 && (e.target === svgRef.current || e.target.tagName === 'svg' || e.target.tagName === 'rect')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning || isMiddleMousePanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (draggingNode) {
      const pos = getMousePos(e);
      setNodes(prev => prev.map(node => 
        node.id === draggingNode 
          ? { ...node, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y }
          : node
      ));
    }
  };

  const handleMouseUp = (e) => {
    setIsPanning(false);
    setIsMiddleMousePanning(false);
    setDraggingNode(null);
  };

  // Prevent context menu on middle click
  const handleContextMenu = (e) => {
    if (isMiddleMousePanning) {
      e.preventDefault();
    }
  };

  // Wheel zoom with Ctrl, otherwise pan
  const handleWheel = (e) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl+Wheel
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.max(0.3, Math.min(3, prev + delta)));
    } else {
      // Pan with wheel (scroll)
      setOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  // Node handlers
  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
    const pos = getMousePos(e);
    setDraggingNode(node.id);
    setDragOffset({ x: pos.x - node.x, y: pos.y - node.y });
    setSelectedNode(node.id);
  };

  const handleNodeClick = (e, node) => {
    e.stopPropagation();
    if (connectingFrom && connectingFrom !== node.id) {
      // Create connection
      const exists = connections.some(
        c => (c.from === connectingFrom && c.to === node.id) ||
             (c.from === node.id && c.to === connectingFrom)
      );
      if (!exists) {
        setConnections(prev => [...prev, { 
          id: `${connectingFrom}-${node.id}`, 
          from: connectingFrom, 
          to: node.id 
        }]);
      }
      setConnectingFrom(null);
    } else {
      setSelectedNode(node.id);
    }
  };

  const handleNodeDoubleClick = (e, node) => {
    e.stopPropagation();
    setEditingNode(node.id);
    setEditText(node.text);
  };

  const handleEditSubmit = () => {
    if (editText.trim()) {
      setNodes(prev => prev.map(node => 
        node.id === editingNode ? { ...node, text: editText.trim() } : node
      ));
    }
    setEditingNode(null);
    setEditText("");
  };

  const handleEditCancel = () => {
    setEditingNode(null);
    setEditText("");
  };

  // Add node
  const addNode = (parentId = null) => {
    const parent = parentId ? nodes.find(n => n.id === parentId) : nodes.find(n => n.isRoot);
    const angle = Math.random() * Math.PI * 2;
    const distance = 150;
    const newNode = {
      id: `node-${Date.now()}`,
      text: "Novo Tópico",
      x: parent ? parent.x + Math.cos(angle) * distance : 400,
      y: parent ? parent.y + Math.sin(angle) * distance : 300,
      color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
      isRoot: false
    };
    setNodes(prev => [...prev, newNode]);
    
    if (parent) {
      setConnections(prev => [...prev, {
        id: `${parent.id}-${newNode.id}`,
        from: parent.id,
        to: newNode.id
      }]);
    }
    
    setSelectedNode(newNode.id);
    setEditingNode(newNode.id);
    setEditText(newNode.text);
  };

  // Delete node
  const deleteNode = (nodeId) => {
    if (nodes.find(n => n.id === nodeId)?.isRoot) return; // Can't delete root
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    setSelectedNode(null);
  };

  // Change node color
  const changeNodeColor = (nodeId, color) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, color } : node
    ));
  };

  // Start connecting
  const startConnecting = (nodeId) => {
    setConnectingFrom(nodeId);
  };

  // Add child node (subtopic)
  const addChildNode = (parentId) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    // Find existing children to calculate angle
    const existingConnections = connections.filter(c => c.from === parentId);
    const childCount = existingConnections.length;
    
    const baseAngle = parent.isRoot ? 0 : Math.atan2(parent.y - 300, parent.x - 400);
    const spreadAngle = Math.PI / 4;
    const angle = baseAngle + (childCount - existingConnections.length / 2) * spreadAngle;
    const distance = 120;

    const newNode = {
      id: `node-${Date.now()}`,
      text: "Subtópico",
      x: parent.x + Math.cos(angle) * distance,
      y: parent.y + Math.sin(angle) * distance,
      color: parent.color,
      isRoot: false
    };

    setNodes(prev => [...prev, newNode]);
    setConnections(prev => [...prev, {
      id: `${parentId}-${newNode.id}`,
      from: parentId,
      to: newNode.id
    }]);

    setSelectedNode(newNode.id);
    setEditingNode(newNode.id);
    setEditText(newNode.text);
  };

  // Save current layout
  const saveLayout = () => {
    if (!layoutName.trim()) return;
    
    const layout = {
      id: Date.now().toString(),
      name: layoutName.trim(),
      date: new Date().toISOString(),
      nodes: nodes.map(n => ({ ...n })),
      connections: connections.map(c => ({ ...c }))
    };

    const updatedLayouts = [...savedLayouts, layout];
    setSavedLayouts(updatedLayouts);
    localStorage.setItem(SAVED_LAYOUTS_KEY, JSON.stringify(updatedLayouts));
    setShowSaveLayoutDialog(false);
    setLayoutName("");
  };

  // Load saved layout
  const loadLayout = (layout) => {
    setNodes(layout.nodes.map(n => ({ ...n })));
    setConnections(layout.connections.map(c => ({ ...c })));
    setShowLoadLayoutDialog(false);
    setSelectedNode(null);
  };

  // Delete saved layout
  const deleteLayout = (layoutId) => {
    const updatedLayouts = savedLayouts.filter(l => l.id !== layoutId);
    setSavedLayouts(updatedLayouts);
    localStorage.setItem(SAVED_LAYOUTS_KEY, JSON.stringify(updatedLayouts));
  };

  // Auto-layout functions
  const applyRadialLayout = () => {
    const root = nodes.find(n => n.isRoot);
    if (!root) return;

    const centerX = 400;
    const centerY = 300;
    const newNodes = [...nodes];

    // Find direct children of root
    const rootConnections = connections.filter(c => c.from === root.id);
    const directChildren = rootConnections.map(c => nodes.find(n => n.id === c.to)).filter(Boolean);
    
    // Position root
    const rootIndex = newNodes.findIndex(n => n.isRoot);
    if (rootIndex !== -1) {
      newNodes[rootIndex] = { ...newNodes[rootIndex], x: centerX, y: centerY };
    }

    // Position direct children in a circle
    const radius = 180;
    directChildren.forEach((child, i) => {
      const angle = (2 * Math.PI * i / directChildren.length) - Math.PI / 2;
      const childIndex = newNodes.findIndex(n => n.id === child.id);
      if (childIndex !== -1) {
        newNodes[childIndex] = {
          ...newNodes[childIndex],
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        };

        // Position grandchildren
        const childConnections = connections.filter(c => c.from === child.id);
        const grandchildren = childConnections.map(c => nodes.find(n => n.id === c.to)).filter(Boolean);
        
        grandchildren.forEach((gc, j) => {
          const gcAngle = angle + (j - grandchildren.length / 2 + 0.5) * 0.4;
          const gcIndex = newNodes.findIndex(n => n.id === gc.id);
          if (gcIndex !== -1) {
            newNodes[gcIndex] = {
              ...newNodes[gcIndex],
              x: centerX + Math.cos(gcAngle) * (radius + 120),
              y: centerY + Math.sin(gcAngle) * (radius + 120)
            };
          }
        });
      }
    });

    setNodes(newNodes);
  };

  const applyOrgChartLayout = () => {
    const root = nodes.find(n => n.isRoot);
    if (!root) return;

    const centerX = 400;
    const startY = 80;
    const levelHeight = 120;
    const newNodes = [...nodes];

    // Position root at top
    const rootIndex = newNodes.findIndex(n => n.isRoot);
    if (rootIndex !== -1) {
      newNodes[rootIndex] = { ...newNodes[rootIndex], x: centerX, y: startY };
    }

    // Find direct children
    const rootConnections = connections.filter(c => c.from === root.id);
    const directChildren = rootConnections.map(c => nodes.find(n => n.id === c.to)).filter(Boolean);
    
    const childSpacing = Math.max(150, 700 / Math.max(directChildren.length, 1));
    const startX = centerX - (directChildren.length - 1) * childSpacing / 2;

    directChildren.forEach((child, i) => {
      const childIndex = newNodes.findIndex(n => n.id === child.id);
      if (childIndex !== -1) {
        const childX = startX + i * childSpacing;
        newNodes[childIndex] = {
          ...newNodes[childIndex],
          x: childX,
          y: startY + levelHeight
        };

        // Position grandchildren
        const childConnections = connections.filter(c => c.from === child.id);
        const grandchildren = childConnections.map(c => nodes.find(n => n.id === c.to)).filter(Boolean);
        
        const gcSpacing = Math.max(100, childSpacing / Math.max(grandchildren.length, 1));
        const gcStartX = childX - (grandchildren.length - 1) * gcSpacing / 2;

        grandchildren.forEach((gc, j) => {
          const gcIndex = newNodes.findIndex(n => n.id === gc.id);
          if (gcIndex !== -1) {
            newNodes[gcIndex] = {
              ...newNodes[gcIndex],
              x: gcStartX + j * gcSpacing,
              y: startY + levelHeight * 2
            };
          }
        });
      }
    });

    setNodes(newNodes);
  };

  const applyTreeLayout = () => {
    const root = nodes.find(n => n.isRoot);
    if (!root) return;

    const startX = 100;
    const startY = 300;
    const levelWidth = 200;
    const newNodes = [...nodes];

    // Position root on the left
    const rootIndex = newNodes.findIndex(n => n.isRoot);
    if (rootIndex !== -1) {
      newNodes[rootIndex] = { ...newNodes[rootIndex], x: startX, y: startY };
    }

    // Find direct children
    const rootConnections = connections.filter(c => c.from === root.id);
    const directChildren = rootConnections.map(c => nodes.find(n => n.id === c.to)).filter(Boolean);
    
    const childSpacing = Math.max(80, 400 / Math.max(directChildren.length, 1));
    const startChildY = startY - (directChildren.length - 1) * childSpacing / 2;

    directChildren.forEach((child, i) => {
      const childIndex = newNodes.findIndex(n => n.id === child.id);
      if (childIndex !== -1) {
        const childY = startChildY + i * childSpacing;
        newNodes[childIndex] = {
          ...newNodes[childIndex],
          x: startX + levelWidth,
          y: childY
        };

        // Position grandchildren
        const childConnections = connections.filter(c => c.from === child.id);
        const grandchildren = childConnections.map(c => nodes.find(n => n.id === c.to)).filter(Boolean);
        
        const gcSpacing = Math.max(50, childSpacing / Math.max(grandchildren.length, 1));
        const gcStartY = childY - (grandchildren.length - 1) * gcSpacing / 2;

        grandchildren.forEach((gc, j) => {
          const gcIndex = newNodes.findIndex(n => n.id === gc.id);
          if (gcIndex !== -1) {
            newNodes[gcIndex] = {
              ...newNodes[gcIndex],
              x: startX + levelWidth * 2,
              y: gcStartY + j * gcSpacing
            };
          }
        });
      }
    });

    setNodes(newNodes);
  };

  // Export functions
  const exportAsPNG = async () => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `mapa-mental-${Date.now()}.png`;
      link.href = pngUrl;
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const exportAsSVG = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const link = document.createElement('a');
    link.download = `mapa-mental-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Save map data
  const handleSave = () => {
    if (onSave) {
      onSave({ nodes, connections });
    }
  };

  // Render connection line
  const renderConnection = (conn) => {
    const fromNode = nodes.find(n => n.id === conn.from);
    const toNode = nodes.find(n => n.id === conn.to);
    if (!fromNode || !toNode) return null;

    const midX = (fromNode.x + toNode.x) / 2;
    const midY = (fromNode.y + toNode.y) / 2;
    const ctrlX = midX;
    const ctrlY = midY - 30;

    return (
      <path
        key={conn.id}
        d={`M ${fromNode.x} ${fromNode.y} Q ${ctrlX} ${ctrlY} ${toNode.x} ${toNode.y}`}
        stroke={fromNode.color}
        strokeWidth="3"
        fill="none"
        opacity="0.6"
        strokeLinecap="round"
      />
    );
  };

  // Render node
  const renderNode = (node) => {
    const isSelected = selectedNode === node.id;
    const isEditing = editingNode === node.id;
    const isConnecting = connectingFrom === node.id;

    return (
      <g
        key={node.id}
        transform={`translate(${node.x}, ${node.y})`}
        onMouseDown={(e) => handleNodeMouseDown(e, node)}
        onClick={(e) => handleNodeClick(e, node)}
        onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
        style={{ cursor: draggingNode === node.id ? 'grabbing' : 'grab' }}
      >
        {/* Node background */}
        <rect
          x={node.isRoot ? -80 : -60}
          y={node.isRoot ? -25 : -20}
          width={node.isRoot ? 160 : 120}
          height={node.isRoot ? 50 : 40}
          rx="12"
          fill={node.color}
          opacity={isSelected ? 1 : 0.9}
          stroke={isSelected || isConnecting ? "#fff" : "transparent"}
          strokeWidth={isSelected || isConnecting ? 3 : 0}
          filter="drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))"
        />
        
        {/* Node text or input */}
        {isEditing ? (
          <foreignObject x="-55" y="-15" width="110" height="30">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSubmit();
                  if (e.key === 'Escape') handleEditCancel();
                }}
                autoFocus
                className="w-full px-2 py-1 text-xs bg-white text-slate-900 rounded border-none outline-none"
              />
            </div>
          </foreignObject>
        ) : (
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={node.isRoot ? "14" : "12"}
            fontWeight={node.isRoot ? "bold" : "medium"}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {node.text.length > 15 ? node.text.substring(0, 15) + '...' : node.text}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 border-b border-slate-700/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-slate-400 w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetView}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
            title="Resetar zoom (100%)"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCenterView}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
            title="Centralizar conteúdo"
          >
            <Focus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFitToView}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
            title="Ajustar à tela"
          >
            <Expand className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-slate-700 mx-2" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-800 border-slate-700">
              <DropdownMenuItem onClick={() => addNode(selectedNode)} className="text-white hover:bg-slate-700 cursor-pointer">
                <Circle className="w-4 h-4 mr-2 text-green-400" />
                Novo Nó
              </DropdownMenuItem>
              {selectedNode && (
                <DropdownMenuItem onClick={() => addChildNode(selectedNode)} className="text-white hover:bg-slate-700 cursor-pointer">
                  <GitBranch className="w-4 h-4 mr-2 text-blue-400" />
                  Adicionar Subtópico
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedNode && !nodes.find(n => n.id === selectedNode)?.isRoot && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteNode(selectedNode)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {selectedNode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startConnecting(selectedNode)}
                className={`${connectingFrom === selectedNode ? 'bg-blue-500/30 text-blue-300' : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20'}`}
              >
                <GripVertical className="w-4 h-4 mr-1" />
                Conectar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-700">
                    <Palette className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-800 border-slate-700 p-2">
                  <div className="flex gap-1">
                    {NODE_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => changeNodeColor(selectedNode, color)}
                        className="w-6 h-6 rounded-full hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Layout Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-700">
                <Layout className="w-4 h-4 mr-2" />
                Layout
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-800 border-slate-700">
              <DropdownMenuLabel className="text-slate-400 text-xs">Layout Automático</DropdownMenuLabel>
              <DropdownMenuItem onClick={applyRadialLayout} className="text-white hover:bg-slate-700 cursor-pointer">
                <Network className="w-4 h-4 mr-2 text-purple-400" />
                Radial
              </DropdownMenuItem>
              <DropdownMenuItem onClick={applyOrgChartLayout} className="text-white hover:bg-slate-700 cursor-pointer">
                <Layout className="w-4 h-4 mr-2 text-blue-400" />
                Organograma
              </DropdownMenuItem>
              <DropdownMenuItem onClick={applyTreeLayout} className="text-white hover:bg-slate-700 cursor-pointer">
                <TreeDeciduous className="w-4 h-4 mr-2 text-green-400" />
                Árvore
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuLabel className="text-slate-400 text-xs">Salvar/Carregar</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setShowSaveLayoutDialog(true)} className="text-white hover:bg-slate-700 cursor-pointer">
                <Save className="w-4 h-4 mr-2 text-amber-400" />
                Salvar Layout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowLoadLayoutDialog(true)} className="text-white hover:bg-slate-700 cursor-pointer">
                <FolderOpen className="w-4 h-4 mr-2 text-cyan-400" />
                Carregar Layout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-700">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-800 border-slate-700">
              <DropdownMenuItem onClick={exportAsPNG} className="text-white hover:bg-slate-700 cursor-pointer">
                Exportar como PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsSVG} className="text-white hover:bg-slate-700 cursor-pointer">
                Exportar como SVG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {onSave && (
            <Button
              data-mindmap-save
              onClick={handleSave}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-1" />
              Salvar
            </Button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 bg-slate-900/50 overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        style={{ 
          cursor: isPanning || isMiddleMousePanning ? 'grabbing' : 'default', 
          minHeight: '500px', 
          height: '100%' 
        }}
      >
        {/* Instructions */}
        {connectingFrom && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-full text-sm z-10">
            Clique em outro nó para conectar ou ESC para cancelar
          </div>
        )}
        
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Background pattern */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="rgba(148, 163, 184, 0.1)" />
            </pattern>
          </defs>
          <rect width="20000" height="20000" fill="url(#grid)" x="-10000" y="-10000" />
          
          {/* Connections */}
          {connections.map(renderConnection)}
          
          {/* Nodes */}
          {nodes.map(renderNode)}
        </svg>
      </div>

      {/* Help text */}
      <div className="p-2 bg-slate-800/30 text-xs text-slate-500 text-center flex items-center justify-center gap-4 flex-wrap">
        <span className="flex items-center gap-1"><Move className="w-3 h-3" /> Arraste nós</span>
        <span>• Duplo clique para editar</span>
        <span>• Scroll para navegar</span>
        <span>• Ctrl+Scroll para zoom</span>
        <span>• Roda do mouse (clique) para arrastar</span>
      </div>

      {/* Save Layout Dialog */}
      <Dialog open={showSaveLayoutDialog} onOpenChange={setShowSaveLayoutDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-amber-400" />
              Salvar Layout
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="Nome do layout"
              className="bg-slate-800 border-slate-700 text-white"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveLayoutDialog(false)}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={saveLayout}
                disabled={!layoutName.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Layout Dialog */}
      <Dialog open={showLoadLayoutDialog} onOpenChange={setShowLoadLayoutDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-cyan-400" />
              Carregar Layout
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto">
            {savedLayouts.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhum layout salvo</p>
            ) : (
              savedLayouts.map((layout) => (
                <div
                  key={layout.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors group"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => loadLayout(layout)}
                  >
                    <p className="font-medium text-white">{layout.name}</p>
                    <p className="text-xs text-slate-500">
                      {layout.nodes.length} nós • {new Date(layout.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteLayout(layout.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
