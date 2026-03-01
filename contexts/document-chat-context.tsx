"use client";

import { createContext, useContext, useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@/hooks/use-document-chat";

interface DocumentChatState {
  messages: ChatMessage[];
  threadId: string | null;
}

interface DocumentChatContextValue {
  getChat: (documentId: string) => DocumentChatState;
  sending: boolean;
  error: string | null;
  sendMessage: (documentId: string, message: string) => Promise<void>;
  resetChat: (documentId: string) => void;
}

const DocumentChatContext = createContext<DocumentChatContextValue | null>(null);

export function DocumentChatProvider({ children }: { children: React.ReactNode }) {
  const chatsRef = useRef<Map<string, DocumentChatState>>(new Map());
  const [, forceUpdate] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getChat = useCallback((documentId: string): DocumentChatState => {
    return chatsRef.current.get(documentId) ?? { messages: [], threadId: null };
  }, []);

  const setChat = useCallback((documentId: string, state: DocumentChatState) => {
    chatsRef.current.set(documentId, state);
    forceUpdate((n) => n + 1);
  }, []);

  const sendMessage = useCallback(async (documentId: string, message: string) => {
    setSending(true);
    setError(null);

    const current = chatsRef.current.get(documentId) ?? { messages: [], threadId: null };

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setChat(documentId, {
      ...current,
      messages: [...current.messages, userMsg],
    });

    try {
      const res = await fetch(`/api/documents/${documentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, threadId: current.threadId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Chat request failed");
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: data.messageId || crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        quotes: data.quotes,
      };

      const updated = chatsRef.current.get(documentId);
      setChat(documentId, {
        threadId: data.threadId ?? updated?.threadId ?? null,
        messages: [...(updated?.messages ?? []), assistantMsg],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat request failed");
      // Remove the user message on error
      const updated = chatsRef.current.get(documentId);
      if (updated) {
        setChat(documentId, {
          ...updated,
          messages: updated.messages.filter((m) => m.id !== userMsg.id),
        });
      }
    } finally {
      setSending(false);
    }
  }, [setChat]);

  const resetChat = useCallback((documentId: string) => {
    chatsRef.current.delete(documentId);
    forceUpdate((n) => n + 1);
  }, []);

  return (
    <DocumentChatContext.Provider value={{ getChat, sending, error, sendMessage, resetChat }}>
      {children}
    </DocumentChatContext.Provider>
  );
}

export function useDocumentChatContext() {
  const ctx = useContext(DocumentChatContext);
  if (!ctx) throw new Error("useDocumentChatContext must be inside DocumentChatProvider");
  return ctx;
}
