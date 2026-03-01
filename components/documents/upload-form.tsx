"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadDropzone } from "./upload-dropzone";
import { RawTextInput } from "./raw-text-input";
import { UploadProgress } from "./upload-progress";
import { useUploadContext } from "@/contexts/upload-context";
import { useClients, useMatters } from "@/hooks/use-clients-matters";
import type { DocType } from "@/lib/types/database";
import { FileText, Type, Plus } from "lucide-react";

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "brief", label: "Brief" },
  { value: "transcript", label: "Transcript" },
  { value: "exhibit", label: "Exhibit" },
  { value: "discovery", label: "Discovery" },
  { value: "memo", label: "Memo" },
  { value: "other", label: "Other" },
];

const NEW_MATTER_VALUE = "__new__";
const NEW_CLIENT_VALUE = "__new_client__";

export function UploadForm() {
  const [mode, setMode] = React.useState<"file" | "text">("file");
  const [file, setFile] = React.useState<File | null>(null);
  const [rawText, setRawText] = React.useState("");
  const [clientId, setClientId] = React.useState<string>("");
  const [newClientName, setNewClientName] = React.useState("");
  const [matterId, setMatterId] = React.useState<string>("");
  const [newMatterName, setNewMatterName] = React.useState("");
  const [docType, setDocType] = React.useState<DocType>("other");

  const { clients } = useClients();
  const selectedClient = clients.find((c) => c.id === clientId);
  const { matters } = useMatters(selectedClient?.id);

  const { phase, progress, error, upload, reset } = useUploadContext();

  const isCreatingNewClient = clientId === NEW_CLIENT_VALUE;

  const resolvedClientName = isCreatingNewClient
    ? newClientName
    : selectedClient?.name || "";

  // Reset matter selection when client changes
  React.useEffect(() => {
    setMatterId("");
    setNewMatterName("");
  }, [clientId]);

  const isCreatingNewMatter = matterId === NEW_MATTER_VALUE;

  const resolvedMatterName = isCreatingNewMatter
    ? newMatterName
    : matters.find((m) => m.id === matterId)?.name;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await upload({
      file: mode === "file" ? file ?? undefined : undefined,
      rawText: mode === "text" ? rawText : undefined,
      clientName: resolvedClientName,
      matterName: resolvedMatterName || undefined,
      docType,
    });
  };

  const handleReset = () => {
    reset();
    setFile(null);
    setRawText("");
    setClientId("");
    setNewClientName("");
    setMatterId("");
    setNewMatterName("");
    setDocType("other");
  };

  const isSubmitting =
    phase !== "idle" && phase !== "error" && phase !== "complete";

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground/90 mb-4">
          Upload Document
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Upload a file or paste text, add metadata, and index for RAG search.
        </p>
      </div>

      {phase !== "idle" && (
        <UploadProgress
          phase={phase}
          progress={progress}
          error={error}
          onReset={handleReset}
        />
      )}

      {(phase === "idle" || phase === "error") && (
        <Card className="shadow-sm border-border/80 rounded-[2rem] bg-background/50 overflow-hidden">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Mode Toggle */}
              <div className="flex gap-2 p-1 bg-muted/30 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setMode("file")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "file"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <FileText className="w-4 h-4" />
                  File
                </button>
                <button
                  type="button"
                  onClick={() => setMode("text")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "text"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Type className="w-4 h-4" />
                  Text
                </button>
              </div>

              {/* File/Text Input */}
              {mode === "file" ? (
                <UploadDropzone file={file} onFileSelect={setFile} />
              ) : (
                <RawTextInput value={rawText} onChange={setRawText} />
              )}

              {/* Metadata Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Client *</Label>
                  <Select
                    value={clientId}
                    onValueChange={setClientId}
                  >
                    <SelectTrigger className="rounded-xl w-full">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_CLIENT_VALUE}>
                        <span className="flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" />
                          Create new client
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Matter</Label>
                  <Select
                    value={matterId}
                    onValueChange={setMatterId}
                    disabled={!selectedClient && !isCreatingNewClient}
                  >
                    <SelectTrigger className="rounded-xl w-full">
                      <SelectValue
                        placeholder={
                          selectedClient || isCreatingNewClient
                            ? "Select a matter"
                            : "Select a client first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {matters.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_MATTER_VALUE}>
                        <span className="flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" />
                          Create new matter
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Document Type</Label>
                  <Select
                    value={docType}
                    onValueChange={(v) => setDocType(v as DocType)}
                  >
                    <SelectTrigger className="rounded-xl w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map((dt) => (
                        <SelectItem key={dt.value} value={dt.value}>
                          {dt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isCreatingNewClient && (
                  <div className="flex flex-col gap-2 md:col-span-3">
                    <Label
                      htmlFor="newClientName"
                      className="text-sm font-medium"
                    >
                      New Client Name *
                    </Label>
                    <Input
                      id="newClientName"
                      placeholder="e.g. Acme Corp"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      required
                      autoFocus
                      className="rounded-xl"
                    />
                  </div>
                )}

                {isCreatingNewMatter && (
                  <div className="flex flex-col gap-2 md:col-span-3">
                    <Label
                      htmlFor="newMatterName"
                      className="text-sm font-medium"
                    >
                      New Matter Name *
                    </Label>
                    <Input
                      id="newMatterName"
                      placeholder="e.g. Smith v. Jones"
                      value={newMatterName}
                      onChange={(e) => setNewMatterName(e.target.value)}
                      required
                      autoFocus
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={
                  isSubmitting ||
                  (!file && !rawText.trim()) ||
                  !resolvedClientName.trim() ||
                  (isCreatingNewMatter && !newMatterName.trim())
                }
                className="rounded-xl font-semibold h-12 w-full"
              >
                Upload & Index
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
