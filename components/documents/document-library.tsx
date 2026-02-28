"use client";

import * as React from "react";
import { Search, Filter, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DocumentRow } from "./document-row";
import { DocumentDetailModal } from "./document-detail-modal";
import { useDocuments } from "@/hooks/use-documents";
import { useClients } from "@/hooks/use-clients-matters";
import type { Document, DocType } from "@/lib/types/database";

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "brief", label: "Brief" },
  { value: "transcript", label: "Transcript" },
  { value: "exhibit", label: "Exhibit" },
  { value: "discovery", label: "Discovery" },
  { value: "memo", label: "Memo" },
  { value: "other", label: "Other" },
];

export function DocumentLibrary() {
  const [search, setSearch] = React.useState("");
  const [clientFilter, setClientFilter] = React.useState<string>("");
  const [docTypeFilter, setDocTypeFilter] = React.useState<string>("");
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null);

  const { clients } = useClients();
  const { documents, loading, refetch, togglePin } = useDocuments({
    clientId: clientFilter || undefined,
    docType: (docTypeFilter as DocType) || undefined,
    search: search || undefined,
  });

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">
          Document Library
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse and manage uploaded documents.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
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

        <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
          <SelectTrigger className="w-[160px] rounded-xl">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DOC_TYPES.map((dt) => (
              <SelectItem key={dt.value} value={dt.value}>
                {dt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(clientFilter || docTypeFilter || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setClientFilter("");
              setDocTypeFilter("");
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
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-muted-foreground mb-1">
              No documents found
            </p>
            <p className="text-sm text-muted-foreground/70">
              Upload documents to see them here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc as Document & { clients?: { name: string }; matters?: { name: string } | null }}
                onPin={togglePin}
                onSelect={(d) => setSelectedDocId(d.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Document Detail Modal */}
      <DocumentDetailModal
        documentId={selectedDocId}
        onClose={() => setSelectedDocId(null)}
        onDeleted={() => {
          setSelectedDocId(null);
          refetch();
        }}
      />
    </div>
  );
}
