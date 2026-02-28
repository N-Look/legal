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
import { useUpload } from "@/hooks/use-upload";
import { useClients, useMatters } from "@/hooks/use-clients-matters";
import type { DocType } from "@/lib/types/database";
import { FileText, Type } from "lucide-react";

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "brief", label: "Brief" },
  { value: "transcript", label: "Transcript" },
  { value: "exhibit", label: "Exhibit" },
  { value: "discovery", label: "Discovery" },
  { value: "memo", label: "Memo" },
  { value: "other", label: "Other" },
];

export function UploadForm() {
  const [mode, setMode] = React.useState<"file" | "text">("file");
  const [file, setFile] = React.useState<File | null>(null);
  const [rawText, setRawText] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [matterName, setMatterName] = React.useState("");
  const [matterNumber, setMatterNumber] = React.useState("");
  const [docType, setDocType] = React.useState<DocType>("other");
  const [jurisdiction, setJurisdiction] = React.useState("");
  const [court, setCourt] = React.useState("");

  const { clients } = useClients();
  const selectedClient = clients.find(c => c.name === clientName);
  const { matters } = useMatters(selectedClient?.id);

  const { phase, progress, error, upload, reset } = useUpload();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await upload({
      file: mode === "file" ? file ?? undefined : undefined,
      rawText: mode === "text" ? rawText : undefined,
      clientName,
      matterName: matterName || undefined,
      matterNumber: matterNumber || undefined,
      docType,
      jurisdiction: jurisdiction || undefined,
      court: court || undefined,
    });
  };

  const handleReset = () => {
    reset();
    setFile(null);
    setRawText("");
    setClientName("");
    setMatterName("");
    setMatterNumber("");
    setDocType("other");
    setJurisdiction("");
    setCourt("");
  };

  const isSubmitting = phase !== "idle" && phase !== "error" && phase !== "complete";

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
        <UploadProgress phase={phase} progress={progress} error={error} onReset={handleReset} />
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === "file" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  File
                </button>
                <button
                  type="button"
                  onClick={() => setMode("text")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === "text" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="clientName" className="text-sm font-medium">
                    Client *
                  </Label>
                  <Input
                    id="clientName"
                    placeholder="e.g. Acme Corp"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    list="client-suggestions"
                    required
                    className="rounded-xl"
                  />
                  <datalist id="client-suggestions">
                    {clients.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="matterName" className="text-sm font-medium">
                    Matter
                  </Label>
                  <Input
                    id="matterName"
                    placeholder="e.g. Smith v. Jones"
                    value={matterName}
                    onChange={(e) => setMatterName(e.target.value)}
                    list="matter-suggestions"
                    className="rounded-xl"
                  />
                  <datalist id="matter-suggestions">
                    {matters.map((m) => (
                      <option key={m.id} value={m.name} />
                    ))}
                  </datalist>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="matterNumber" className="text-sm font-medium">
                    Matter Number
                  </Label>
                  <Input
                    id="matterNumber"
                    placeholder="e.g. 2024-001"
                    value={matterNumber}
                    onChange={(e) => setMatterNumber(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Document Type</Label>
                  <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
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

                <div className="flex flex-col gap-2">
                  <Label htmlFor="jurisdiction" className="text-sm font-medium">
                    Jurisdiction
                  </Label>
                  <Input
                    id="jurisdiction"
                    placeholder="e.g. California"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="court" className="text-sm font-medium">
                    Court
                  </Label>
                  <Input
                    id="court"
                    placeholder="e.g. 9th Circuit"
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || (!file && !rawText.trim()) || !clientName.trim()}
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
