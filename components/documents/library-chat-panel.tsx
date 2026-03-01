"use client";

import * as React from "react";
import { MessageSquare, Send, Loader2, X, Quote, FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLibraryChatContext } from "@/contexts/library-chat-context";
import type { ChatMessage } from "@/hooks/use-document-chat";

function parseContent(
  raw: string
): { type: "text" | "quote"; content: string }[] {
  const segments: { type: "text" | "quote"; content: string }[] = [];
  const regex = /«quote»([\s\S]*?)«\/quote»/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: raw.slice(lastIndex, match.index) });
    }
    segments.push({ type: "quote", content: match[1].trim() });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: "text", content: raw.slice(lastIndex) });
  }

  return segments;
}

/**
 * Renders text with filenames turned into clickable links.
 * Matches patterns like **filename.ext** or `filename.ext` or just filename.ext
 */
function TextWithDocLinks({
  text,
  documentIds,
  onDocumentSelect,
}: {
  text: string;
  documentIds: Record<string, string>;
  onDocumentSelect?: (docId: string) => void;
}) {
  if (!onDocumentSelect || Object.keys(documentIds).length === 0) {
    return <>{text}</>;
  }

  // Build regex from known filenames, escaped for regex
  const filenames = Object.keys(documentIds).filter(Boolean);
  if (filenames.length === 0) return <>{text}</>;

  const escaped = filenames.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // Match filenames optionally wrapped in ** or `
  const pattern = new RegExp(
    `(?:\\*\\*|\`)?(${escaped.join("|")})(?:\\*\\*|\`)?`,
    "g"
  );

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(text.slice(lastIdx, m.index));
    }
    const filename = m[1];
    const docId = documentIds[filename];
    parts.push(
      <button
        key={`${m.index}-${filename}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDocumentSelect(docId);
        }}
        className="inline-flex items-center gap-1 text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors font-medium"
      >
        <FileText className="w-3 h-3 inline shrink-0" />
        {filename}
      </button>
    );
    lastIdx = pattern.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return <>{parts}</>;
}

function ChatBubble({
  message,
  documentIds,
  onDocumentSelect,
}: {
  message: ChatMessage;
  documentIds: Record<string, string>;
  onDocumentSelect?: (docId: string) => void;
}) {
  const isUser = message.role === "user";
  const segments = isUser
    ? [{ type: "text" as const, content: message.content }]
    : parseContent(message.content);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
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
              className="border-l-2 border-primary/50 pl-3 my-2 text-sm bg-primary/5 rounded-r-lg py-2 pr-3 italic flex items-start gap-2"
            >
              <Quote className="w-3 h-3 mt-0.5 shrink-0 text-primary/60" />
              <span>{seg.content}</span>
            </blockquote>
          ) : (
            <span key={i}>
              <TextWithDocLinks
                text={seg.content}
                documentIds={documentIds}
                onDocumentSelect={onDocumentSelect}
              />
            </span>
          )
        )}
      </div>
    </div>
  );
}

interface LibraryChatPanelProps {
  open: boolean;
  onClose: () => void;
  onDocumentSelect?: (docId: string) => void;
}

export function LibraryChatPanel({ open, onClose, onDocumentSelect }: LibraryChatPanelProps) {
  const { messages, sending, error, documentIds, sendMessage, reset } = useLibraryChatContext();
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput("");
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <div className="w-[380px] shrink-0 border-l border-border/50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Search All Documents</h3>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg text-xs text-muted-foreground gap-1.5"
              onClick={reset}
            >
              <RotateCcw className="w-3 h-3" />
              New
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="p-3 bg-muted/50 rounded-xl">
              <MessageSquare className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Search across all documents
              </p>
              <p className="text-xs text-muted-foreground/70 max-w-[220px]">
                Ask a question and get answers from all your uploaded documents.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg: ChatMessage) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            documentIds={documentIds}
            onDocumentSelect={onDocumentSelect}
          />
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

      {/* Input */}
      <div className="border-t border-border/50 p-3 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask across all documents..."
          disabled={sending}
          className="rounded-xl h-9 text-sm"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="rounded-xl h-9 w-9 shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
