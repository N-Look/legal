import { useState, useEffect, useCallback } from 'react';
import type { Document } from '@/lib/types/database';
import type { DocumentListFilters } from '@/lib/types/documents';

interface UseDocumentsReturn {
  documents: Document[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  togglePin: (id: string, pinned: boolean) => Promise<void>;
}

export function useDocuments(filters: DocumentListFilters = {}): UseDocumentsReturn {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.clientId) params.set('clientId', filters.clientId);
    if (filters.matterId) params.set('matterId', filters.matterId);
    if (filters.docType) params.set('docType', filters.docType);
    if (filters.pinnedOnly) params.set('pinnedOnly', 'true');
    if (filters.search) params.set('search', filters.search);

    try {
      const res = await fetch(`/api/documents?${params}`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      setDocuments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [filters.clientId, filters.matterId, filters.docType, filters.pinnedOnly, filters.search]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto-refresh when any documents are still processing
  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.backboard_status === 'processing' || d.backboard_status === 'uploading'
    );
    if (!hasProcessing) return;

    const interval = setInterval(fetchDocuments, 10000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const togglePin = useCallback(async (id: string, pinned: boolean) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned_to_matter: pinned }),
      });
      if (!res.ok) throw new Error('Failed to update pin status');
      setDocuments(prev =>
        prev.map(d => d.id === id ? { ...d, pinned_to_matter: pinned } : d)
      );
    } catch (e) {
      console.error('Failed to toggle pin:', e);
    }
  }, []);

  return { documents, loading, error, refetch: fetchDocuments, togglePin };
}
