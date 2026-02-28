'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  ConnectionLineType,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { MapNodeData, MapEdgeData, AnalysisNode, AnalyzeResponse, ExpandResponse } from '@/types/argument-map';
import MapNodeComponent from './map-node';
import { ClaimInput } from './claim-input';
import { NodeDetailPanel } from './node-detail-panel';
import { MapToolbar } from './map-toolbar';

const nodeTypes = { mapNode: MapNodeComponent };

const EDGE_COLORS: Record<string, string> = {
  supports: '#22c55e',
  contradicts: '#ef4444',
  'provides-context': '#3b82f6',
  'sub-argument': '#8b5cf6',
};

/**
 * Multi-ring radial layout: distributes nodes across concentric rings
 * so the map looks full and organic. Groups by relationship type so
 * supporting / opposing / context cluster in different regions.
 */
function multiRingLayout(
  cx: number,
  cy: number,
  nodes: AnalysisNode[],
): { x: number; y: number }[] {
  // Group by type to cluster them in map quadrants
  const supporting = nodes.map((n, i) => ({ n, i })).filter((x) => x.n.relationship === 'supports');
  const opposing = nodes.map((n, i) => ({ n, i })).filter((x) => x.n.relationship === 'contradicts');
  const context = nodes.map((n, i) => ({ n, i })).filter((x) => x.n.relationship === 'provides-context');
  const subArg = nodes.map((n, i) => ({ n, i })).filter((x) => x.n.relationship === 'sub-argument');

  const positions: { x: number; y: number }[] = new Array(nodes.length);

  // Supporting: upper-left quadrant (angles ~180-270 degrees from right)
  placeGroup(supporting, cx, cy, Math.PI * 0.7, Math.PI * 1.3, [280, 420], positions);
  // Opposing: upper-right quadrant (angles ~270-360 degrees)
  placeGroup(opposing, cx, cy, Math.PI * 1.7, Math.PI * 2.3, [280, 420], positions);
  // Context: lower area
  placeGroup(context, cx, cy, Math.PI * 0.05, Math.PI * 0.55, [300, 440], positions);
  // Sub-arguments: scattered bottom
  placeGroup(subArg, cx, cy, Math.PI * -0.4, Math.PI * 0.0, [320, 460], positions);

  return positions;
}

function placeGroup(
  group: { n: AnalysisNode; i: number }[],
  cx: number,
  cy: number,
  startAngle: number,
  endAngle: number,
  radii: number[],
  positions: { x: number; y: number }[],
) {
  if (group.length === 0) return;
  const angleSpan = endAngle - startAngle;
  group.forEach((item, idx) => {
    const ring = idx < Math.ceil(group.length / 2) ? 0 : 1;
    const r = radii[ring % radii.length];
    const count = ring === 0 ? Math.ceil(group.length / 2) : group.length - Math.ceil(group.length / 2);
    const posInRing = ring === 0 ? idx : idx - Math.ceil(group.length / 2);
    const angle = startAngle + (angleSpan / (count + 1)) * (posInRing + 1);
    // Add slight randomness for organic feel
    const jitterX = (Math.sin(item.i * 7.3) * 30);
    const jitterY = (Math.cos(item.i * 11.1) * 30);
    positions[item.i] = {
      x: cx + r * Math.cos(angle) + jitterX,
      y: cy + r * Math.sin(angle) + jitterY,
    };
  });
}

/** Simple radial for expand children */
function radialLayout(
  parentX: number,
  parentY: number,
  count: number,
  radius: number,
  startAngle: number = 0,
): { x: number; y: number }[] {
  if (count === 0) return [];
  const angleStep = (2 * Math.PI) / Math.max(count, 1);
  return Array.from({ length: count }, (_, i) => {
    const angle = startAngle + i * angleStep - Math.PI / 2;
    return {
      x: parentX + radius * Math.cos(angle),
      y: parentY + radius * Math.sin(angle),
    };
  });
}

function ArgumentMapInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MapNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<MapEdgeData>>([]);
  const [loading, setLoading] = useState(false);
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [currentClaim, setCurrentClaim] = useState('');
  const [currentAssistantId, setCurrentAssistantId] = useState<string | null>(null);
  const { fitView } = useReactFlow();
  const nodeCounterRef = useRef(0);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const handleExpand = useCallback(
    async (nodeId: string) => {
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (!targetNode || !currentClaim) return;

      setExpandingNodeId(nodeId);
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, expanding: true } } : n)),
      );

      try {
        const res = await fetch('/api/map/expand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeLabel: targetNode.data.label,
            nodeDescription: targetNode.data.description,
            claim: currentClaim,
            assistantId: currentAssistantId,
          }),
        });
        const data: ExpandResponse = await res.json();
        if (!res.ok) throw new Error('Expand failed');

        const parentX = targetNode.position.x;
        const parentY = targetNode.position.y;
        // Push children outward from center
        const angleFromCenter = Math.atan2(parentY, parentX);
        const positions = radialLayout(parentX, parentY, data.nodes.length, 180, angleFromCenter - Math.PI / 3);

        const newNodes: Node<MapNodeData>[] = data.nodes.map((an, i) => {
          nodeCounterRef.current++;
          return {
            id: `node-${nodeCounterRef.current}`,
            type: 'mapNode',
            position: positions[i],
            data: {
              label: an.label,
              description: an.description,
              nodeType: an.nodeType,
              documentName: an.documentName,
              confidence: an.confidence,
              onExpand: handleExpand,
              expanding: false,
            },
          };
        });

        const newEdges: Edge<MapEdgeData>[] = newNodes.map((nn, i) => ({
          id: `edge-${nodeId}-${nn.id}`,
          source: nodeId,
          target: nn.id,
          type: 'default',
          style: { stroke: EDGE_COLORS[data.nodes[i].relationship] ?? '#94a3b8', strokeWidth: 1.5, strokeDasharray: '6 3' },
          data: {
            relationship: data.nodes[i].relationship,
            reasoning: data.nodes[i].reasoning,
          },
        }));

        setNodes((nds) => [
          ...nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, expanding: false } } : n)),
          ...newNodes,
        ]);
        setEdges((eds) => [...eds, ...newEdges]);

        setTimeout(() => fitView({ duration: 500, padding: 0.12 }), 100);
      } catch (err) {
        console.error('[expand]', err);
      } finally {
        setExpandingNodeId(null);
        setNodes((nds) =>
          nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, expanding: false } } : n)),
        );
      }
    },
    [nodes, currentClaim, currentAssistantId, setNodes, setEdges, fitView],
  );

  const handleAnalyze = useCallback(
    async (claim: string, assistantId: string | null) => {
      setLoading(true);
      setCurrentClaim(claim);
      setCurrentAssistantId(assistantId);
      setSelectedNodeId(null);
      setSummary(null);

      try {
        const res = await fetch('/api/map/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claim, assistantId }),
        });
        const data: AnalyzeResponse = await res.json();
        if (!res.ok) throw new Error('Analysis failed');

        nodeCounterRef.current = 0;

        // Central claim node
        const claimNode: Node<MapNodeData> = {
          id: 'claim-root',
          type: 'mapNode',
          position: { x: 0, y: 0 },
          data: {
            label: claim,
            description: claim,
            nodeType: 'claim',
          },
        };

        // Multi-ring layout
        const positions = multiRingLayout(0, 0, data.nodes);
        const evidenceNodes: Node<MapNodeData>[] = data.nodes.map((an: AnalysisNode, i: number) => {
          nodeCounterRef.current++;
          return {
            id: `node-${nodeCounterRef.current}`,
            type: 'mapNode',
            position: positions[i],
            data: {
              label: an.label,
              description: an.description,
              nodeType: an.nodeType,
              documentName: an.documentName,
              confidence: an.confidence,
              onExpand: handleExpand,
              expanding: false,
            },
          };
        });

        const newEdges: Edge<MapEdgeData>[] = evidenceNodes.map((en, i) => ({
          id: `edge-root-${en.id}`,
          source: 'claim-root',
          target: en.id,
          type: 'default',
          style: { stroke: EDGE_COLORS[data.nodes[i].relationship] ?? '#94a3b8', strokeWidth: 1.5 },
          data: {
            relationship: data.nodes[i].relationship,
            reasoning: data.nodes[i].reasoning,
          },
        }));

        setNodes([claimNode, ...evidenceNodes]);
        setEdges(newEdges);
        setSummary(data.summary);

        setTimeout(() => fitView({ duration: 500, padding: 0.12 }), 150);
      } catch (err) {
        console.error('[analyze]', err);
      } finally {
        setLoading(false);
      }
    },
    [handleExpand, setNodes, setEdges, fitView],
  );

  const handleRemoveNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [selectedNodeId, setNodes, setEdges],
  );

  const handleSelectionChange = useCallback(({ nodes: selectedNodes }: OnSelectionChangeParams) => {
    if (selectedNodes.length === 1) {
      setSelectedNodeId(selectedNodes[0].id);
    } else if (selectedNodes.length === 0) {
      setSelectedNodeId(null);
    }
  }, []);

  const handleNodeListClick = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setNodes((nds) =>
        nds.map((n) => ({ ...n, selected: n.id === nodeId })),
      );
    },
    [setNodes],
  );

  const handleResetLayout = useCallback(() => {
    if (nodes.length === 0) return;
    const claimNode = nodes.find((n) => n.data.nodeType === 'claim');
    if (!claimNode) return;

    // Re-derive analysis nodes from current map for multi-ring
    const evidenceNodes = nodes.filter((n) => n.data.nodeType !== 'claim');
    const asAnalysis: AnalysisNode[] = evidenceNodes.map((n) => ({
      label: n.data.label,
      description: n.data.description,
      nodeType: n.data.nodeType as AnalysisNode['nodeType'],
      relationship: (n.data.nodeType === 'supporting' ? 'supports'
        : n.data.nodeType === 'opposing' ? 'contradicts'
        : n.data.nodeType === 'sub-argument' ? 'sub-argument'
        : 'provides-context') as AnalysisNode['relationship'],
      reasoning: '',
    }));
    const positions = multiRingLayout(0, 0, asAnalysis);

    setNodes((nds) =>
      nds.map((n) => {
        if (n.data.nodeType === 'claim') return { ...n, position: { x: 0, y: 0 } };
        const idx = evidenceNodes.findIndex((en) => en.id === n.id);
        if (idx >= 0 && positions[idx]) return { ...n, position: positions[idx] };
        return n;
      }),
    );
    setTimeout(() => fitView({ duration: 400, padding: 0.12 }), 50);
  }, [nodes, setNodes, fitView]);

  return (
    <div className="flex -m-8 h-[calc(100%+4rem)]">
      {/* Left panel */}
      <ClaimInput
        onAnalyze={handleAnalyze}
        loading={loading}
        nodes={nodes}
        onNodeClick={handleNodeListClick}
        selectedNodeId={selectedNodeId}
        summary={summary}
      />

      {/* Center — React Flow canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={handleSelectionChange}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          minZoom={0.15}
          maxZoom={2.5}
          defaultEdgeOptions={{
            type: 'default',
            animated: false,
          }}
          proOptions={{ hideAttribution: true }}
          className="bg-[#0F0F12] dark:bg-[#0F0F12]"
        >
          <Background gap={40} size={1} color="#1a1a24" className="opacity-100" />
          <MapToolbar onResetLayout={handleResetLayout} />
        </ReactFlow>

        {/* Legend overlay */}
        {nodes.length > 0 && (
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 bg-black/40 backdrop-blur-md rounded-xl px-3.5 py-3 border border-white/5">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-white/40 mb-0.5">Legend</span>
            <LegendDot color="bg-emerald-500" label="Supports" />
            <LegendDot color="bg-red-500" label="Opposes" />
            <LegendDot color="bg-blue-500" label="Context" />
            <LegendDot color="bg-violet-500" label="Sub-argument" />
          </div>
        )}

        {/* Empty state overlay */}
        {nodes.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5 relative">
                {/* Animated orbit dots */}
                <div className="absolute w-3 h-3 rounded-full bg-emerald-500/60 animate-pulse" style={{ top: '2px', left: '50%', transform: 'translateX(-50%)' }} />
                <div className="absolute w-2.5 h-2.5 rounded-full bg-red-500/60 animate-pulse" style={{ bottom: '5px', right: '5px', animationDelay: '0.5s' }} />
                <div className="absolute w-2 h-2 rounded-full bg-blue-500/60 animate-pulse" style={{ bottom: '5px', left: '8px', animationDelay: '1s' }} />
                <div className="w-5 h-5 rounded-full bg-primary/80" />
              </div>
              <h3 className="text-sm font-semibold text-white/50 mb-1.5">Build your argument map</h3>
              <p className="text-xs text-white/30 leading-relaxed">
                Enter a legal claim in the left panel and click &quot;Analyze Claim&quot; to discover connected evidence from your uploaded documents.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right detail panel */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onExpand={handleExpand}
          onRemove={handleRemoveNode}
          expanding={expandingNodeId === selectedNodeId}
        />
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-[10px] text-white/60">{label}</span>
    </div>
  );
}

export function ArgumentMap() {
  return (
    <ReactFlowProvider>
      <ArgumentMapInner />
    </ReactFlowProvider>
  );
}
