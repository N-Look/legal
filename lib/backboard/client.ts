import type { BackboardAssistant, BackboardThread, BackboardDocument, BackboardUploadResponse } from './types';

const API_URL = process.env.BACKBOARD_API_URL!;
const API_KEY = process.env.BACKBOARD_API_KEY!;

async function backboardFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'X-API-Key': API_KEY,
        ...options.headers,
      },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(`Backboard API timeout: ${path}`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const error = await res.text().catch(() => 'Unknown error');
    throw new Error(`Backboard API error (${res.status}): ${error}`);
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
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

export async function createThread(assistantId: string): Promise<BackboardThread> {
  return backboardFetch<BackboardThread>(`/assistants/${assistantId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
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
  documentId: string
): Promise<BackboardDocument> {
  return backboardFetch<BackboardDocument>(`/documents/${documentId}/status`);
}

export async function listDocuments(assistantId: string): Promise<BackboardDocument[]> {
  return backboardFetch<BackboardDocument[]>(`/assistants/${assistantId}/documents`);
}

export async function deleteDocument(assistantId: string, documentId: string): Promise<void> {
  await backboardFetch<void>(`/assistants/${assistantId}/documents/${documentId}`, {
    method: 'DELETE',
  });
}
