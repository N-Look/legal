import { useState, useEffect, useCallback } from 'react';
import type { Client, Matter } from '@/lib/types/database';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) setClients(await res.json());
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const createClient = useCallback(async (name: string): Promise<Client | null> => {
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return null;
      const client = await res.json();
      setClients(prev => [...prev.filter(c => c.id !== client.id), client].sort((a, b) => a.name.localeCompare(b.name)));
      return client;
    } catch {
      return null;
    }
  }, []);

  return { clients, loading, createClient, refetch: fetchClients };
}

export function useMatters(clientId?: string) {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMatters = useCallback(async () => {
    if (!clientId) {
      setMatters([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/matters?clientId=${clientId}`);
      if (res.ok) setMatters(await res.json());
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchMatters(); }, [fetchMatters]);

  const createMatter = useCallback(async (data: {
    clientId: string;
    name: string;
    matterNumber?: string;
    jurisdiction?: string;
    court?: string;
  }): Promise<Matter | null> => {
    try {
      const res = await fetch('/api/matters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      const matter = await res.json();
      setMatters(prev => [...prev.filter(m => m.id !== matter.id), matter].sort((a, b) => a.name.localeCompare(b.name)));
      return matter;
    } catch {
      return null;
    }
  }, []);

  return { matters, loading, createMatter, refetch: fetchMatters };
}
