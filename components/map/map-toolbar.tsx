'use client';

import { useReactFlow } from '@xyflow/react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface MapToolbarProps {
  onResetLayout: () => void;
}

export function MapToolbar({ onResetLayout }: MapToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-2 py-1.5 shadow-2xl">
      <ToolbarButton onClick={() => zoomIn({ duration: 200 })} title="Zoom in">
        <ZoomIn className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => zoomOut({ duration: 200 })} title="Zoom out">
        <ZoomOut className="w-4 h-4" />
      </ToolbarButton>
      <div className="w-px h-5 bg-white/10 mx-1" />
      <ToolbarButton onClick={() => fitView({ duration: 300, padding: 0.15 })} title="Fit to view">
        <Maximize2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={onResetLayout} title="Reset layout">
        <RotateCcw className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
    >
      {children}
    </button>
  );
}
