"use client";

import { X, FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { PdfViewer } from "./pdf-viewer";
import { TextViewer } from "./text-viewer";
import { useDocumentFile } from "@/hooks/use-document-file";
import type { Document } from "@/lib/types/database";

interface DocumentPreviewProps {
  document: (Document & { clients?: { name: string }; matters?: { name: string } | null }) | null;
  onClose: () => void;
}

export function DocumentPreview({ document, onClose }: DocumentPreviewProps) {
  const { file, loading: fileLoading, error: fileError } = useDocumentFile(document?.id ?? null);

  if (!document) return null;

  const isPdf = document.mime_type === "application/pdf";
  const isText = document.mime_type === "text/plain";
  const hasPreview = isPdf || isText;

  return (
    <div className="border-l border-border/50 bg-background flex flex-col w-[360px] shrink-0 h-full">
      {/* Pinned header */}
      <div className="flex items-center justify-between p-6 pb-0 shrink-0">
        <h3 className="font-semibold text-sm">Document Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{document.original_filename}</p>
            <p className="text-xs text-muted-foreground">
              {document.file_size ? `${(document.file_size / 1024).toFixed(1)} KB` : "Unknown size"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          <DetailRow label="Status">
            <StatusBadge status={document.backboard_status} />
          </DetailRow>
          <DetailRow label="Type">
            <Badge variant="secondary" className="capitalize rounded-lg text-xs">
              {document.doc_type}
            </Badge>
          </DetailRow>
          {document.clients && (
            <DetailRow label="Client">{document.clients.name}</DetailRow>
          )}
          {document.matters && (
            <DetailRow label="Matter">{document.matters.name}</DetailRow>
          )}
          {document.mime_type && (
            <DetailRow label="Format">{document.mime_type}</DetailRow>
          )}
          <DetailRow label="Uploaded">
            {new Date(document.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </DetailRow>
          {document.is_raw_text && (
            <DetailRow label="Source">Pasted Text</DetailRow>
          )}
        </div>

        {/* Download button */}
        {file?.url && (
          <a href={file.url} download={file.filename} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </a>
        )}

        {/* Document viewer */}
        {fileLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm">Loading file...</span>
          </div>
        )}

        {fileError && (
          <div className="text-sm text-muted-foreground text-center py-8">
            {document.storage_path === null
              ? "No file stored — uploaded before file preview was available."
              : fileError}
          </div>
        )}

        {file?.url && !fileLoading && (
          <>
            {isPdf && <PdfViewer url={file.url} />}
            {isText && <TextViewer url={file.url} />}
            {!hasPreview && (
              <div className="text-sm text-muted-foreground text-center py-8">
                Preview not available for this file type.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{children}</span>
    </div>
  );
}
