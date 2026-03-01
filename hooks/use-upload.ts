import { useState, useCallback, useRef } from 'react';
import type { UploadFormData, UploadPhase, UploadResponse } from '@/lib/types/documents';
import type { BackboardStatus } from '@/lib/types/database';
import { pollDocumentStatus } from '@/lib/upload/poll-status';

interface UseUploadReturn {
  phase: UploadPhase;
  progress: number;
  status: BackboardStatus | null;
  error: string | null;
  documentId: string | null;
  upload: (data: UploadFormData) => Promise<void>;
  reset: () => void;
}

export function useUpload(): UseUploadReturn {
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<BackboardStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const stopPolling = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  const startPolling = useCallback((docId: string) => {
    stopRef.current = pollDocumentStatus(docId, {
      onStatus: setStatus,
      onProgress: setProgress,
      onIndexed: () => {
        setPhase('complete');
      },
      onError: (msg) => {
        setPhase('error');
        setError(msg);
      },
      onTimeout: () => {
        setPhase('complete');
        setError('Document uploaded — indexing is taking longer than expected. It will appear in your library once ready.');
      },
    });
  }, []);

  const upload = useCallback(async (data: UploadFormData) => {
    setPhase('validating');
    setProgress(10);
    setError(null);

    if (!data.clientName?.trim()) {
      setError('Client name is required');
      setPhase('error');
      return;
    }

    if (!data.file && !data.rawText?.trim()) {
      setError('Please upload a file or paste text');
      setPhase('error');
      return;
    }

    try {
      setPhase('uploading');
      setProgress(33);

      const formData = new FormData();
      if (data.file) {
        formData.append('file', data.file);
      } else if (data.rawText) {
        formData.append('rawText', data.rawText);
      }
      formData.append('clientName', data.clientName);
      if (data.matterName) formData.append('matterName', data.matterName);
      formData.append('docType', data.docType);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const result: UploadResponse = await res.json();
      setDocumentId(result.documentId);
      setStatus(result.status);
      setPhase('processing');
      setProgress(50);

      // Start polling for Backboard status
      startPolling(result.documentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setPhase('error');
    }
  }, [startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setPhase('idle');
    setProgress(0);
    setStatus(null);
    setError(null);
    setDocumentId(null);
  }, [stopPolling]);

  return { phase, progress, status, error, documentId, upload, reset };
}
