"use client";

import * as React from "react";
import { Send, Bot, Loader2, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Document } from "@/lib/types/database";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface LibraryChatProps {
  selectedDoc:
    | (Document & {
        clients?: { name: string };
        matters?: { name: string } | null;
      })
    | null;
  onClearDoc: () => void;
}

export function LibraryChat({ selectedDoc, onClearDoc }: LibraryChatProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Reset thread when selected doc changes so context is fresh
  const prevDocId = React.useRef<string | null>(null);
  React.useEffect(() => {
    const nextId = selectedDoc?.id ?? null;
    if (nextId !== prevDocId.current) {
      prevDocId.current = nextId;
      setThreadId(null);
      setMessages([]);
    }
  }, [selectedDoc?.id]);

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

  return (
    <div className="border-l border-border/50 bg-background flex flex-col w-[360px] shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Bot className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">Document Assistant</h3>
        </div>
        {selectedDoc ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/8 rounded-lg">
            <FileText className="w-3 h-3 text-primary/60 shrink-0" />
            <span className="text-xs text-primary/80 truncate flex-1 font-medium">
              {selectedDoc.original_filename}
            </span>
            <button
              onClick={onClearDoc}
              className="text-primary/40 hover:text-primary/70 transition-colors ml-1 shrink-0"
              aria-label="Clear document focus"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60">
            Click a document to focus the chat on it.
          </p>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0"
      >
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
            <div className="p-3 bg-muted rounded-2xl">
              <Bot className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {selectedDoc ? `Ask about ${selectedDoc.original_filename}` : "Ask about your documents"}
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1">
                {selectedDoc
                  ? "Answers are grounded in the document's indexed content."
                  : "Select a document to focus, or ask a general question."}
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
      <div className="p-3 border-t border-border/50">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedDoc
                ? `Ask about ${selectedDoc.original_filename}…`
                : "Ask about your documents…"
            }
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
        <p className="text-xs text-muted-foreground/40 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
