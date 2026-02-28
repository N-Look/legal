"use client";

import * as React from "react";
import {
  Search,
  Filter,
  Loader2,
  Trash2,
  Brain,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMemory, type MemoryDocument } from "@/hooks/use-memory";
import { useClients } from "@/hooks/use-clients-matters";

function StatusBadge({ status }: { status: MemoryDocument["backboard_status"] }) {
  switch (status) {
    case "indexed":
      return <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Indexed</Badge>;
    case "processing":
      return <Badge variant="default" className="bg-amber-500/10 text-amber-600 border-amber-200">Processing</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

function formatNumber(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function MemoryDocumentRow({
  doc,
  onDelete,
  deleting,
}: {
  doc: MemoryDocument;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="group border border-border/50 rounded-xl bg-background p-4 hover:border-border transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <FileText className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{doc.filename}</span>
            <StatusBadge status={doc.backboard_status} />
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{doc.client_name}</span>
            {doc.chunk_count != null && (
              <span>{formatNumber(doc.chunk_count)} chunks</span>
            )}
            {doc.total_tokens != null && (
              <span>{formatNumber(doc.total_tokens)} tokens</span>
            )}
          </div>

          {doc.summary && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                Summary
              </button>
              {expanded && (
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                  {doc.summary}
                </p>
              )}
            </div>
          )}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete from memory?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove &ldquo;{doc.filename}&rdquo; from
                AI memory and the document library. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => onDelete(doc.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function MemoryManager() {
  const [search, setSearch] = React.useState("");
  const [clientFilter, setClientFilter] = React.useState("");

  const { clients } = useClients();
  const { documents, loading, error, deleteDocument, deleting } = useMemory();

  const filtered = React.useMemo(() => {
    let result = documents;
    if (clientFilter) {
      result = result.filter((d) => d.client_id === clientFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.filename.toLowerCase().includes(q) ||
          d.client_name.toLowerCase().includes(q) ||
          (d.summary && d.summary.toLowerCase().includes(q))
      );
    }
    return result;
  }, [documents, clientFilter, search]);

  const stats = React.useMemo(() => {
    return {
      totalDocs: documents.length,
      totalChunks: documents.reduce((sum, d) => sum + (d.chunk_count ?? 0), 0),
      totalTokens: documents.reduce((sum, d) => sum + (d.total_tokens ?? 0), 0),
    };
  }, [documents]);

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-7 h-7 text-foreground/80" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground/90">
            AI Memory
          </h1>
        </div>
        <p className="text-muted-foreground mt-1">
          View and manage documents indexed in AI memory.
        </p>
      </div>

      {/* Stats */}
      {!loading && documents.length > 0 && (
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{formatNumber(stats.totalDocs)}</span>
            <span className="text-xs text-muted-foreground">Documents</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{formatNumber(stats.totalChunks)}</span>
            <span className="text-xs text-muted-foreground">Chunks</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold">{formatNumber(stats.totalTokens)}</span>
            <span className="text-xs text-muted-foreground">Tokens</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search memory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl h-10"
          />
        </div>

        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(clientFilter || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setClientFilter("");
              setSearch("");
            }}
            className="rounded-xl text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-destructive mb-1">
              Failed to load memory
            </p>
            <p className="text-sm text-muted-foreground/70">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Brain className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-lg font-medium text-muted-foreground mb-1">
              {documents.length === 0
                ? "No documents in memory"
                : "No matching documents"}
            </p>
            <p className="text-sm text-muted-foreground/70">
              {documents.length === 0
                ? "Upload and index documents to see them here."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((doc) => (
              <MemoryDocumentRow
                key={doc.id}
                doc={doc}
                onDelete={deleteDocument}
                deleting={deleting === doc.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
