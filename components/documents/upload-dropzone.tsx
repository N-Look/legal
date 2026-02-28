"use client";

import * as React from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

interface UploadDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
}

export function UploadDropzone({ file, onFileSelect }: UploadDropzoneProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      alert("Please upload a PDF, Word, or Text file.");
      return;
    }
    if (f.size > MAX_SIZE) {
      alert("File size must be under 50MB.");
      return;
    }
    onFileSelect(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  if (file) {
    return (
      <div className="border border-border/80 rounded-2xl p-6 flex items-center gap-4 bg-muted/10">
        <div className="p-3 bg-primary/10 rounded-xl">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onFileSelect(null)}
          className="text-muted-foreground hover:text-destructive rounded-full h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleChange}
        className="hidden"
      />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${dragOver
            ? "border-primary bg-primary/5"
            : "border-border/80 bg-muted/5 hover:bg-muted/20 hover:border-primary/40"
          }`}
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <UploadCloud className="w-8 h-8 text-primary" />
        </div>
        <p className="text-lg font-semibold mb-1.5">Drag & drop your file here</p>
        <p className="text-sm text-muted-foreground mb-6">PDF, Word, or Text files up to 50MB</p>
        <Button
          type="button"
          size="lg"
          className="rounded-xl font-medium pointer-events-none"
        >
          Browse Files
        </Button>
      </div>
    </>
  );
}
