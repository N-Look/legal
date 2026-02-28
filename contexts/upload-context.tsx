"use client";

import * as React from "react";
import { useUpload } from "@/hooks/use-upload";
import type { UploadFormData, UploadPhase } from "@/lib/types/documents";
import type { BackboardStatus } from "@/lib/types/database";

interface UploadContextValue {
  phase: UploadPhase;
  progress: number;
  status: BackboardStatus | null;
  error: string | null;
  documentId: string | null;
  filename: string | null;
  upload: (data: UploadFormData) => Promise<void>;
  reset: () => void;
}

const UploadContext = React.createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const uploadState = useUpload();
  const [filename, setFilename] = React.useState<string | null>(null);

  const upload = React.useCallback(
    async (data: UploadFormData) => {
      setFilename(data.file?.name ?? (data.rawText ? "Pasted text" : null));
      await uploadState.upload(data);
    },
    [uploadState]
  );

  const reset = React.useCallback(() => {
    uploadState.reset();
    setFilename(null);
  }, [uploadState]);

  return (
    <UploadContext.Provider
      value={{ ...uploadState, filename, upload, reset }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUploadContext(): UploadContextValue {
  const ctx = React.useContext(UploadContext);
  if (!ctx) throw new Error("useUploadContext must be used inside UploadProvider");
  return ctx;
}
