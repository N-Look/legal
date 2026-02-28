"use client";

import { CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UploadPhase } from "@/lib/types/documents";

const phaseLabels: Record<UploadPhase, string> = {
  idle: "",
  validating: "Validating...",
  uploading: "Uploading document...",
  processing: "Processing & indexing...",
  complete: "Upload complete!",
  error: "Upload failed",
};

interface UploadProgressProps {
  phase: UploadPhase;
  progress: number;
  error: string | null;
  onReset: () => void;
}

export function UploadProgress({ phase, progress, error, onReset }: UploadProgressProps) {
  if (phase === "idle") return null;

  // "complete" with an info message means "uploaded but still indexing"
  const isStillIndexing = phase === "complete" && progress < 100 && error;

  return (
    <div className="flex flex-col gap-4 p-6 border border-border/60 rounded-2xl bg-background">
      <div className="flex items-center gap-3">
        {isStillIndexing ? (
          <Clock className="w-5 h-5 text-amber-500" />
        ) : phase === "complete" ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        ) : phase === "error" ? (
          <AlertCircle className="w-5 h-5 text-destructive" />
        ) : (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        )}
        <span className="font-medium text-sm">
          {isStillIndexing ? "Document uploaded" : phaseLabels[phase]}
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            phase === "error" ? "bg-destructive"
              : isStillIndexing ? "bg-amber-500"
              : phase === "complete" ? "bg-emerald-500"
              : "bg-primary"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {error && (
        <p className={`text-sm ${isStillIndexing ? "text-muted-foreground" : "text-destructive"}`}>
          {error}
        </p>
      )}

      {(phase === "complete" || phase === "error") && (
        <Button variant="outline" onClick={onReset} className="w-fit rounded-xl">
          Upload Another
        </Button>
      )}
    </div>
  );
}
