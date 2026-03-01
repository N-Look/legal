"use client";

import { createContext, useContext, useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@/hooks/use-document-chat";

interface LibraryChatContextValue {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  documentIds: Record<string, string>;
  sendMessage: (message: string) => Promise<void>;
  reset: () => void;
}

const LibraryChatContext = createContext<LibraryChatContextValue | null>(null);

export function LibraryChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const threadIdsRef = useRef<Record<string, string>>({});
  const [documentIds, setDocumentIds] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    setSending(true);
    setError(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/library/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, threadIds: threadIdsRef.current }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Chat request failed");
      }

      const data = await res.json();

      if (data.threadIds) {
        threadIdsRef.current = data.threadIds;
      }
      if (data.documentIds) {
        setDocumentIds((prev) => ({ ...prev, ...data.documentIds }));
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        quotes: data.quotes,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat request failed");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    threadIdsRef.current = {};
    setDocumentIds({});
    setSending(false);
    setError(null);
  }, []);

  return (
    <LibraryChatContext.Provider value={{ messages, sending, error, documentIds, sendMessage, reset }}>
      {children}
    </LibraryChatContext.Provider>
  );
}

export function useLibraryChatContext() {
  const ctx = useContext(LibraryChatContext);
  if (!ctx) throw new Error("useLibraryChatContext must be inside LibraryChatProvider");
  return ctx;
}
