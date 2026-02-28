"use client";

import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { PinToggle } from "./pin-toggle";
import type { Document } from "@/lib/types/database";

interface DocumentRowProps {
  document: Document & { clients?: { name: string }; matters?: { name: string } | null };
  onPin: (id: string, pinned: boolean) => void;
  onSelect: (doc: Document) => void;
}

export function DocumentRow({ document, onPin, onSelect }: DocumentRowProps) {
  const timeAgo = getTimeAgo(document.created_at);

  return (
    <div
      onClick={() => onSelect(document)}
      className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/30 cursor-pointer transition-colors group border border-transparent hover:border-border/40"
    >
      <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
        <FileText className="w-5 h-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{document.original_filename}</p>
        <div className="flex items-center gap-2 mt-1">
          {document.clients && (
            <span className="text-xs text-muted-foreground">{document.clients.name}</span>
          )}
          {document.matters && (
            <>
              <span className="text-xs text-muted-foreground/50">/</span>
              <span className="text-xs text-muted-foreground">{document.matters.name}</span>
            </>
          )}
        </div>
      </div>

      <Badge variant="secondary" className="text-xs shrink-0 rounded-lg capitalize">
        {document.doc_type}
      </Badge>

      <StatusBadge status={document.backboard_status} />

      <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">{timeAgo}</span>

      <div onClick={(e) => e.stopPropagation()}>
        <PinToggle
          pinned={document.pinned_to_matter}
          onToggle={() => onPin(document.id, !document.pinned_to_matter)}
        />
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
