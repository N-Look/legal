'use client';

import { useReactFlow } from '@xyflow/react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface MapToolbarProps {
  onResetLayout: () => void;
}

export function MapToolbar({ onResetLayout }: MapToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 rounded-full px-1.5 py-1"
      style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <ToolbarButton onClick={() => zoomIn({ duration: 200 })} title="Zoom in">
        <ZoomIn className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => zoomOut({ duration: 200 })} title="Zoom out">
        <ZoomOut className="w-3.5 h-3.5" />
      </ToolbarButton>
      <div style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.06)', margin: '0 2px' }} />
      <ToolbarButton onClick={() => fitView({ duration: 300, padding: 0.15 })} title="Fit to view">
        <Maximize2 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={onResetLayout} title="Reset layout">
        <RotateCcw className="w-3.5 h-3.5" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 text-gray-400 hover:text-gray-700 hover:bg-black/5"
    >
      {children}
    </button>
  );
}
