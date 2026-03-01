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
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full px-2 py-1.5 shadow-lg border"
      style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderColor: '#e5e7eb' }}
    >
      <ToolbarButton onClick={() => zoomIn({ duration: 200 })} title="Zoom in">
        <ZoomIn className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => zoomOut({ duration: 200 })} title="Zoom out">
        <ZoomOut className="w-4 h-4" />
      </ToolbarButton>
      <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />
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
      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
      style={{ color: '#6b7280' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#1f2937'; e.currentTarget.style.background = '#f3f4f6'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
