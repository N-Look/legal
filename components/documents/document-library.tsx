"use client";

import * as React from "react";
import {
  Search,
  Filter,
  Loader2,
  ArrowLeft,
  FileText,
  Send,
  Bot,
  Brain,
  Calendar,
  User,
  Briefcase,
  Tag,
  Upload,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DocumentRow } from "./document-row";
import { StatusBadge } from "./status-badge";
import { useDocuments } from "@/hooks/use-documents";
import { useClients } from "@/hooks/use-clients-matters";
import type { Document, DocType } from "@/lib/types/database";
import Link from "next/link";

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "brief", label: "Brief" },
  { value: "transcript", label: "Transcript" },
  { value: "exhibit", label: "Exhibit" },
  { value: "discovery", label: "Discovery" },
  { value: "memo", label: "Memo" },
  { value: "other", label: "Other" },
];

interface MemoryInfo {
  summary: string | null;
  chunk_count: number | null;
  total_tokens: number | null;
  file_size_bytes: number | null;
  status: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function formatNumber(n: number | null): string {
  if (n == null) return "\u2014";
  return n.toLocaleString();
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentLibrary() {
  const [search, setSearch] = React.useState("");
  const [clientFilter, setClientFilter] = React.useState<string>("");
  const [docTypeFilter, setDocTypeFilter] = React.useState<string>("");
  const [selectedDoc, setSelectedDoc] = React.useState<
    (Document & { clients?: { name: string }; matters?: { name: string } | null }) | null
  >(null);

  // Document detail state
  const [memory, setMemory] = React.useState<MemoryInfo | null>(null);
  const [memoryLoading, setMemoryLoading] = React.useState(false);

  // Chat state
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [chatLoading, setChatLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const { clients } = useClients();
  const { documents, loading, refetch, togglePin } = useDocuments({
    clientId: clientFilter || undefined,
    docType: (docTypeFilter as DocType) || undefined,
    search: search || undefined,
  });

  // Fetch memory info when a document is selected
  const prevDocId = React.useRef<string | null>(null);
  React.useEffect(() => {
    const nextId = selectedDoc?.id ?? null;
    if (nextId !== prevDocId.current) {
      prevDocId.current = nextId;
      setMemory(null);

      if (nextId) {
        setMemoryLoading(true);
        fetch(`/api/documents/${nextId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.memory) setMemory(data.memory);
          })
          .catch(() => {})
          .finally(() => setMemoryLoading(false));
      }
    }
  }, [selectedDoc?.id]);

  // Auto-scroll chat
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          threadId,
          assistantId: selectedDoc?.backboard_assistant_id ?? null,
          documentContext: selectedDoc
            ? {
                name: selectedDoc.original_filename,
                type: selectedDoc.doc_type,
                client: selectedDoc.clients?.name,
                matter: selectedDoc.matters?.name,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      setThreadId(data.threadId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer ?? "No response received." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSelectDoc = (doc: Document) => {
    setSelectedDoc(
      doc as Document & { clients?: { name: string }; matters?: { name: string } | null }
    );
  };

  const handleBack = () => {
    setSelectedDoc(null);
  };

  return (
    <div className="flex -m-8 h-[calc(100%+4rem)]">
      {/* ── Left Panel ── */}
      <div className="w-[340px] shrink-0 border-r border-border/50 bg-background flex flex-col">
        {selectedDoc ? (
          /* ── Document Detail View ── */
          <SelectedDocPanel
            document={selectedDoc}
            memory={memory}
            memoryLoading={memoryLoading}
            onBack={handleBack}
          />
        ) : (
          /* ── Document List View ── */
          <>
            <div className="p-5 border-b border-border/50 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">Documents</h2>
                <Button asChild size="sm" variant="outline" className="rounded-xl h-8 text-xs gap-1.5">
                  <Link href="/dashboard/upload">
                    <Upload className="w-3 h-3" />
                    Upload
                  </Link>
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl h-9 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="flex-1 rounded-xl h-8 text-xs">
                    <Filter className="w-3 h-3 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                  <SelectTrigger className="flex-1 rounded-xl h-8 text-xs">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {DOC_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(clientFilter || docTypeFilter || search) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setClientFilter("");
                      setDocTypeFilter("");
                      setSearch("");
                    }}
                    className="rounded-xl text-xs h-8 px-2 text-muted-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <FileText className="w-8 h-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    No documents found
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Upload documents to get started.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col py-1">
                  {documents.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      document={
                        doc as Document & {
                          clients?: { name: string };
                          matters?: { name: string } | null;
                        }
                      }
                      isSelected={false}
                      onPin={togglePin}
                      onSelect={handleSelectDoc}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA] dark:bg-background/95">
        {/* Chat header */}
        <div className="px-5 py-3 border-b border-border/50 bg-background/80 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">Document Assistant</span>
          </div>

          {selectedDoc && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 rounded-lg">
              <FileText className="w-3 h-3 text-primary/60 shrink-0" />
              <span className="text-xs text-primary/80 font-medium truncate max-w-[200px]">
                {selectedDoc.original_filename}
              </span>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-primary/40 hover:text-primary/70 transition-colors ml-0.5 text-[10px]"
              >
                clear
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3 min-h-0"
        >
          {messages.length === 0 && !chatLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <div className="p-3 bg-muted rounded-2xl">
                <Bot className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {selectedDoc
                    ? `Ask about ${selectedDoc.original_filename}`
                    : "Ask about your documents"}
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1 max-w-sm">
                  {selectedDoc
                    ? "Answers are grounded in the document\u2019s indexed content."
                    : "Select a document from the sidebar, or ask across all documents."}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-background border border-border/50 text-foreground rounded-bl-sm shadow-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-background border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-5 py-3 border-t border-border/50 bg-background/80 shrink-0">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedDoc
                  ? `Ask about ${selectedDoc.original_filename}...`
                  : "Ask about your documents..."
              }
              className="min-h-[40px] max-h-[100px] rounded-xl resize-none text-sm flex-1"
              rows={1}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || chatLoading}
              className="h-10 w-10 rounded-xl shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Selected Document Info Panel (left sidebar) ─── */
function SelectedDocPanel({
  document,
  memory,
  memoryLoading,
  onBack,
}: {
  document: Document & { clients?: { name: string }; matters?: { name: string } | null };
  memory: MemoryInfo | null;
  memoryLoading: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-5 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors border-b border-border/50 shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
        All Documents
      </button>

      {/* Document info */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* File header */}
        <div className="flex items-start gap-3">
          <div className="p-3 bg-primary/10 rounded-xl shrink-0">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-snug break-words">
              {document.original_filename}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={document.backboard_status} />
              <Badge variant="secondary" className="capitalize rounded-lg text-[10px] px-1.5 py-0">
                {document.doc_type}
              </Badge>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Details
          </h3>
          <div className="space-y-2.5">
            {document.clients && (
              <InfoRow icon={User} label="Client" value={document.clients.name} />
            )}
            {document.matters && (
              <InfoRow icon={Briefcase} label="Matter" value={document.matters.name} />
            )}
            <InfoRow
              icon={Calendar}
              label="Uploaded"
              value={new Date(document.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            />
            <InfoRow
              icon={Tag}
              label="Size"
              value={
                document.file_size
                  ? formatFileSize(document.file_size)
                  : memory?.file_size_bytes
                  ? formatFileSize(memory.file_size_bytes)
                  : "\u2014"
              }
            />
          </div>
        </div>

        {/* AI Memory Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Brain className="w-3 h-3" />
            AI Memory
          </h3>

          {memoryLoading ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : memory ? (
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="bg-muted/40 rounded-xl px-4 py-3 flex-1 text-center">
                  <span className="text-xl font-bold leading-none block">
                    {formatNumber(memory.chunk_count)}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Chunks
                  </span>
                </div>
                <div className="bg-muted/40 rounded-xl px-4 py-3 flex-1 text-center">
                  <span className="text-xl font-bold leading-none block">
                    {formatNumber(memory.total_tokens)}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Tokens
                  </span>
                </div>
              </div>

              {memory.summary && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">
                    Summary
                  </h4>
                  <p className="text-xs text-foreground/80 leading-relaxed bg-muted/30 rounded-xl p-3">
                    {memory.summary}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 py-2">
              No memory data available for this document.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-medium text-right truncate max-w-[160px]">
        {value}
      </span>
    </div>
  );
}
