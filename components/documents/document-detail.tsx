"use client";

import * as React from "react";
import {
  X,
  FileText,
  Send,
  Bot,
  Loader2,
  Brain,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Briefcase,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "./status-badge";
import type { Document } from "@/lib/types/database";

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

interface DocumentDetailProps {
  document:
    | (Document & {
        clients?: { name: string };
        matters?: { name: string } | null;
      })
    | null;
  onClose: () => void;
}

function formatNumber(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentDetail({ document, onClose }: DocumentDetailProps) {
  const [memory, setMemory] = React.useState<MemoryInfo | null>(null);
  const [memoryLoading, setMemoryLoading] = React.useState(false);
  const [summaryExpanded, setSummaryExpanded] = React.useState(false);
  const [infoCollapsed, setInfoCollapsed] = React.useState(false);

  // Chat state
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Fetch document details with memory info when document changes
  const prevDocId = React.useRef<string | null>(null);
  React.useEffect(() => {
    const nextId = document?.id ?? null;
    if (nextId !== prevDocId.current) {
      prevDocId.current = nextId;
      setThreadId(null);
      setMessages([]);
      setMemory(null);
      setSummaryExpanded(false);
      setInfoCollapsed(false);

      if (nextId) {
        setMemoryLoading(true);
        fetch(`/api/documents/${nextId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.memory) {
              setMemory(data.memory);
            }
          })
          .catch(() => {})
          .finally(() => setMemoryLoading(false));
      }
    }
  }, [document?.id]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          threadId,
          assistantId: document?.backboard_assistant_id ?? null,
          documentContext: document
            ? {
                name: document.original_filename,
                type: document.doc_type,
                client: document.clients?.name,
                matter: document.matters?.name,
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
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!document) {
    return (
      <div className="border-l border-border/50 bg-background flex flex-col w-[400px] shrink-0">
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-6">
          <div className="p-4 bg-muted rounded-2xl">
            <FileText className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Select a document
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              Click a document to view its details and chat about it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-l border-border/50 bg-background flex flex-col w-[400px] shrink-0">
      {/* Document Header */}
      <div className="p-4 border-b border-border/50 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {document.original_filename}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={document.backboard_status} />
                <Badge
                  variant="secondary"
                  className="capitalize rounded-lg text-[10px] px-1.5 py-0"
                >
                  {document.doc_type}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 rounded-full shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Document Info Section (collapsible) */}
      <div className="border-b border-border/50 shrink-0">
        <button
          onClick={() => setInfoCollapsed(!infoCollapsed)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Document Info</span>
          {infoCollapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>

        {!infoCollapsed && (
          <div className="px-4 pb-3 flex flex-col gap-2.5">
            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-2">
              {document.clients && (
                <InfoItem icon={User} label="Client" value={document.clients.name} />
              )}
              {document.matters && (
                <InfoItem icon={Briefcase} label="Matter" value={document.matters.name} />
              )}
              <InfoItem
                icon={Calendar}
                label="Uploaded"
                value={new Date(document.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              />
              <InfoItem
                icon={Tag}
                label="Size"
                value={
                  document.file_size
                    ? formatFileSize(document.file_size)
                    : memory?.file_size_bytes
                    ? formatFileSize(memory.file_size_bytes)
                    : "—"
                }
              />
            </div>

            {/* Memory stats */}
            {memoryLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Loading memory details...
                </span>
              </div>
            ) : memory ? (
              <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Brain className="w-3 h-3 text-primary/60" />
                  <span className="text-[11px] font-medium text-primary/80 uppercase tracking-wider">
                    AI Memory
                  </span>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="text-lg font-bold leading-none">
                      {formatNumber(memory.chunk_count)}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Chunks
                    </p>
                  </div>
                  <div>
                    <span className="text-lg font-bold leading-none">
                      {formatNumber(memory.total_tokens)}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Tokens
                    </p>
                  </div>
                </div>

                {memory.summary && (
                  <div>
                    <button
                      onClick={() => setSummaryExpanded(!summaryExpanded)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {summaryExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      Summary
                    </button>
                    {summaryExpanded && (
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed bg-background rounded-lg p-2.5">
                        {memory.summary}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Chat Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat header */}
        <div className="px-4 py-2.5 flex items-center gap-2 shrink-0">
          <div className="p-1 bg-primary/10 rounded-md">
            <Bot className="w-3 h-3 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Chat about this document
          </span>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 pb-2 flex flex-col gap-3 min-h-0"
        >
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-6">
              <div className="p-2.5 bg-muted rounded-2xl">
                <Bot className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Ask about {document.original_filename}
                </p>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                  Answers are grounded in the document&apos;s indexed content.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border/50 shrink-0">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${document.original_filename}...`}
              className="min-h-[40px] max-h-[120px] rounded-xl resize-none text-sm"
              rows={1}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="h-10 w-10 rounded-xl shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="w-3 h-3 text-muted-foreground/60 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
        <p className="text-xs font-medium truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}
