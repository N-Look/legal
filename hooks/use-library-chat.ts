import { useState, useCallback } from 'react';
import type { ChatMessage } from './use-document-chat';

interface UseLibraryChatReturn {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  documentIds: Record<string, string>;
  sendMessage: (message: string) => Promise<void>;
  reset: () => void;
}

export function useLibraryChat(): UseLibraryChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadIds, setThreadIds] = useState<Record<string, string>>({});
  const [documentIds, setDocumentIds] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    setSending(true);
    setError(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/library/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, threadIds }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Chat request failed');
      }

      const data = await res.json();

      if (data.threadIds) {
        setThreadIds(data.threadIds);
      }
      if (data.documentIds) {
        setDocumentIds(prev => ({ ...prev, ...data.documentIds }));
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        quotes: data.quotes,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chat request failed');
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  }, [threadIds]);

  const reset = useCallback(() => {
    setMessages([]);
    setThreadIds({});
    setDocumentIds({});
    setSending(false);
    setError(null);
  }, []);

  return { messages, sending, error, documentIds, sendMessage, reset };
}
