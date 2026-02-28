"use client";

import * as React from "react";
import {
  FileText,
  Brain,
  Trash2,
  Loader2,
  Send,
  MessageSquare,
  Info,
  Quote,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import dynamic from "next/dynamic";
import { StatusBadge } from "./status-badge";
import { useDocumentDetails } from "@/hooks/use-document-details";
import { useDocumentChat, type ChatMessage } from "@/hooks/use-document-chat";
import { useDocumentFile } from "@/hooks/use-document-file";
import { TextViewer } from "./text-viewer";
import type { BackboardStatus } from "@/lib/types/database";

const PdfViewer = dynamic(
  () => import("./pdf-viewer").then((mod) => mod.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="text-sm text-muted-foreground text-center py-8">
        Loading PDF viewer...
      </div>
    ),
  }
);

// ─── Props ──────────────────────────────────────────────────────────────────

interface DocumentDetailModalProps {
  documentId: string | null;
  onClose: () => void;
  onDeleted: (documentId: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  return n.toLocaleString();
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{children}</span>
    </div>
  );
}

/**
 * Parse assistant content to separate regular text from «quote»...«/quote» blocks.
 * Returns an array of segments: { type: 'text' | 'quote', content: string }
 */
function parseContent(
  raw: string
): { type: "text" | "quote"; content: string }[] {
  const segments: { type: "text" | "quote"; content: string }[] = [];
  const regex = /«quote»([\s\S]*?)«\/quote»/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: raw.slice(lastIndex, match.index),
      });
    }
    segments.push({ type: "quote", content: match[1].trim() });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: "text", content: raw.slice(lastIndex) });
  }

  return segments;
}

// ─── Document Viewer (Left Pane) ────────────────────────────────────────────

function DocumentViewer({
  filename,
  mimeType,
  fileUrl,
  fileLoading,
}: {
  filename: string;
  mimeType: string | null;
  fileUrl: string | null;
  fileLoading: boolean;
}) {
  if (fileLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Loading preview...</span>
      </div>
    );
  }

  if (fileUrl && mimeType?.startsWith("application/pdf")) {
    return <PdfViewer url={fileUrl} />;
  }

  if (fileUrl && mimeType?.startsWith("text/")) {
    return <TextViewer url={fileUrl} />;
  }

  // Placeholder when no file URL is available
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
      <div className="p-5 bg-muted/50 rounded-2xl">
        <FileText className="w-10 h-10 text-muted-foreground/50" />
      </div>
      <div>
        <p className="font-medium text-sm text-foreground/80 mb-1">
          {filename}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
          Document preview will be available once file storage is configured.
        </p>
      </div>
    </div>
  );
}

// ─── Chat Message Bubble ────────────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const segments = isUser
    ? [{ type: "text" as const, content: message.content }]
    : parseContent(message.content);

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted/60 text-foreground rounded-bl-md"
        }`}
      >
        {segments.map((seg, i) =>
          seg.type === "quote" ? (
            <blockquote
              key={i}
              className="border-l-2 border-primary/50 pl-3 my-2 text-sm bg-primary/5 rounded-r-lg py-2 pr-3 italic cursor-pointer hover:bg-primary/10 transition-colors flex items-start gap-2"
            >
              <Quote className="w-3 h-3 mt-0.5 shrink-0 text-primary/60" />
              <span>{seg.content}</span>
            </blockquote>
          ) : (
            <span key={i}>{seg.content}</span>
          )
        )}
      </div>
    </div>
  );
}

// ─── Chat Tab Content ───────────────────────────────────────────────────────

function ChatSection({
  documentId,
  backboardStatus,
}: {
  documentId: string;
  backboardStatus: BackboardStatus;
}) {
  const { messages, sending, error, sendMessage, reset } = useDocumentChat();
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset chat state when documentId changes
  React.useEffect(() => {
    reset();
  }, [documentId, reset]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput("");
    await sendMessage(documentId, trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isIndexed = backboardStatus === "indexed";

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="p-3 bg-muted/50 rounded-xl">
              <MessageSquare className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Ask about this document
              </p>
              <p className="text-xs text-muted-foreground/70 max-w-[220px]">
                {isIndexed
                  ? "Ask a question and get answers grounded in the document content."
                  : "Chat will be available once the document is indexed."}
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {sending && (
          <div className="flex justify-start mb-3">
            <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border/50 p-3 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isIndexed
              ? "Ask a question..."
              : "Waiting for indexing..."
          }
          disabled={!isIndexed || sending}
          className="rounded-xl h-9 text-sm"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || !isIndexed || sending}
          className="rounded-xl h-9 w-9 shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Modal ─────────────────────────────────────────────────────────────

export function DocumentDetailModal({
  documentId,
  onClose,
  onDeleted,
}: DocumentDetailModalProps) {
  const {
    details,
    loading,
    error,
    fetchDetails,
    deleteDocument,
    deleting,
    reset: resetDetails,
  } = useDocumentDetails();

  const { file, loading: fileLoading } = useDocumentFile(documentId);

  const isOpen = documentId !== null;

  // Fetch details when modal opens
  React.useEffect(() => {
    if (documentId) {
      fetchDetails(documentId);
    }
  }, [documentId, fetchDetails]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      resetDetails();
    }
  };

  const handleDelete = async () => {
    if (!documentId) return;
    const success = await deleteDocument(documentId);
    if (success) {
      onDeleted(documentId);
      onClose();
      resetDetails();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-6xl w-[95vw] h-[85vh] p-0 gap-0 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border/50 shrink-0">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-semibold truncate">
              {loading
                ? "Loading..."
                : details?.original_filename ?? "Document"}
            </DialogTitle>
            {details && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {details.file_size
                  ? `${(details.file_size / 1024).toFixed(1)} KB`
                  : ""}
                {details.clients ? ` \u00B7 ${details.clients.name}` : ""}
                {details.matters ? ` / ${details.matters.name}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Body: Two panes */}
        <div className="flex flex-1 min-h-0">
          {/* Left Pane: Document Viewer */}
          <div className="w-[55%] border-r border-border/50 overflow-y-auto bg-muted/20 p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => documentId && fetchDetails(documentId)}
                  className="rounded-xl"
                >
                  Retry
                </Button>
              </div>
            ) : details ? (
              <DocumentViewer
                filename={details.original_filename}
                mimeType={details.mime_type}
                fileUrl={file?.url ?? null}
                fileLoading={fileLoading}
              />
            ) : null}
          </div>

          {/* Right Pane: Tabs (Details / Chat) */}
          <div className="w-[45%] flex flex-col min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">
                  Failed to load details
                </p>
              </div>
            ) : details ? (
              <Tabs defaultValue="details" className="flex flex-col h-full">
                <div className="px-4 pt-4 shrink-0">
                  <TabsList className="w-full">
                    <TabsTrigger value="details" className="flex-1 gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="flex-1 gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Details Tab */}
                <TabsContent
                  value="details"
                  className="flex-1 overflow-y-auto px-5 py-4"
                >
                  <div className="flex flex-col gap-6">
                    {/* AI Memory Section */}
                    {details.backboard_details && (
                      <div className="flex flex-col gap-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                          <Brain className="w-4 h-4" />
                          AI Memory
                        </h4>

                        {details.backboard_details.summary ? (
                          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                            {details.backboard_details.summary}
                          </p>
                        ) : details.backboard_status === "processing" ? (
                          <p className="text-xs text-muted-foreground italic bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
                            This document is still being indexed. Summary will
                            appear once processing is complete.
                          </p>
                        ) : null}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-muted/30 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold">
                              {formatNumber(
                                details.backboard_details.chunk_count
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Chunks
                            </p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold">
                              {formatNumber(
                                details.backboard_details.total_tokens
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Tokens
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Metadata Section */}
                    <div className="flex flex-col gap-3">
                      <h4 className="text-sm font-semibold text-foreground/80">
                        Metadata
                      </h4>
                      <div className="flex flex-col gap-3 text-sm">
                        <DetailRow label="Status">
                          <StatusBadge status={details.backboard_status} />
                        </DetailRow>
                        <DetailRow label="Type">
                          <Badge
                            variant="secondary"
                            className="capitalize rounded-lg text-xs"
                          >
                            {details.doc_type}
                          </Badge>
                        </DetailRow>
                        {details.clients && (
                          <DetailRow label="Client">
                            {details.clients.name}
                          </DetailRow>
                        )}
                        {details.matters && (
                          <DetailRow label="Matter">
                            {details.matters.name}
                          </DetailRow>
                        )}
                        {details.mime_type && (
                          <DetailRow label="Format">
                            {details.mime_type}
                          </DetailRow>
                        )}
                        <DetailRow label="Uploaded">
                          {new Date(details.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </DetailRow>
                        {details.is_raw_text && (
                          <DetailRow label="Source">Pasted Text</DetailRow>
                        )}
                      </div>
                    </div>

                    {/* Delete Action */}
                    <div className="pt-2 border-t border-border/50">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-destructive hover:text-destructive hover:bg-destructive/5 rounded-xl"
                            disabled={deleting}
                          >
                            {deleting ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Delete Document
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete this document?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove &ldquo;
                              {details.original_filename}&rdquo; from the
                              library and AI memory. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={handleDelete}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </TabsContent>

                {/* Chat Tab */}
                <TabsContent
                  value="chat"
                  className="flex-1 min-h-0 overflow-hidden"
                >
                  <ChatSection
                    documentId={details.id}
                    backboardStatus={details.backboard_status}
                  />
                </TabsContent>
              </Tabs>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
