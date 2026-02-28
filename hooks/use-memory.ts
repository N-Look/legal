import { useState, useEffect, useCallback } from 'react';

export interface MemoryDocument {
  id: string;
  filename: string;
  client_id: string;
  client_name: string;
  backboard_status: 'pending' | 'uploading' | 'processing' | 'indexed' | 'error';
  summary: string | null;
  chunk_count: number | null;
  total_tokens: number | null;
  file_size_bytes: number | null;
  created_at: string;
}

interface UseMemoryReturn {
  documents: MemoryDocument[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  deleteDocument: (docId: string) => Promise<boolean>;
  deleting: string | null;
}

export function useMemory(): UseMemoryReturn {
  const [documents, setDocuments] = useState<MemoryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/memory');
      if (!res.ok) throw new Error('Failed to fetch memory data');
      const data = await res.json();
      setDocuments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load memory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  const deleteDocument = useCallback(async (docId: string): Promise<boolean> => {
    setDeleting(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete document');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      return true;
    } catch (e) {
      console.error('Delete failed:', e);
      return false;
    } finally {
      setDeleting(null);
    }
  }, []);

  return { documents, loading, error, refetch: fetchMemory, deleteDocument, deleting };
}
