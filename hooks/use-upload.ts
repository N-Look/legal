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
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollStatus = useCallback((docId: string) => {
    let elapsed = 0;
    const maxSeconds = 180; // 3 minutes max
    let attempt = 0;
    let consecutiveErrors = 0;

    const poll = async () => {
      if (elapsed >= maxSeconds) {
        setPhase('complete');
        setProgress(90);
        setError('Document uploaded — indexing is taking longer than expected. It will appear in your library once ready.');
        stopPolling();
        return;
      }

      try {
        const res = await fetch(`/api/documents/${docId}/status`, { cache: 'no-store' });
        const data = await res.json();

        setStatus(data.status);
        consecutiveErrors = 0;

        // Gradual progress: 50 → 90
        setProgress(Math.min(50 + Math.floor((elapsed / maxSeconds) * 40), 90));

        if (data.status === 'indexed') {
          setProgress(100);
          setPhase('complete');
          stopPolling();
          return;
        } else if (data.status === 'error') {
          setPhase('error');
          setError(data.error ?? 'Document processing failed. Check that your Backboard API key is valid.');
          stopPolling();
          return;
        }
      } catch {
        consecutiveErrors++;
        // Give up after 5 consecutive network errors
        if (consecutiveErrors >= 5) {
          setPhase('error');
          setError('Lost connection while checking indexing status.');
          stopPolling();
          return;
        }
      }

      // Exponential backoff: 5s → 10s → 20s → 30s (cap)
      const interval = Math.min(5000 * Math.pow(1.5, attempt), 30000);
      elapsed += interval / 1000;
      attempt++;
      pollingRef.current = setTimeout(poll, interval);
    };

    // First poll after 5s (Backboard needs time to start processing)
    elapsed += 5;
    pollingRef.current = setTimeout(poll, 5000);
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
