"use client";

import { useState, useEffect } from "react";
import {
  Landmark,
  Swords,
  Scale,
  FileText,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClients, useMatters } from "@/hooks/use-clients-matters";
import { useDocuments } from "@/hooks/use-documents";
import type { SimulationConfig } from "@/types/simulation";

interface SimulationSetupProps {
  onStart: (config: SimulationConfig) => void;
}

export function SimulationSetup({ onStart }: SimulationSetupProps) {
  const { clients, loading: clientsLoading } = useClients();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedMatterId, setSelectedMatterId] = useState("");
  const { matters } = useMatters(selectedClientId || undefined);
  const { documents, loading: docsLoading } = useDocuments(
    selectedClientId
      ? {
          clientId: selectedClientId,
          ...(selectedMatterId ? { matterId: selectedMatterId } : {}),
        }
      : {},
  );

  const [additionalContext, setAdditionalContext] = useState("");
  const [userRole, setUserRole] = useState<"plaintiff" | "defense">(
    "plaintiff",
  );
  const [difficulty, setDifficulty] = useState<"standard" | "aggressive">(
    "standard",
  );

  // Auto-select first client with documents
  useEffect(() => {
    if (!clientsLoading && clients.length > 0 && !selectedClientId) {
      const withDocs = clients.find((c) => c.backboard_assistant_id);
      if (withDocs) {
        setSelectedClientId(withDocs.id);
      }
    }
  }, [clients, clientsLoading, selectedClientId]);

  // Reset matter when client changes
  useEffect(() => {
    setSelectedMatterId("");
  }, [selectedClientId]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedMatter = matters.find((m) => m.id === selectedMatterId);
  const assistantIds = selectedClient?.backboard_assistant_id
    ? [selectedClient.backboard_assistant_id]
    : [];

  const indexedDocs = documents.filter(
    (d) => d.backboard_status === "indexed",
  );

  const caseName = selectedMatter
    ? `${selectedClient?.name} — ${selectedMatter.name}`
    : selectedClient?.name ?? "";

  const canStart = !!selectedClientId && assistantIds.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Build description from document names + any additional context
    const docList = indexedDocs
      .map((d) => `- ${d.original_filename} (${d.doc_type})`)
      .join("\n");
    const autoDescription = [
      `Case: ${caseName}`,
      selectedMatter?.jurisdiction
        ? `Jurisdiction: ${selectedMatter.jurisdiction}`
        : "",
      selectedMatter?.court ? `Court: ${selectedMatter.court}` : "",
      docList ? `\nCase documents:\n${docList}` : "",
      additionalContext
        ? `\nAdditional context: ${additionalContext}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    onStart({
      caseName,
      caseDescription: autoDescription,
      userRole,
      assistantIds,
      difficulty,
    });
  }

  return (
    <div className="flex items-center justify-center h-full p-8">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Landmark className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Courtroom Simulation</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Practice your arguments against AI opposing counsel, with a judge
            ruling on procedure and a jury tracking persuasion.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Client selection */}
            <div className="space-y-1.5">
              <Label>Case (Client)</Label>
              <Select
                value={selectedClientId}
                onValueChange={setSelectedClientId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      clientsLoading
                        ? "Loading cases..."
                        : "Select a case"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {clients
                    .filter((c) => c.backboard_assistant_id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Matter selection (optional) */}
            {matters.length > 0 && (
              <div className="space-y-1.5">
                <Label>Matter (optional)</Label>
                <Select
                  value={selectedMatterId}
                  onValueChange={setSelectedMatterId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All matters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All matters</SelectItem>
                    {matters.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Case documents (auto-loaded) */}
            {selectedClientId && (
              <div className="space-y-1.5">
                <Label>Case Documents</Label>
                {docsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading documents...
                  </div>
                ) : indexedDocs.length > 0 ? (
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-3 max-h-40 overflow-y-auto space-y-1.5">
                    {indexedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">
                          {doc.original_filename}
                        </span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {doc.doc_type}
                        </Badge>
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground pt-1">
                      {indexedDocs.length} document{indexedDocs.length !== 1 ? "s" : ""} indexed — all AI agents will use these as evidence
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    No indexed documents found. Upload documents in the Library first.
                  </p>
                )}
              </div>
            )}

            {/* Additional context (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="context">Additional Context (optional)</Label>
              <Textarea
                id="context"
                placeholder="Add any additional context about the case, specific issues to focus on, or scenarios to test..."
                rows={3}
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
              />
            </div>

            {/* Your Role */}
            <div className="space-y-1.5">
              <Label>Your Role</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={userRole === "plaintiff" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setUserRole("plaintiff")}
                >
                  <Scale className="w-4 h-4 mr-2" />
                  Plaintiff
                </Button>
                <Button
                  type="button"
                  variant={userRole === "defense" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setUserRole("defense")}
                >
                  <Swords className="w-4 h-4 mr-2" />
                  Defense
                </Button>
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={difficulty === "standard" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDifficulty("standard")}
                >
                  Standard
                </Button>
                <Button
                  type="button"
                  variant={difficulty === "aggressive" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDifficulty("aggressive")}
                >
                  Aggressive
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {difficulty === "aggressive"
                  ? "Opposing counsel will object frequently and challenge every assertion."
                  : "Opposing counsel will object when clearly warranted. Firm but fair."}
              </p>
            </div>

            {/* Start */}
            <Button
              type="submit"
              className="w-full"
              disabled={!canStart}
            >
              <Landmark className="w-4 h-4 mr-2" />
              Begin Simulation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
