'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Loader2 } from 'lucide-react';
import type { MapNodeData } from '@/types/argument-map';

const DOT_STYLES: Record<MapNodeData['nodeType'], { dot: string; glow: string; label: string; ring: string }> = {
  claim: {
    dot: 'bg-white',
    glow: 'shadow-[0_0_24px_rgba(255,255,255,0.4)]',
    label: 'text-white/90',
    ring: 'ring-white/20',
  },
  supporting: {
    dot: 'bg-emerald-400',
    glow: 'shadow-[0_0_16px_rgba(52,211,153,0.5)]',
    label: 'text-emerald-300/80',
    ring: 'ring-emerald-400/30',
  },
  opposing: {
    dot: 'bg-red-400',
    glow: 'shadow-[0_0_16px_rgba(248,113,113,0.5)]',
    label: 'text-red-300/80',
    ring: 'ring-red-400/30',
  },
  context: {
    dot: 'bg-blue-400',
    glow: 'shadow-[0_0_16px_rgba(96,165,250,0.5)]',
    label: 'text-blue-300/80',
    ring: 'ring-blue-400/30',
  },
  'sub-argument': {
    dot: 'bg-violet-400',
    glow: 'shadow-[0_0_16px_rgba(167,139,250,0.5)]',
    label: 'text-violet-300/80',
    ring: 'ring-violet-400/30',
  },
};

const TYPE_TAG: Record<MapNodeData['nodeType'], string> = {
  claim: '',
  supporting: 'SUPPORTS',
  opposing: 'OPPOSES',
  context: 'CONTEXT',
  'sub-argument': 'SUB-ARG',
};

export type MapNodeType = Node<MapNodeData & { onExpand?: (id: string) => void; expanding?: boolean }>;

function MapNodeComponent({ id, data, selected }: NodeProps<MapNodeType>) {
  const style = DOT_STYLES[data.nodeType];
  const isClaim = data.nodeType === 'claim';

  return (
    <div className="flex flex-col items-center group">
      {/* Target handle (invisible) */}
      {!isClaim && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-0 !h-0 !bg-transparent !border-0 !min-w-0 !min-h-0"
        />
      )}

      {/* The dot */}
      <div className="relative">
        {/* Outer glow ring on hover / selected */}
        <div
          className={`
            absolute inset-0 rounded-full transition-all duration-500
            ${selected ? `scale-[2.2] opacity-100 ${style.dot} blur-md` : 'scale-100 opacity-0'}
          `}
          style={{ zIndex: -1 }}
        />

        <div
          className={`
            rounded-full transition-all duration-300 cursor-pointer relative
            ${style.dot}
            ${isClaim ? 'w-16 h-16' : selected ? 'w-10 h-10' : 'w-7 h-7'}
            ${selected ? `ring-3 ${style.ring} ${style.glow}` : `hover:scale-125 hover:${style.glow}`}
          `}
        >
          {/* Inner pulsing core for claim */}
          {isClaim && (
            <>
              <div className="absolute inset-1 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-3 rounded-full bg-white/40" />
            </>
          )}

          {/* Confidence arc */}
          {!isClaim && data.confidence != null && selected && (
            <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90" viewBox="0 0 40 40">
              <circle
                cx="20" cy="20" r="18"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeDasharray={`${data.confidence * 113} 113`}
                strokeLinecap="round"
                className="opacity-40"
              />
            </svg>
          )}
        </div>

        {/* Expand + button */}
        {!isClaim && data.onExpand && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onExpand!(id);
            }}
            disabled={data.expanding}
            className="
              absolute -right-2 -top-2
              opacity-0 group-hover:opacity-100 transition-all duration-200
              w-5 h-5 rounded-full bg-white/90 shadow-lg
              flex items-center justify-center text-[10px] text-black font-bold
              hover:scale-125 hover:bg-white
              disabled:opacity-50
            "
          >
            {data.expanding ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              '+'
            )}
          </button>
        )}
      </div>

      {/* Label underneath */}
      <div className={`mt-2.5 text-center transition-all duration-300 ${selected ? 'max-w-[200px]' : 'max-w-[130px]'}`}>
        {/* Type tag */}
        {!isClaim && TYPE_TAG[data.nodeType] && (
          <span className={`text-[7px] font-bold uppercase tracking-[0.15em] block mb-0.5 ${style.label} opacity-60`}>
            {TYPE_TAG[data.nodeType]}
          </span>
        )}
        {/* Title */}
        <p className={`
          leading-tight font-medium
          ${isClaim ? 'text-[11px] text-white/80 max-w-[220px]' : 'text-[9px] text-white/50'}
          ${selected ? 'text-white/90 text-[10px]' : ''}
          line-clamp-2
        `}>
          {data.label}
        </p>
        {/* Document source — shown when selected */}
        {selected && data.documentName && (
          <p className="text-[8px] text-white/30 mt-0.5 truncate">
            {data.documentName}
          </p>
        )}
      </div>

      {/* Source handle (invisible) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-0 !h-0 !bg-transparent !border-0 !min-w-0 !min-h-0"
      />
    </div>
  );
}

export default memo(MapNodeComponent);
