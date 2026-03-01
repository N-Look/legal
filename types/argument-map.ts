export type MapNodeType = 'claim' | 'supporting' | 'opposing' | 'context' | 'sub-argument';
export type RelationshipType = 'supports' | 'contradicts' | 'provides-context' | 'sub-argument';

export interface MapNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  nodeType: MapNodeType;
  documentName?: string;
  documentId?: string;
  docType?: string;
  confidence?: number;
}

export interface MapEdgeData extends Record<string, unknown> {
  relationship: RelationshipType;
  reasoning?: string;
}

/** Shape returned by the /api/map/analyze and /api/map/expand endpoints */
export interface AnalysisNode {
  label: string;
  description: string;
  nodeType: MapNodeType;
  relationship: RelationshipType;
  reasoning: string;
  documentName?: string;
  confidence?: number;
  /** Labels of other nodes this node also connects to (multi-parent support) */
  connectsTo?: string[];
}

export interface AnalyzeRequest {
  claim: string;
}

export interface AnalyzeResponse {
  nodes: AnalysisNode[];
  summary: string;
}

export interface ExpandRequest {
  nodeLabel: string;
  nodeDescription: string;
  claim: string;
}

export interface ExpandResponse {
  nodes: AnalysisNode[];
  summary: string;
}
