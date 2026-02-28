import { useState, useCallback } from 'react';
import type { Document, BackboardStatus } from '@/lib/types/database';

interface BackboardDetails {
  summary: string | null;
  chunk_count: number | null;
  total_tokens: number | null;
  file_size_bytes: number | null;
  status: BackboardStatus;
  status_message: string | null;
}

export interface DocumentDetails extends Document {
  clients?: { name: string };
  matters?: { name: string } | null;
  backboard_details: BackboardDetails | null;
}

interface UseDocumentDetailsReturn {
  details: DocumentDetails | null;
  loading: boolean;
  error: string | null;
  fetchDetails: (documentId: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<boolean>;
  deleting: boolean;
  reset: () => void;
}

export function useDocumentDetails(): UseDocumentDetailsReturn {
  const [details, setDetails] = useState<DocumentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDetails = useCallback(async (documentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/details`);
      if (!res.ok) throw new Error('Failed to fetch document details');
      const data = await res.json();
      setDetails(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(async (documentId: string): Promise<boolean> => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete document');
      return true;
    } catch (e) {
      console.error('Delete failed:', e);
      return false;
    } finally {
      setDeleting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setDetails(null);
    setLoading(false);
    setError(null);
  }, []);

  return { details, loading, error, fetchDetails, deleteDocument, deleting, reset };
}
