import { useState, useEffect } from 'react';

interface DocumentFile {
  url: string;
  mimeType: string;
  filename: string;
}

interface UseDocumentFileReturn {
  file: DocumentFile | null;
  loading: boolean;
  error: string | null;
}

export function useDocumentFile(documentId: string | null): UseDocumentFileReturn {
  const [file, setFile] = useState<DocumentFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setFile(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/documents/${documentId}/file`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load file');
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setFile(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load file');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  return { file, loading, error };
}
