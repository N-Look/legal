import type { BackboardAssistant, BackboardThread, BackboardDocument, BackboardUploadResponse } from './types';

const API_URL = process.env.BACKBOARD_API_URL!;
const API_KEY = process.env.BACKBOARD_API_KEY!;

async function backboardFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text().catch(() => 'Unknown error');
    throw new Error(`Backboard API error (${res.status}): ${error}`);
  }

  return res.json();
}

export async function createAssistant(name: string): Promise<BackboardAssistant> {
  return backboardFetch<BackboardAssistant>('/assistants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function createThread(assistantId: string, name: string): Promise<BackboardThread> {
  return backboardFetch<BackboardThread>(`/assistants/${assistantId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function uploadDocument(
  assistantId: string,
  file: File | Blob,
  filename: string
): Promise<BackboardUploadResponse> {
  const formData = new FormData();
  formData.append('file', file, filename);

  return backboardFetch<BackboardUploadResponse>(`/assistants/${assistantId}/documents`, {
    method: 'POST',
    body: formData,
  });
}

export async function getDocumentStatus(
  assistantId: string,
  documentId: string
): Promise<BackboardDocument> {
  return backboardFetch<BackboardDocument>(`/assistants/${assistantId}/documents/${documentId}`);
}

export async function listDocuments(assistantId: string): Promise<BackboardDocument[]> {
  return backboardFetch<BackboardDocument[]>(`/assistants/${assistantId}/documents`);
}
