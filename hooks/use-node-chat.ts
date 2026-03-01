import { useState, useCallback, useRef } from 'react';

export interface NodeChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface UseNodeChatReturn {
  messages: NodeChatMessage[];
  sending: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  reset: () => void;
}

interface NodeChatContext {
  nodeLabel: string;
  nodeDescription: string;
  claim: string;
  assistantIds: string[];
}

export function useNodeChat(context: NodeChatContext): UseNodeChatReturn {
  const [messages, setMessages] = useState<NodeChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    setSending(true);
    setError(null);

    const userMsg: NodeChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/map/node-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          threadId: threadIdRef.current,
          nodeLabel: context.nodeLabel,
          nodeDescription: context.nodeDescription,
          claim: context.claim,
          assistantIds: context.assistantIds,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Chat request failed');
      }

      const data = await res.json();

      if (data.threadId) {
        threadIdRef.current = data.threadId;
      }

      const assistantMsg: NodeChatMessage = {
        id: data.messageId || crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chat request failed');
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  }, [context.nodeLabel, context.nodeDescription, context.claim, context.assistantIds]);

  const reset = useCallback(() => {
    setMessages([]);
    threadIdRef.current = null;
    setSending(false);
    setError(null);
  }, []);

  return { messages, sending, error, sendMessage, reset };
}
