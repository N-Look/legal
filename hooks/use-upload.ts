import { useState, useCallback, useRef } from 'react';
import type { UploadFormData, UploadPhase, UploadResponse } from '@/lib/types/documents';
import type { BackboardStatus } from '@/lib/types/database';

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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollStatus = useCallback((docId: string) => {
    let pollCount = 0;
    const maxPolls = 90; // 90 × 2s = 3 minutes max

    pollingRef.current = setInterval(async () => {
      pollCount++;

      if (pollCount > maxPolls) {
        setPhase('error');
        setError('Document processing timed out. It may still be indexing — check back later.');
        stopPolling();
        return;
      }

      try {
        const res = await fetch(`/api/documents/${docId}/status`, { cache: 'no-store' });
        const data = await res.json();

        setStatus(data.status);

        if (data.status === 'processing') {
          setProgress(66);
        }

        if (data.status === 'indexed') {
          setProgress(100);
          setPhase('complete');
          stopPolling();
        } else if (data.status === 'error') {
          setPhase('error');
          setError('Document processing failed');
          stopPolling();
        }
      } catch {
        // Continue polling on network errors
      }
    }, 2000);
  }, [stopPolling]);

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
      if (data.matterNumber) formData.append('matterNumber', data.matterNumber);
      formData.append('docType', data.docType);
      if (data.jurisdiction) formData.append('jurisdiction', data.jurisdiction);
      if (data.court) formData.append('court', data.court);

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
      pollStatus(result.documentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setPhase('error');
    }
  }, [pollStatus]);

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
