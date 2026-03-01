import type { BackboardStatus } from '@/lib/types/database';

export interface PollCallbacks {
  onStatus: (status: BackboardStatus) => void;
  onProgress: (progress: number) => void;
  onIndexed: () => void;
  onError: (message: string) => void;
  onTimeout: () => void;
}

/**
 * Polls `/api/documents/[id]/status` with exponential backoff.
 * Returns a cleanup function that stops polling.
 */
export function pollDocumentStatus(docId: string, callbacks: PollCallbacks): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  let elapsed = 0;
  let attempt = 0;
  let consecutiveErrors = 0;
  const maxSeconds = 180;

  const poll = async () => {
    if (cancelled) return;

    if (elapsed >= maxSeconds) {
      callbacks.onProgress(90);
      callbacks.onTimeout();
      return;
    }

    try {
      const res = await fetch(`/api/documents/${docId}/status`, { cache: 'no-store' });
      const data = await res.json();

      if (cancelled) return;

      callbacks.onStatus(data.status);
      consecutiveErrors = 0;

      callbacks.onProgress(Math.min(50 + Math.floor((elapsed / maxSeconds) * 40), 90));

      if (data.status === 'indexed') {
        callbacks.onProgress(100);
        callbacks.onIndexed();
        return;
      } else if (data.status === 'error') {
        callbacks.onError(data.error ?? 'Document processing failed. Check that your Backboard API key is valid.');
        return;
      }
    } catch {
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        callbacks.onError('Lost connection while checking indexing status.');
        return;
      }
    }

    const interval = Math.min(2000 * Math.pow(1.5, attempt), 15000);
    elapsed += interval / 1000;
    attempt++;
    timer = setTimeout(poll, interval);
  };

  // First poll after 2s
  elapsed += 2;
  timer = setTimeout(poll, 2000);

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}
