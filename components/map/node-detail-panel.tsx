'use client';

import type { Node } from '@xyflow/react';
import { X, FileText, Expand, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MapNodeData } from '@/types/argument-map';

const RELATIONSHIP_LABELS: Record<string, string> = {
  supports: 'Supports the claim',
  contradicts: 'Contradicts the claim',
  'provides-context': 'Provides context',
  'sub-argument': 'Sub-argument',
};

const TYPE_COLORS: Record<MapNodeData['nodeType'], string> = {
  claim: 'text-primary',
  supporting: 'text-emerald-600',
  opposing: 'text-red-600',
  context: 'text-blue-600',
  'sub-argument': 'text-violet-600',
};

interface NodeDetailPanelProps {
  node: Node<MapNodeData>;
  onClose: () => void;
  onExpand: (id: string) => void;
  onRemove: (id: string) => void;
  expanding: boolean;
}

export function NodeDetailPanel({ node, onClose, onExpand, onRemove, expanding }: NodeDetailPanelProps) {
  const { data } = node;
  const isClaim = data.nodeType === 'claim';

  return (
    <div className="w-80 border-l border-border/50 bg-background flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground truncate pr-2">Node Details</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Type badge */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Type</span>
          <p className={`text-sm font-medium mt-1 capitalize ${TYPE_COLORS[data.nodeType]}`}>
            {data.nodeType.replace('-', ' ')}
          </p>
        </div>

        {/* Title */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Title</span>
          <p className="text-sm font-medium text-foreground mt-1">{data.label}</p>
        </div>

        {/* Description */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description</span>
          <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{data.description}</p>
        </div>

        {/* Source document */}
        {data.documentName && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source Document</span>
            <div className="flex items-center gap-2 mt-1">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground/80 truncate">{data.documentName}</span>
            </div>
          </div>
        )}

        {/* Confidence */}
        {data.confidence != null && !isClaim && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Confidence</span>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.confidence >= 0.8 ? 'bg-emerald-500' : data.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-400'
                  }`}
                  style={{ width: `${data.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground w-9 text-right">
                {Math.round(data.confidence * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Doc type */}
        {data.docType && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Document Type</span>
            <p className="text-sm text-foreground/80 mt-1 capitalize">{data.docType}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border/50 space-y-2">
        {!isClaim && (
          <Button
            onClick={() => onExpand(node.id)}
            disabled={expanding}
            className="w-full rounded-full"
            variant="outline"
          >
            <Expand className="w-4 h-4 mr-2" />
            {expanding ? 'Expanding...' : 'Expand this point'}
          </Button>
        )}
        {!isClaim && (
          <Button
            onClick={() => onRemove(node.id)}
            variant="ghost"
            className="w-full rounded-full text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove from map
          </Button>
        )}
      </div>
    </div>
  );
}
