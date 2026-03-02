'use client';

import { useState, useEffect, useMemo, type FormEvent } from 'react';
import Link from 'next/link';
import { Scale, Loader2, Sparkles, ChevronDown, ChevronRight, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Node } from '@xyflow/react';
import type { MapNodeData } from '@/types/argument-map';
import type { Document } from '@/lib/types/database';

const TYPE_DOTS: Record<MapNodeData['nodeType'], string> = {
  claim: 'bg-primary',
  supporting: 'bg-emerald-500',
  opposing: 'bg-red-500',
  context: 'bg-blue-500',
  'sub-argument': 'bg-violet-500',
};

const TYPE_LABELS: Record<MapNodeData['nodeType'], string> = {
  claim: 'Claim',
  supporting: 'Supports',
  opposing: 'Opposes',
  context: 'Context',
  'sub-argument': 'Sub-arg',
};

const DOC_TYPE_COLORS: Record<string, string> = {
  brief: 'text-blue-600 bg-blue-50',
  transcript: 'text-amber-600 bg-amber-50',
  exhibit: 'text-emerald-600 bg-emerald-50',
  discovery: 'text-violet-600 bg-violet-50',
  memo: 'text-rose-600 bg-rose-50',
  other: 'text-gray-600 bg-gray-50',
};

const EXAMPLE_CLAIM = '';

type DocumentWithClient = Document & { clients?: { name: string }; matters?: { name: string } | null };

interface ClaimInputProps {
  onAnalyze: (claim: string, assistantIds: string[]) => void;
  loading: boolean;
  nodes: Node<MapNodeData>[];
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
  summary: string | null;
  onDocumentsLoaded?: (count: number) => void;
}

export function ClaimInput({ onAnalyze, loading, nodes, onNodeClick, selectedNodeId, summary, onDocumentsLoaded }: ClaimInputProps) {
  const [claim, setClaim] = useState(EXAMPLE_CLAIM);
  const [showNodes, setShowNodes] = useState(true);
  const [showDocs, setShowDocs] = useState(true);

  // Document fetching
  const [documents, setDocuments] = useState<DocumentWithClient[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data: DocumentWithClient[] = await res.json();
          // Only show indexed documents
          const indexed = data.filter((d) => d.backboard_status === 'indexed');
          setDocuments(indexed);
          // Select all by default
          setSelectedDocIds(new Set(indexed.map((d) => d.id)));
          onDocumentsLoaded?.(indexed.length);
        }
      } catch {
        // silently fail — documents are optional for the map
        onDocumentsLoaded?.(0);
      } finally {
        setDocsLoading(false);
      }
    }
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive unique assistant IDs from all selected documents
  const selectedAssistantIds = useMemo(() => {
    const selectedDocs = documents.filter((d) => selectedDocIds.has(d.id));
    const ids = new Set<string>();
    for (const doc of selectedDocs) {
      if (doc.backboard_assistant_id) {
        ids.add(doc.backboard_assistant_id);
      }
    }
    return Array.from(ids);
  }, [documents, selectedDocIds]);

  const toggleDoc = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const selectAll = () => setSelectedDocIds(new Set(documents.map((d) => d.id)));
  const selectNone = () => setSelectedDocIds(new Set());

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (claim.trim().length >= 5 && !loading) {
      onAnalyze(claim.trim(), selectedAssistantIds);
    }
  };

  const evidenceNodes = nodes.filter((n) => n.data.nodeType !== 'claim');
  const supportCount = evidenceNodes.filter((n) => n.data.nodeType === 'supporting').length;
  const opposeCount = evidenceNodes.filter((n) => n.data.nodeType === 'opposing').length;
  const contextCount = evidenceNodes.filter((n) => n.data.nodeType === 'context' || n.data.nodeType === 'sub-argument').length;

  return (
    <div className="w-[300px] border-r border-border/50 bg-background flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scale className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Lex AI</h2>
            <p className="text-[11px] text-muted-foreground">Build your case visually</p>
          </div>
        </Link>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Document selector */}
        <div className="border-b border-border/50">
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="w-full flex items-center gap-2 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDocs ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <FileText className="w-3.5 h-3.5" />
            Case Files
            {documents.length > 0 && (
              <span className="ml-auto text-[10px] font-medium text-primary">
                {selectedDocIds.size}/{documents.length}
              </span>
            )}
          </button>

          {showDocs && (
            <div className="px-3 pb-3">
              {docsLoading ? (
                <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading documents...
                </div>
              ) : documents.length === 0 ? (
                <p className="px-3 py-3 text-[11px] text-muted-foreground">
                  No indexed documents yet. Upload files in the Library tab first.
                </p>
              ) : (
                <>
                  {/* Select all / none */}
                  <div className="flex items-center gap-2 px-2 pb-2">
                    <button
                      onClick={selectAll}
                      className="text-[10px] text-primary hover:text-primary/80 font-medium"
                    >
                      All
                    </button>
                    <span className="text-[10px] text-muted-foreground">/</span>
                    <button
                      onClick={selectNone}
                      className="text-[10px] text-muted-foreground hover:text-foreground font-medium"
                    >
                      None
                    </button>
                  </div>

                  {/* Document list */}
                  <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                    {documents.map((doc) => {
                      const isSelected = selectedDocIds.has(doc.id);
                      return (
                        <button
                          key={doc.id}
                          onClick={() => toggleDoc(doc.id)}
                          className={`
                            w-full text-left px-2.5 py-2 rounded-lg transition-colors text-xs flex items-center gap-2
                            ${isSelected ? 'bg-primary/8 text-foreground' : 'text-foreground/50 hover:bg-muted/40 hover:text-foreground/70'}
                          `}
                        >
                          <div className={`
                            w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                            ${isSelected ? 'bg-primary border-primary' : 'border-border/60 bg-background'}
                          `}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium truncate block text-[11px]">
                              {doc.original_filename}
                            </span>
                            {doc.clients?.name && (
                              <span className="text-[9px] text-muted-foreground truncate block">
                                {doc.clients.name}
                              </span>
                            )}
                          </div>
                          <span className={`text-[8px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0 ${DOC_TYPE_COLORS[doc.doc_type] ?? DOC_TYPE_COLORS.other}`}>
                            {doc.doc_type}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Claim input form */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-border/50 space-y-3">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Central Claim
          </label>
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Enter your legal argument or claim..."
            rows={3}
            className="w-full text-sm bg-muted/30 border border-border/50 rounded-xl px-3.5 py-2.5 resize-none placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors"
          />
          <Button
            type="submit"
            disabled={claim.trim().length < 5 || loading}
            className="w-full rounded-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Claim
              </>
            )}
          </Button>
          {selectedDocIds.size > 0 && !loading && (
            <p className="text-[10px] text-muted-foreground text-center">
              Using {selectedDocIds.size} document{selectedDocIds.size !== 1 ? 's' : ''} as context
            </p>
          )}
        </form>

        {/* Summary + stats */}
        {summary && (
          <div className="px-4 py-3 border-b border-border/50 bg-muted/20 space-y-2.5">
            <div className="flex items-center gap-3">
              <StatPill color="bg-emerald-500" count={supportCount} label="Support" />
              <StatPill color="bg-red-500" count={opposeCount} label="Oppose" />
              <StatPill color="bg-blue-500" count={contextCount} label="Context" />
            </div>
            <p className="text-[11px] text-foreground/60 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Node list */}
        {evidenceNodes.length > 0 && (
          <div>
            <button
              onClick={() => setShowNodes(!showNodes)}
              className="w-full flex items-center gap-2 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              {showNodes ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Evidence ({evidenceNodes.length})
            </button>
            {showNodes && (
              <div className="px-3 pb-3 space-y-0.5">
                {evidenceNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => onNodeClick(node.id)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg transition-colors text-xs group/item
                      ${selectedNodeId === node.id
                        ? 'bg-primary/10 text-foreground'
                        : 'text-foreground/70 hover:bg-muted/50 hover:text-foreground'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOTS[node.data.nodeType]}`} />
                      <span className="font-medium truncate flex-1">{node.data.label}</span>
                      <span className="text-[9px] text-muted-foreground shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        {TYPE_LABELS[node.data.nodeType]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {nodes.length === 0 && !docsLoading && (
          <div className="flex items-center justify-center p-6">
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select your case files above, enter a claim, and click Analyze.
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                The AI will search selected documents and apply legal reasoning.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] font-semibold text-foreground/70">{count}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
