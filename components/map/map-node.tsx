'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Loader2, FileText, Scale, ShieldAlert, BookOpen, GitBranch } from 'lucide-react';
import type { MapNodeData } from '@/types/argument-map';

const NODE_STYLES: Record<MapNodeData['nodeType'], {
  bg: string;
  border: string;
  accent: string;
  text: string;
  tagBg: string;
  tagText: string;
  icon: typeof Scale;
  handleColor: string;
  shadow: string;
  selectedShadow: string;
  docColor: string;
  divider: string;
  leftStripe: string;
}> = {
  claim: {
    bg: '#1e293b',
    border: '#475569',
    accent: '#f8fafc',
    text: '#cbd5e1',
    tagBg: 'rgba(255,255,255,0.1)',
    tagText: '#e2e8f0',
    icon: Scale,
    handleColor: '#64748b',
    shadow: '0 1px 4px rgba(30,41,59,0.15)',
    selectedShadow: '0 0 0 2px rgba(71,85,105,0.3), 0 4px 12px rgba(30,41,59,0.2)',
    docColor: 'rgba(255,255,255,0.3)',
    divider: 'rgba(255,255,255,0.08)',
    leftStripe: '#64748b',
  },
  supporting: {
    bg: '#ffffff',
    border: '#d1d5db',
    accent: '#15803d',
    text: '#6b7280',
    tagBg: '#f0fdf4',
    tagText: '#16a34a',
    icon: FileText,
    handleColor: '#16a34a',
    shadow: '0 1px 4px rgba(0,0,0,0.06)',
    selectedShadow: '0 0 0 2px rgba(22,163,74,0.2), 0 4px 12px rgba(22,163,74,0.1)',
    docColor: '#9ca3af',
    divider: '#f3f4f6',
    leftStripe: '#16a34a',
  },
  opposing: {
    bg: '#ffffff',
    border: '#d1d5db',
    accent: '#b91c1c',
    text: '#6b7280',
    tagBg: '#fef2f2',
    tagText: '#dc2626',
    icon: ShieldAlert,
    handleColor: '#dc2626',
    shadow: '0 1px 4px rgba(0,0,0,0.06)',
    selectedShadow: '0 0 0 2px rgba(220,38,38,0.2), 0 4px 12px rgba(220,38,38,0.1)',
    docColor: '#9ca3af',
    divider: '#f3f4f6',
    leftStripe: '#dc2626',
  },
  context: {
    bg: '#ffffff',
    border: '#d1d5db',
    accent: '#b45309',
    text: '#6b7280',
    tagBg: '#fffbeb',
    tagText: '#d97706',
    icon: BookOpen,
    handleColor: '#f59e0b',
    shadow: '0 1px 4px rgba(0,0,0,0.06)',
    selectedShadow: '0 0 0 2px rgba(245,158,11,0.2), 0 4px 12px rgba(245,158,11,0.1)',
    docColor: '#9ca3af',
    divider: '#f3f4f6',
    leftStripe: '#f59e0b',
  },
  'sub-argument': {
    bg: '#ffffff',
    border: '#d1d5db',
    accent: '#6d28d9',
    text: '#6b7280',
    tagBg: '#f5f3ff',
    tagText: '#7c3aed',
    icon: GitBranch,
    handleColor: '#7c3aed',
    shadow: '0 1px 4px rgba(0,0,0,0.06)',
    selectedShadow: '0 0 0 2px rgba(124,58,237,0.2), 0 4px 12px rgba(124,58,237,0.1)',
    docColor: '#9ca3af',
    divider: '#f3f4f6',
    leftStripe: '#7c3aed',
  },
};

export type MapNodeType = Node<MapNodeData & { onExpand?: (id: string) => void; expanding?: boolean }>;

function MapNodeComponent({ id, data, selected }: NodeProps<MapNodeType>) {
  const style = NODE_STYLES[data.nodeType];
  const isClaim = data.nodeType === 'claim';
  const Icon = style.icon;

  return (
    <div className="relative group">
      {/* Target handles */}
      <Handle type="target" position={Position.Top} id="top"
        style={{ width: 6, height: 6, background: style.handleColor, border: `2px solid ${style.bg}`, minWidth: 0, minHeight: 0 }}
      />
      <Handle type="target" position={Position.Left} id="left"
        style={{ width: 6, height: 6, background: style.handleColor, border: `2px solid ${style.bg}`, minWidth: 0, minHeight: 0 }}
      />
      <Handle type="target" position={Position.Right} id="right-target"
        style={{ width: 6, height: 6, background: style.handleColor, border: `2px solid ${style.bg}`, minWidth: 0, minHeight: 0 }}
      />

      {/* Card — compact by default, expands on select */}
      <div
        style={{
          background: style.bg,
          borderTopColor: selected ? style.leftStripe : style.border,
          borderRightColor: selected ? style.leftStripe : style.border,
          borderBottomColor: selected ? style.leftStripe : style.border,
          borderLeftColor: style.leftStripe,
          borderTopWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1,
          borderLeftWidth: 3,
          borderStyle: 'solid',
          borderRadius: 10,
          boxShadow: selected ? style.selectedShadow : style.shadow,
          width: isClaim ? 220 : 160,
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: isClaim ? '10px 12px' : '8px 10px' }}>
          {/* Icon + Title row */}
          <div className="flex items-start gap-2">
            <div style={{
              background: style.tagBg,
              borderRadius: 6,
              padding: 4,
              flexShrink: 0,
              marginTop: 1,
            }}>
              <Icon style={{ width: isClaim ? 12 : 10, height: isClaim ? 12 : 10, color: style.tagText }} />
            </div>
            <p style={{
              color: style.accent,
              fontSize: isClaim ? 12 : 10,
              fontWeight: 600,
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: selected ? 4 : 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
              margin: 0,
            }}>
              {data.label}
            </p>
          </div>

          {/* Expanded content — only when selected */}
          {selected && data.description && data.description !== data.label && (
            <p style={{
              color: style.text,
              fontSize: 9,
              lineHeight: 1.5,
              marginTop: 6,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}>
              {data.description}
            </p>
          )}

          {/* Source doc — only when selected */}
          {selected && data.documentName && (
            <div className="flex items-center gap-1" style={{ marginTop: 5, paddingTop: 5, borderTop: `1px solid ${style.divider}` }}>
              <FileText style={{ width: 9, height: 9, color: style.docColor, flexShrink: 0 }} />
              <span style={{ fontSize: 8, color: style.docColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                {data.documentName}
              </span>
            </div>
          )}
        </div>

        {/* Expand (deeper research) button */}
        {!isClaim && data.onExpand && (
          <button
            onClick={(e) => { e.stopPropagation(); data.onExpand!(id); }}
            disabled={data.expanding}
            style={{
              position: 'absolute',
              right: -8,
              top: -8,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#ffffff',
              border: `1.5px solid ${style.leftStripe}`,
              color: style.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              opacity: 0,
              transition: 'opacity 0.15s',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}
            className="group-hover:!opacity-100"
          >
            {data.expanding ? <Loader2 style={{ width: 10, height: 10 }} className="animate-spin" /> : '+'}
          </button>
        )}
      </div>

      {/* Source handles */}
      <Handle type="source" position={Position.Bottom} id="bottom"
        style={{ width: 6, height: 6, background: style.handleColor, border: `2px solid ${style.bg}`, minWidth: 0, minHeight: 0 }}
      />
      <Handle type="source" position={Position.Left} id="left-source"
        style={{ width: 6, height: 6, background: style.handleColor, border: `2px solid ${style.bg}`, minWidth: 0, minHeight: 0 }}
      />
      <Handle type="source" position={Position.Right} id="right"
        style={{ width: 6, height: 6, background: style.handleColor, border: `2px solid ${style.bg}`, minWidth: 0, minHeight: 0 }}
      />
    </div>
  );
}

export default memo(MapNodeComponent);
