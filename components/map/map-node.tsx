'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Loader2 } from 'lucide-react';
import type { MapNodeData } from '@/types/argument-map';

const DOT_STYLES: Record<MapNodeData['nodeType'], {
  color: string;
  glow: string;
  ring: string;
}> = {
  claim: { color: '#1e293b', glow: 'rgba(30,41,59,0.25)', ring: 'rgba(30,41,59,0.15)' },
  supporting: { color: '#16a34a', glow: 'rgba(22,163,74,0.3)', ring: 'rgba(22,163,74,0.12)' },
  opposing: { color: '#dc2626', glow: 'rgba(220,38,38,0.3)', ring: 'rgba(220,38,38,0.12)' },
  context: { color: '#d97706', glow: 'rgba(217,119,6,0.3)', ring: 'rgba(217,119,6,0.12)' },
  'sub-argument': { color: '#7c3aed', glow: 'rgba(124,58,237,0.3)', ring: 'rgba(124,58,237,0.12)' },
};

export type MapNodeType = Node<MapNodeData & { onExpand?: (id: string) => void; expanding?: boolean }>;

function MapNodeComponent({ id, data, selected }: NodeProps<MapNodeType>) {
  const style = DOT_STYLES[data.nodeType];
  const isClaim = data.nodeType === 'claim';
  const dotSize = isClaim ? 20 : 12;
  const ringSize = isClaim ? 32 : 22;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ animation: 'nodeAppear 0.4s ease-out both' }}
    >
      {/* Invisible handles — enlarged hit area */}
      <Handle type="target" position={Position.Top} id="top"
        style={{ width: 10, height: 10, background: 'transparent', border: 'none', top: -4 }}
      />
      <Handle type="target" position={Position.Left} id="left"
        style={{ width: 10, height: 10, background: 'transparent', border: 'none', left: -4 }}
      />
      <Handle type="target" position={Position.Right} id="right-target"
        style={{ width: 10, height: 10, background: 'transparent', border: 'none', right: -4 }}
      />

      {/* Outer ring — pulses on select */}
      <div
        style={{
          width: ringSize,
          height: ringSize,
          borderRadius: '50%',
          background: selected ? style.ring : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.3s ease, transform 0.3s ease',
          transform: selected ? 'scale(1.15)' : 'scale(1)',
          cursor: 'pointer',
        }}
      >
        {/* Dot */}
        <div
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: style.color,
            boxShadow: selected
              ? `0 0 12px ${style.glow}, 0 0 24px ${style.glow}`
              : `0 1px 4px ${style.glow}`,
            transition: 'box-shadow 0.3s ease, transform 0.2s ease',
          }}
        />
      </div>

      {/* Label — always visible, larger on hover/select */}
      <div
        className="absolute top-full mt-1.5 whitespace-nowrap pointer-events-none"
        style={{
          maxWidth: selected ? 200 : 140,
          textAlign: 'center',
          transition: 'opacity 0.2s ease, max-width 0.3s ease',
        }}
      >
        <span
          style={{
            fontSize: isClaim ? 11 : 9,
            fontWeight: isClaim ? 700 : 500,
            color: selected ? style.color : '#6b7280',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: selected ? 3 : 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            transition: 'color 0.2s ease',
          }}
        >
          {data.label}
        </span>
      </div>

      {/* Expand button — appears on hover for non-claim nodes */}
      {!isClaim && data.onExpand && (
        <button
          onClick={(e) => { e.stopPropagation(); data.onExpand!(id); }}
          disabled={data.expanding}
          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 pointer-events-auto"
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#ffffff',
            border: `1.5px solid ${style.color}`,
            color: style.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            transition: 'opacity 0.15s ease',
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          {data.expanding ? <Loader2 style={{ width: 8, height: 8 }} className="animate-spin" /> : '+'}
        </button>
      )}

      {/* Source handles */}
      <Handle type="source" position={Position.Bottom} id="bottom"
        style={{ width: 10, height: 10, background: 'transparent', border: 'none', bottom: -4 }}
      />
      <Handle type="source" position={Position.Left} id="left-source"
        style={{ width: 10, height: 10, background: 'transparent', border: 'none', left: -4 }}
      />
      <Handle type="source" position={Position.Right} id="right"
        style={{ width: 10, height: 10, background: 'transparent', border: 'none', right: -4 }}
      />
    </div>
  );
}

export default memo(MapNodeComponent);
