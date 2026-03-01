'use client';

import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
import type { Node } from '@xyflow/react';
import { X, FileText, Expand, Trash2, Send, Loader2, MessageSquare, Lightbulb, Shield, Search, Swords, ArrowLeft } from 'lucide-react';
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

const TYPE_BG: Record<MapNodeData['nodeType'], string> = {
  claim: 'bg-slate-50',
  supporting: 'bg-emerald-50',
  opposing: 'bg-red-50',
  context: 'bg-amber-50',
  'sub-argument': 'bg-violet-50',
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
  { icon: Shield, label: 'Weaknesses', prompt: 'What are the weaknesses in this argument point? How might opposing counsel attack it?', desc: 'Find vulnerabilities opposing counsel could exploit' },
  { icon: Lightbulb, label: 'Strengthen', prompt: 'How can I strengthen this argument for court? What evidence should I look for?', desc: 'Get advice on making this point stronger' },
  { icon: Search, label: 'Evidence', prompt: 'What supporting evidence or documents should I gather for this point?', desc: 'Identify documents and evidence to collect' },
  { icon: Swords, label: 'Counter', prompt: 'What counterarguments might the opposing side raise against this point?', desc: 'Anticipate opposing arguments' },
];

export function NodeDetailPanel({ node, onClose, onExpand, onRemove, expanding, claim, assistantIds }: NodeDetailPanelProps) {
  const { data } = node;
  const isClaim = data.nodeType === 'claim';
  const accent = TYPE_ACCENTS[data.nodeType];
  const typeBg = TYPE_BG[data.nodeType];

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
    <div className="absolute inset-0 z-50 bg-background flex flex-col animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to map
        </button>

        {!isClaim && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onExpand(node.id)}
              disabled={expanding}
              size="sm"
              variant="outline"
              className="rounded-full text-xs h-8"
            >
              <Expand className="w-3.5 h-3.5 mr-1.5" />
              {expanding ? 'Expanding...' : 'Expand Node'}
            </Button>
            <Button
              onClick={() => { onRemove(node.id); onClose(); }}
              size="sm"
              variant="ghost"
              className="rounded-full text-xs h-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Remove
            </Button>
          </div>
        )}
      </div>

      {/* Main content — two columns */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left column: Node details */}
        <div className="w-1/2 border-r border-border/50 overflow-y-auto p-8">
          {/* Node type badge + title */}
          <div className="mb-6">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-3 ${typeBg}`}
              style={{ color: accent }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
              {data.nodeType.replace('-', ' ')}
            </div>
            <h2 className="text-xl font-bold text-foreground leading-snug">{data.label}</h2>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
            <p className="text-sm text-foreground/80 leading-relaxed">{data.description}</p>
          </div>

          {/* Source document */}
          {data.documentName && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Source Document</h4>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground/80">{data.documentName}</span>
              </div>
            </div>
          )}

          {/* Confidence */}
          {data.confidence != null && !isClaim && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Confidence Score</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden max-w-xs">
                  <div
                    className={`h-full rounded-full transition-all ${
                      data.confidence >= 0.8 ? 'bg-emerald-500' : data.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-400'
                    }`}
                    style={{ width: `${data.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {Math.round(data.confidence * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Claim context */}
          {claim && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Case Claim</h4>
              <p className="text-sm text-foreground/60 leading-relaxed italic">&ldquo;{claim}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Right column: Chat */}
        <div className="w-1/2 flex flex-col min-h-0">
          {/* Chat header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Ask about this point</span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={reset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear chat
              </button>
            )}
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
            {messages.length === 0 && !sending && (
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground text-center px-4">
                  Ask questions about this argument point or use a quick prompt below:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_PROMPTS.map((qp) => (
                    <button
                      key={qp.label}
                      onClick={() => handleQuickPrompt(qp.prompt)}
                      className="flex flex-col items-start gap-1 px-4 py-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <qp.icon className="w-4 h-4 shrink-0" style={{ color: accent }} />
                        <span className="text-sm font-medium text-foreground">{qp.label}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground leading-snug">{qp.desc}</span>
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
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
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
                <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive text-center px-4">{error}</p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <form onSubmit={handleSubmit} className="border-t border-border/50 px-6 py-3 flex items-center gap-3 shrink-0">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about this argument point..."
              className="flex-1 text-sm bg-muted/30 border border-border/50 rounded-full px-4 py-2.5 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={sending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={chatInput.trim().length < 2 || sending}
              className="w-9 h-9 rounded-full shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
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
              className="border-l-2 border-primary/30 pl-2.5 my-2 text-sm text-foreground/70 italic"
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
