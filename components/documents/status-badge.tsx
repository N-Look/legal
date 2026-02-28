"use client";

import { Badge } from "@/components/ui/badge";
import type { BackboardStatus } from "@/lib/types/database";

const statusConfig: Record<BackboardStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  uploading: { label: "Uploading", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  processing: { label: "Processing", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  indexed: { label: "Indexed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  error: { label: "Error", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function StatusBadge({ status }: { status: BackboardStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={`text-xs font-medium border-0 ${config.className}`}>
      {status === "processing" && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1.5" />
      )}
      {config.label}
    </Badge>
  );
}
