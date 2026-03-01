'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { MapNodeData, MapEdgeData, AnalysisNode, AnalyzeResponse, ExpandResponse } from '@/types/argument-map';
import MapNodeComponent from './map-node';
import { ClaimInput } from './claim-input';
import { NodeDetailPanel } from './node-detail-panel';
import { MapToolbar } from './map-toolbar';

const nodeTypes = { mapNode: MapNodeComponent };

/* ─── Edge colors by relationship ─── */
const EDGE_COLORS: Record<string, string> = {
  supports: '#16a34a',
  contradicts: '#dc2626',
  'provides-context': '#d97706',
  'sub-argument': '#7c3aed',
};

/* ─── Hardcoded mind map data (Terry Smith v. Midville) ─── */
// This creates a beautiful tree structure with multi-level branching

const HARDCODED_CLAIM = 'The Midville School District was negligent in failing to prevent the bullying of Terry Smith';

interface HardcodedNode {
  id: string;
  label: string;
  description: string;
  nodeType: MapNodeData['nodeType'];
  documentName?: string;
  confidence?: number;
  x: number;
  y: number;
}

interface HardcodedEdge {
  source: string;
  target: string;
  relationship: 'supports' | 'contradicts' | 'provides-context' | 'sub-argument';
  reasoning?: string;
  animated?: boolean;
  dashed?: boolean;
}

/*
 * Radial argument DAG — branches spread in all directions from the claim.
 * Each synthesis node occupies a quadrant, with evidence fanning outward.
 *
 *                          Sanchez    Dean Green
 *                             ↘          ↓
 *          DOE Training    School Knew ← Multi-Staff
 *               ↑              ↑              ↘
 *          Fisher Memo → Response    CLAIM    Putnam
 *               ↑        Adequate →    ↙  ↘      ↓
 *          Single Compl → Protocol  Harm Doc  Legal Framework
 *                              ↑       ↗  ↖      ↙        ↘
 *                         Dr. Carter  Social   IIED    Comp. Fault
 *                                     Media
 *                                       ↑
 *                                  Visible Posts
 */

const HARDCODED_NODES: HardcodedNode[] = [
  // ── CENTER ──
  { id: 'claim', label: HARDCODED_CLAIM, description: HARDCODED_CLAIM, nodeType: 'claim', x: 0, y: 0 },

  // ── UPPER-LEFT: "School Had Knowledge" branch (opposing) ──
  {
    id: 'school-knew', label: 'School Had Actual Knowledge',
    description: 'Multiple independent sources — a counselor email, dean inaction, and cross-staff awareness — prove the school knew about the bullying and failed to coordinate a response.',
    nodeType: 'opposing', confidence: 0.94, x: -320, y: -220,
  },
  {
    id: 'sanchez-email', label: 'Sanchez Email Ignored',
    description: 'Exhibit 5: Counselor Sanchez emailed Dean Green about Terry being bullied. No meaningful follow-up was taken.',
    nodeType: 'opposing', documentName: 'Exhibit 5', confidence: 0.93, x: -520, y: -420,
  },
  {
    id: 'dean-green', label: 'Dean Green\'s Inaction',
    description: 'Green received the email but took no documented action. Critical factual dispute at trial.',
    nodeType: 'opposing', documentName: 'Green Witness Statement', confidence: 0.82, x: -280, y: -440,
  },
  {
    id: 'multi-staff', label: 'Multiple Staff Knew',
    description: 'Fisher, Sanchez, and at least one other teacher were independently aware, yet no coordinated response occurred.',
    nodeType: 'opposing', documentName: 'Multiple Witnesses', confidence: 0.87, x: -80, y: -380,
  },

  // ── LEFT: "Response Was Adequate" branch (supporting / defense) ──
  {
    id: 'response-adequate', label: 'Defense: Response Was Adequate',
    description: 'The defense argues the school followed its anti-bullying protocol. Fisher filed a memo, completed DOE training, and the four-step procedure was initiated.',
    nodeType: 'supporting', confidence: 0.82, x: -380, y: 80,
  },
  {
    id: 'fisher-memo', label: 'Fisher Memo — Documented Response',
    description: 'Exhibit 4: Teacher Fisher wrote a formal memo documenting a bullying incident and filed it with administration.',
    nodeType: 'supporting', documentName: 'Exhibit 4', confidence: 0.92, x: -600, y: -60,
  },
  {
    id: 'protocol', label: 'Four-Step Protocol',
    description: 'Midville\'s formal anti-bullying protocol: Identify, Document, Report, Follow Up. Fisher followed steps 1-3.',
    nodeType: 'supporting', documentName: 'Defense Response', confidence: 0.85, x: -620, y: 160,
  },
  {
    id: 'putnam', label: 'Putnam\'s Non-Intervention',
    description: 'Principal Putnam\'s philosophy of "natural consequences" in peer conflicts created a culture of inaction that undermined any formal policy.',
    nodeType: 'opposing', documentName: 'Putnam Statement', confidence: 0.91, x: -560, y: 300,
  },
  {
    id: 'doe-training', label: 'DOE Training Completed',
    description: 'Fisher completed mandatory DOE anti-bullying training and implemented the protocol in the classroom.',
    nodeType: 'supporting', documentName: 'Fisher Witness Statement', confidence: 0.90, x: -800, y: -140,
  },
  {
    id: 'single-complaint', label: 'Only One Formal Complaint',
    description: 'Defense argues only Fisher\'s memo was formally filed. A single report does not establish a pattern.',
    nodeType: 'supporting', documentName: 'Defense Response', confidence: 0.75, x: -820, y: 100,
  },

  // ── LOWER-RIGHT: "Harm Was Documented" branch (opposing) ──
  {
    id: 'harm-documented', label: 'Harm Was Foreseeable & Documented',
    description: 'Expert testimony and publicly visible social media posts establish that the harm was both foreseeable and actually suffered, satisfying the damages element.',
    nodeType: 'opposing', confidence: 0.91, x: 280, y: 240,
  },
  {
    id: 'dr-carter', label: 'Dr. Carter Expert Testimony',
    description: 'Psychologist documented significant harm. Establishes causal link between school inaction and Terry\'s distress.',
    nodeType: 'opposing', documentName: 'Dr. Carter Statement', confidence: 0.89, x: 160, y: 440,
  },
  {
    id: 'social-media', label: 'Social Media Bullying',
    description: 'Exhibits 1-3: Sustained, publicly visible posts bullying Terry Smith across multiple platforms.',
    nodeType: 'opposing', documentName: 'Exhibits 1-3', confidence: 0.88, x: 420, y: 440,
  },
  {
    id: 'visible-posts', label: 'Posts Were Publicly Visible',
    description: 'The online bullying was visible to anyone. The school should have been aware of the broader pattern.',
    nodeType: 'opposing', documentName: 'Exhibits 1-3', confidence: 0.85, x: 480, y: 640,
  },

  // ── UPPER-RIGHT: "Legal Framework" branch (context) ──
  {
    id: 'legal-framework', label: 'Legal Framework',
    description: 'The negligence and IIED counts define the legal standard: duty, breach, causation, damages. Comparative fault is the defense\'s primary affirmative defense.',
    nodeType: 'context', documentName: 'Jury Instructions', confidence: 0.80, x: 360, y: -180,
  },
  {
    id: 'iied', label: 'IIED Claim (Count II)',
    description: 'Count II: "extreme and outrageous" conduct done with reckless disregard. High bar for plaintiff.',
    nodeType: 'context', documentName: 'Complaint — Count II', confidence: 0.78, x: 560, y: -320,
  },
  {
    id: 'comparative-fault', label: 'Comparative Fault Defense',
    description: 'Defense argues Terry failed to use reporting channels. Terry\'s statement says he reported to a teacher.',
    nodeType: 'sub-argument', documentName: 'Defense Defenses', confidence: 0.70, x: 580, y: -100,
  },
];

const HARDCODED_EDGES: HardcodedEdge[] = [
  // ── Synthesis → Claim ──
  { source: 'school-knew', target: 'claim', relationship: 'contradicts' },
  { source: 'response-adequate', target: 'claim', relationship: 'supports' },
  { source: 'harm-documented', target: 'claim', relationship: 'contradicts' },
  { source: 'legal-framework', target: 'claim', relationship: 'provides-context' },

  // ── Upper-left: evidence → "School Had Knowledge" ──
  { source: 'sanchez-email', target: 'school-knew', relationship: 'contradicts' },
  { source: 'dean-green', target: 'school-knew', relationship: 'contradicts' },
  { source: 'multi-staff', target: 'school-knew', relationship: 'contradicts' },

  // ── Left: evidence → "Response Was Adequate" ──
  { source: 'fisher-memo', target: 'response-adequate', relationship: 'supports' },
  { source: 'protocol', target: 'response-adequate', relationship: 'supports' },
  { source: 'putnam', target: 'response-adequate', relationship: 'contradicts', reasoning: 'Putnam\'s philosophy undermines the defense claim of adequate response' },

  // ── SHARED: Multi-Staff also feeds "Response Was Adequate" ──
  { source: 'multi-staff', target: 'response-adequate', relationship: 'contradicts', reasoning: 'Multiple staff knew but none coordinated — policy existed on paper only' },

  // ── Lower-right: evidence → "Harm Was Documented" ──
  { source: 'dr-carter', target: 'harm-documented', relationship: 'contradicts' },
  { source: 'social-media', target: 'harm-documented', relationship: 'contradicts' },

  // ── Upper-right: evidence → "Legal Framework" ──
  { source: 'iied', target: 'legal-framework', relationship: 'provides-context' },
  { source: 'comparative-fault', target: 'legal-framework', relationship: 'sub-argument' },

  // ── Deeper chains (evidence → evidence) ──
  { source: 'doe-training', target: 'fisher-memo', relationship: 'supports' },
  { source: 'visible-posts', target: 'social-media', relationship: 'contradicts' },
  { source: 'single-complaint', target: 'protocol', relationship: 'supports' },

  // ── Cross-references (dashed, connecting across branches) ──
  { source: 'single-complaint', target: 'multi-staff', relationship: 'contradicts', dashed: true, reasoning: 'Defense says 1 complaint; plaintiff says multiple staff knew' },
  { source: 'dr-carter', target: 'iied', relationship: 'provides-context', dashed: true, reasoning: 'Expert testimony on harm supports IIED damages element' },
];

function buildHardcodedGraph(onExpand: (id: string) => void): { nodes: Node<MapNodeData>[]; edges: Edge<MapEdgeData>[] } {
  const nodes: Node<MapNodeData>[] = HARDCODED_NODES.map((hn) => ({
    id: hn.id,
    type: 'mapNode',
    position: { x: hn.x, y: hn.y },
    data: {
      label: hn.label,
      description: hn.description,
      nodeType: hn.nodeType,
      documentName: hn.documentName,
      confidence: hn.confidence,
      onExpand: hn.nodeType !== 'claim' ? onExpand : undefined,
      expanding: false,
    },
  }));

  const edges: Edge<MapEdgeData>[] = HARDCODED_EDGES.map((he, i) => ({
    id: `edge-${i}-${he.source}-${he.target}`,
    source: he.source,
    target: he.target,
    type: 'default',
    animated: he.animated ?? false,
    style: he.dashed
      ? { stroke: 'rgba(0,0,0,0.08)', strokeWidth: 0.5, strokeDasharray: '4 3' }
      : { stroke: EDGE_COLORS[he.relationship] ?? '#94a3b8', strokeWidth: 1 },
    markerEnd: he.dashed
      ? undefined
      : { type: MarkerType.ArrowClosed, width: 8, height: 8, color: EDGE_COLORS[he.relationship] ?? '#94a3b8' },
    data: {
      relationship: he.relationship,
      reasoning: he.reasoning ?? '',
    },
  }));

  return { nodes, edges };
}

/* ─── Cross-reference detection for dynamic nodes ─── */
function findCrossLink(a: AnalysisNode, b: AnalysisNode): string | null {
  const aText = `${a.label} ${a.description}`.toLowerCase();
  const bText = `${b.label} ${b.description}`.toLowerCase();
  const entities = [
    { keys: ['fisher', 'memo', 'exhibit 4'], label: 'Fisher memo' },
    { keys: ['sanchez', 'email', 'exhibit 5'], label: 'Sanchez email' },
    { keys: ['putnam', 'natural consequences', 'principal'], label: 'Putnam' },
    { keys: ['green', 'dean'], label: 'Dean Green' },
    { keys: ['carter', 'psycholog', 'expert'], label: 'Dr. Carter' },
    { keys: ['social media', 'exhibit 1', 'exhibit 2', 'exhibit 3'], label: 'Social media' },
    { keys: ['four-step', 'protocol', '4-step'], label: 'Protocol' },
    { keys: ['training', 'doe'], label: 'DOE training' },
    { keys: ['negligence', 'duty', 'breach'], label: 'Negligence' },
    { keys: ['iied', 'emotional distress', 'outrageous'], label: 'IIED' },
    { keys: ['comparative fault', "terry's own"], label: 'Fault' },
  ];
  for (const entity of entities) {
    const aHas = entity.keys.some((k) => aText.includes(k));
    const bHas = entity.keys.some((k) => bText.includes(k));
    if (aHas && bHas) return entity.label;
  }
  return null;
}

/* ─── Build radial DAG from flat API nodes ─── */
// Groups evidence by relationship, creates intermediate synthesis nodes,
// places each group in a different quadrant radiating from the claim.
interface LayeredGraph {
  nodes: Node<MapNodeData>[];
  edges: Edge<MapEdgeData>[];
}

// Quadrant angles (radians): upper-left, upper-right, lower-right, lower-left
const QUADRANT_ANGLES = [
  Math.PI * 1.25, // upper-left  (225°)
  Math.PI * 1.75, // upper-right (315°)
  Math.PI * 0.25, // lower-right (45°)
  Math.PI * 0.75, // lower-left  (135°)
];

function buildLayeredDAG(
  claim: string,
  analysisNodes: AnalysisNode[],
  onExpand: (id: string) => void,
): LayeredGraph {
  // Group nodes by relationship
  const groups: Record<string, { nodes: AnalysisNode[]; indices: number[] }> = {
    supports: { nodes: [], indices: [] },
    contradicts: { nodes: [], indices: [] },
    'provides-context': { nodes: [], indices: [] },
    'sub-argument': { nodes: [], indices: [] },
  };
  analysisNodes.forEach((n, i) => {
    const g = groups[n.relationship] ?? groups['provides-context'];
    g.nodes.push(n);
    g.indices.push(i);
  });

  // Build synthesis descriptions by combining child node content
  function synthesizeDescription(nodes: AnalysisNode[]): string {
    return nodes.map((n) => `${n.label}: ${n.description}`).join('\n\n');
  }

  // Determine which groups have nodes
  const activeGroups: { key: string; id: string; label: string; description: string; nodeType: MapNodeData['nodeType'] }[] = [];
  if (groups.supports.nodes.length > 0) activeGroups.push({ key: 'supports', id: 'synthesis-supports', label: 'Supporting Evidence', description: synthesizeDescription(groups.supports.nodes), nodeType: 'supporting' });
  if (groups.contradicts.nodes.length > 0) activeGroups.push({ key: 'contradicts', id: 'synthesis-contradicts', label: 'Opposing Evidence', description: synthesizeDescription(groups.contradicts.nodes), nodeType: 'opposing' });
  if (groups['provides-context'].nodes.length > 0) activeGroups.push({ key: 'provides-context', id: 'synthesis-context', label: 'Legal Context', description: synthesizeDescription(groups['provides-context'].nodes), nodeType: 'context' });
  if (groups['sub-argument'].nodes.length > 0) activeGroups.push({ key: 'sub-argument', id: 'synthesis-sub', label: 'Derivative Arguments', description: synthesizeDescription(groups['sub-argument'].nodes), nodeType: 'sub-argument' });

  const allNodes: Node<MapNodeData>[] = [];
  const allEdges: Edge<MapEdgeData>[] = [];

  // Claim node at center
  allNodes.push({
    id: 'claim-root',
    type: 'mapNode',
    position: { x: 0, y: 0 },
    data: { label: claim, description: claim, nodeType: 'claim' },
  });

  const synthRadius = 320;  // distance from claim to synthesis node
  const evidRadius = 280;   // distance from synthesis to evidence nodes
  let nodeCounter = 0;
  const nodeIdMap: Map<number, string> = new Map();

  activeGroups.forEach((ag, gIdx) => {
    const angle = QUADRANT_ANGLES[gIdx % QUADRANT_ANGLES.length];
    const group = groups[ag.key];
    const sx = synthRadius * Math.cos(angle);
    const sy = synthRadius * Math.sin(angle);

    // Synthesis node
    allNodes.push({
      id: ag.id,
      type: 'mapNode',
      position: { x: sx, y: sy },
      data: {
        label: ag.label,
        description: ag.description,
        nodeType: ag.nodeType,
        onExpand,
        expanding: false,
      },
    });

    // Edge: synthesis → claim
    allEdges.push({
      id: `edge-${ag.id}-claim`,
      source: ag.id,
      target: 'claim-root',
      type: 'default',
      style: { stroke: EDGE_COLORS[ag.key] ?? '#94a3b8', strokeWidth: 1 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 8, height: 8, color: EDGE_COLORS[ag.key] ?? '#94a3b8' },
      data: { relationship: ag.key as MapEdgeData['relationship'], reasoning: '' },
    });

    // Fan evidence nodes outward from synthesis node
    const count = group.nodes.length;
    const fanSpread = Math.min(Math.PI * 0.6, count * 0.3); // wider fan for more nodes
    const startAngle = angle - fanSpread / 2;

    group.nodes.forEach((an, idx) => {
      nodeCounter++;
      const nodeId = `node-${nodeCounter}`;
      nodeIdMap.set(group.indices[idx], nodeId);

      const evAngle = count === 1 ? angle : startAngle + (fanSpread / (count - 1)) * idx;
      const ex = sx + evidRadius * Math.cos(evAngle);
      const ey = sy + evidRadius * Math.sin(evAngle);

      allNodes.push({
        id: nodeId,
        type: 'mapNode',
        position: { x: ex, y: ey },
        data: {
          label: an.label,
          description: an.description,
          nodeType: an.nodeType,
          documentName: an.documentName,
          confidence: an.confidence,
          onExpand,
          expanding: false,
        },
      });

      allEdges.push({
        id: `edge-${nodeId}-${ag.id}`,
        source: nodeId,
        target: ag.id,
        type: 'default',
        style: { stroke: EDGE_COLORS[an.relationship] ?? '#94a3b8', strokeWidth: 1 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 8, height: 8, color: EDGE_COLORS[an.relationship] ?? '#94a3b8' },
        data: { relationship: an.relationship, reasoning: an.reasoning },
      });
    });
  });

  // Cross-reference edges (dashed) between evidence in different groups
  const seen = new Set<string>();
  for (let i = 0; i < analysisNodes.length; i++) {
    for (let j = i + 1; j < analysisNodes.length; j++) {
      if (analysisNodes[i].relationship === analysisNodes[j].relationship) continue;
      const link = findCrossLink(analysisNodes[i], analysisNodes[j]);
      if (link) {
        const idA = nodeIdMap.get(i);
        const idB = nodeIdMap.get(j);
        if (!idA || !idB) continue;
        const key = [idA, idB].sort().join('-');
        if (seen.has(key)) continue;
        seen.add(key);
        allEdges.push({
          id: `cross-${idA}-${idB}`,
          source: idA,
          target: idB,
          type: 'default',
          style: { stroke: 'rgba(0,0,0,0.08)', strokeWidth: 0.5, strokeDasharray: '4 3' },
          data: { relationship: 'provides-context' as const, reasoning: `Connected via: ${link}` },
        });
      }
    }
  }

  return { nodes: allNodes, edges: allEdges };
}

function expandLayout(parentX: number, parentY: number, count: number, angleFromCenter: number): { x: number; y: number }[] {
  if (count === 0) return [];
  const radius = 200;
  const spread = Math.PI * 0.6;
  const startAngle = angleFromCenter - spread / 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = count === 1 ? angleFromCenter : startAngle + (spread / (count - 1)) * i;
    return { x: parentX + radius * Math.cos(angle), y: parentY + radius * Math.sin(angle) };
  });
}

/* ─── Main Component ─── */
function ArgumentMapInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MapNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<MapEdgeData>>([]);
  const [loading, setLoading] = useState(false);
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [currentClaim, setCurrentClaim] = useState(HARDCODED_CLAIM);
  const [currentAssistantId, setCurrentAssistantId] = useState<string | null>(null);
  const { fitView } = useReactFlow();
  const nodeCounterRef = useRef(100);
  const initializedRef = useRef(false);

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
        const angleFromCenter = Math.atan2(parentY, parentX);
        const positions = expandLayout(parentX, parentY, data.nodes.length, angleFromCenter);

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
          id: `edge-expand-${nodeId}-${nn.id}`,
          source: nodeId,
          target: nn.id,
          type: 'default',
          style: { stroke: EDGE_COLORS[data.nodes[i].relationship] ?? '#94a3b8', strokeWidth: 1 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 8, height: 8, color: EDGE_COLORS[data.nodes[i].relationship] ?? '#94a3b8' },
          data: { relationship: data.nodes[i].relationship, reasoning: data.nodes[i].reasoning },
        }));

        // Cross-link to existing nodes
        const existingAnalysisNodes = nodes
          .filter((n) => n.data.nodeType !== 'claim')
          .map((n) => ({ label: n.data.label, description: n.data.description, nodeType: n.data.nodeType as AnalysisNode['nodeType'], relationship: 'provides-context' as const, reasoning: '' }));
        const existingIds = nodes.filter((n) => n.data.nodeType !== 'claim').map((n) => n.id);

        const crossEdges: Edge<MapEdgeData>[] = [];
        data.nodes.forEach((newAn, newIdx) => {
          existingAnalysisNodes.forEach((existAn, existIdx) => {
            const link = findCrossLink(newAn, existAn);
            if (link) {
              crossEdges.push({
                id: `cross-${newNodes[newIdx].id}-${existingIds[existIdx]}`,
                source: newNodes[newIdx].id,
                target: existingIds[existIdx],
                type: 'default',
                style: { stroke: 'rgba(0,0,0,0.08)', strokeWidth: 0.5, strokeDasharray: '4 3' },
                data: { relationship: 'provides-context', reasoning: `Connected via: ${link}` },
              });
            }
          });
        });

        setNodes((nds) => [
          ...nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, expanding: false } } : n)),
          ...newNodes,
        ]);
        setEdges((eds) => [...eds, ...newEdges, ...crossEdges]);
        setTimeout(() => fitView({ duration: 500, padding: 0.1 }), 100);
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

  // Load hardcoded map on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const graph = buildHardcodedGraph(handleExpand);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setSummary('The evidence landscape is sharply contested. The defense relies on Fisher\'s DOE training, the Four-Step Protocol, and the single Fisher memo as proof of reasonable care. The plaintiff has strong counter-evidence: Sanchez\'s unaddressed email to Dean Green, pervasive social media bullying, Principal Putnam\'s non-intervention philosophy, and Dr. Carter\'s expert testimony on psychological harm.');
    setTimeout(() => fitView({ duration: 600, padding: 0.08 }), 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        const graph = buildLayeredDAG(claim, data.nodes, handleExpand);
        setNodes(graph.nodes);
        setEdges(graph.edges);
        setSummary(data.summary);
        setTimeout(() => fitView({ duration: 500, padding: 0.1 }), 150);
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

  const handleSelectionChange = useCallback(({ nodes: sel }: OnSelectionChangeParams) => {
    if (sel.length === 1) setSelectedNodeId(sel[0].id);
    else if (sel.length === 0) setSelectedNodeId(null);
  }, []);

  const handleNodeListClick = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
    },
    [setNodes],
  );

  const handleResetLayout = useCallback(() => {
    const graph = buildHardcodedGraph(handleExpand);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setTimeout(() => fitView({ duration: 400, padding: 0.08 }), 50);
  }, [handleExpand, setNodes, setEdges, fitView]);

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
          minZoom={0.05}
          maxZoom={3}
          defaultEdgeOptions={{ type: 'default', animated: false }}
          proOptions={{ hideAttribution: true }}
          style={{ background: '#f8f9fb' }}
        >
          <Background gap={40} size={1} color="#e8eaed" />
          <MapToolbar onResetLayout={handleResetLayout} />
        </ReactFlow>

        {/* Legend */}
        {nodes.length > 0 && (
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 rounded-2xl px-4 py-3.5 border shadow-lg"
            style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderColor: '#e5e7eb' }}>
            <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9ca3af', marginBottom: 2 }}>Legend</span>
            <LegendItem color="#16a34a" label="Supports claim" />
            <LegendItem color="#dc2626" label="Opposes claim" animated />
            <LegendItem color="#d97706" label="Context" />
            <LegendItem color="#7c3aed" label="Sub-argument" />
            <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 4, paddingTop: 6 }}>
              <div className="flex items-center gap-2">
                <div style={{ width: 24, borderTop: '1px dashed #d1d5db' }} />
                <span style={{ fontSize: 9, color: '#9ca3af' }}>Cross-reference</span>
              </div>
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

function LegendItem({ color, label, animated }: { color: string; label: string; animated?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1.5" style={{ width: 40 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, height: 1.5, background: color, opacity: animated ? 0.6 : 0.3 }} />
      </div>
      <span style={{ fontSize: 9, color: '#6b7280' }}>{label}</span>
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
