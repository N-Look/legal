'use client';

import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
import type { Node } from '@xyflow/react';
import { X, FileText, Expand, Trash2, Send, Loader2, MessageSquare, ChevronDown, ChevronRight, Lightbulb, Shield, Search, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MapNodeData } from '@/types/argument-map';
import { useNodeChat } from '@/hooks/use-node-chat';

const TYPE_COLORS: Record<MapNodeData['nodeType'], string> = {
  claim: 'text-primary',
  supporting: 'text-emerald-600',
  opposing: 'text-red-600',
  context: 'text-blue-600',
  'sub-argument': 'text-violet-600',
};

const TYPE_ACCENTS: Record<MapNodeData['nodeType'], string> = {
  claim: '#64748b',
  supporting: '#16a34a',
  opposing: '#dc2626',
  context: '#d97706',
  'sub-argument': '#7c3aed',
};

interface NodeDetailPanelProps {
  node: Node<MapNodeData>;
  onClose: () => void;
  onExpand: (id: string) => void;
  onRemove: (id: string) => void;
  expanding: boolean;
  claim?: string;
  assistantIds?: string[];
}

const QUICK_PROMPTS = [
  { icon: Shield, label: 'Weaknesses', prompt: 'What are the weaknesses in this argument point? How might opposing counsel attack it?' },
  { icon: Lightbulb, label: 'Strengthen', prompt: 'How can I strengthen this argument for court? What evidence should I look for?' },
  { icon: Search, label: 'Evidence', prompt: 'What supporting evidence or documents should I gather for this point?' },
  { icon: Swords, label: 'Counter', prompt: 'What counterarguments might the opposing side raise against this point?' },
];

export function NodeDetailPanel({ node, onClose, onExpand, onRemove, expanding, claim, assistantIds }: NodeDetailPanelProps) {
  const { data } = node;
  const isClaim = data.nodeType === 'claim';
  const accent = TYPE_ACCENTS[data.nodeType];

  const [showDetails, setShowDetails] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatContext = useMemo(() => ({
    nodeLabel: data.label,
    nodeDescription: data.description,
    claim: claim ?? '',
    assistantIds: assistantIds ?? [],
  }), [data.label, data.description, claim, assistantIds]);

  const { messages, sending, error, sendMessage, reset } = useNodeChat(chatContext);

  // Reset chat when node changes
  const prevNodeId = useRef(node.id);
  useEffect(() => {
    if (prevNodeId.current !== node.id) {
      reset();
      prevNodeId.current = node.id;
    }
  }, [node.id, reset]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (chatInput.trim().length >= 2 && !sending) {
      sendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    if (!sending) {
      sendMessage(prompt);
    }
  };

  return (
    <div className="w-[340px] border-l border-border/50 bg-background flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: accent }}
          />
          <h3 className="text-sm font-semibold text-foreground truncate">{data.label}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Collapsible details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors border-b border-border/50"
      >
        {showDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Details
      </button>

      {showDetails && (
        <div className="px-4 py-3 space-y-3 border-b border-border/50 overflow-y-auto max-h-[220px]">
          {/* Type */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Type</span>
            <p className={`text-xs font-medium mt-0.5 capitalize ${TYPE_COLORS[data.nodeType]}`}>
              {data.nodeType.replace('-', ' ')}
            </p>
          </div>

          {/* Description */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description</span>
            <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">{data.description}</p>
          </div>

          {/* Source document */}
          {data.documentName && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground/80 truncate">{data.documentName}</span>
              </div>
            </div>
          )}

          {/* Confidence */}
          {data.confidence != null && !isClaim && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Confidence</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      data.confidence >= 0.8 ? 'bg-emerald-500' : data.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-400'
                    }`}
                    style={{ width: `${data.confidence * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">
                  {Math.round(data.confidence * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          {!isClaim && (
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => onExpand(node.id)}
                disabled={expanding}
                size="sm"
                variant="outline"
                className="flex-1 rounded-full text-xs h-8"
              >
                <Expand className="w-3.5 h-3.5 mr-1.5" />
                {expanding ? 'Expanding...' : 'Expand'}
              </Button>
              <Button
                onClick={() => onRemove(node.id)}
                size="sm"
                variant="ghost"
                className="rounded-full text-xs h-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Chat section header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ask about this point
        </span>
        {messages.length > 0 && (
          <button
            onClick={reset}
            className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 min-h-0">
        {messages.length === 0 && !sending && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] text-muted-foreground text-center px-2 pb-2">
              Ask questions about this argument point or use a quick prompt:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => handleQuickPrompt(qp.prompt)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-left"
                >
                  <qp.icon className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
                  <span className="text-[11px] font-medium text-foreground/70">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted/60 text-foreground rounded-bl-md'
              }`}
            >
              <ChatContent content={msg.content} />
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-muted/60 rounded-xl rounded-bl-md px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {error && (
          <p className="text-[10px] text-destructive text-center px-2">{error}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="border-t border-border/50 px-3 py-2.5 flex items-center gap-2">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask about this point..."
          className="flex-1 text-xs bg-muted/30 border border-border/50 rounded-full px-3 py-2 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          disabled={sending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={chatInput.trim().length < 2 || sending}
          className="w-8 h-8 rounded-full shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
}

/** Renders chat content with «quote» markers as styled blockquotes */
function ChatContent({ content }: { content: string }) {
  const parts = content.split(/«quote»|«\/quote»/);
  if (parts.length <= 1) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  return (
    <span>
      {parts.map((part, i) => {
        const isQuote = i % 2 === 1;
        if (isQuote) {
          return (
            <blockquote
              key={i}
              className="border-l-2 border-primary/30 pl-2 my-1.5 text-[11px] text-foreground/70 italic"
            >
              {part}
            </blockquote>
          );
        }
        return <span key={i} className="whitespace-pre-wrap">{part}</span>;
      })}
    </span>
  );
}
