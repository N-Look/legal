import { useState, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  quotes?: string[];
}

interface UseDocumentChatReturn {
  messages: ChatMessage[];
  threadId: string | null;
  sending: boolean;
  error: string | null;
  sendMessage: (documentId: string, message: string) => Promise<void>;
  reset: () => void;
}

export function useDocumentChat(): UseDocumentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (documentId: string, message: string) => {
    setSending(true);
    setError(null);

    // Append user message immediately
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch(`/api/documents/${documentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, threadId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Chat request failed');
      }

      const data = await res.json();

      // Store threadId for follow-up messages
      if (data.threadId) {
        setThreadId(data.threadId);
      }

      const assistantMsg: ChatMessage = {
        id: data.messageId || crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        quotes: data.quotes,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chat request failed');
      // Remove the user message on error so they can retry
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  }, [threadId]);

  const reset = useCallback(() => {
    setMessages([]);
    setThreadId(null);
    setSending(false);
    setError(null);
  }, []);

  return { messages, threadId, sending, error, sendMessage, reset };
}
