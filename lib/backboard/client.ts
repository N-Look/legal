import { BackboardClient } from 'backboard-sdk';
import type { Document as BBDocument } from 'backboard-sdk';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { BackboardAssistant, BackboardThread, BackboardDocument, BackboardUploadResponse } from './types';

const BASE_OPTIONS = {
  apiKey: process.env.BACKBOARD_API_KEY!,
  baseUrl: process.env.BACKBOARD_API_URL,
};

// Timeout for read-only polling (status checks, listings)
const readClient = new BackboardClient({ ...BASE_OPTIONS, timeout: 10000 });
// Longer timeout for mutations (create, upload, delete)
const writeClient = new BackboardClient({ ...BASE_OPTIONS, timeout: 30000 });

function mapDocument(doc: BBDocument): BackboardDocument {
  // Backboard SDK uses 'failed', our DB enum uses 'error' — normalize here
  const status = doc.status === 'failed' ? 'error' : doc.status;
  return {
    document_id: doc.documentId,
    filename: doc.filename,
    status: status as BackboardDocument['status'],
    status_message: doc.statusMessage,
    summary: doc.summary,
    chunk_count: doc.chunkCount,
    total_tokens: doc.totalTokens,
    file_size_bytes: doc.fileSizeBytes,
    created_at: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

export async function createAssistant(name: string): Promise<BackboardAssistant> {
  const result = await writeClient.createAssistant({ name });
  return {
    assistant_id: result.assistantId,
    name: result.name,
    created_at: result.createdAt instanceof Date ? result.createdAt.toISOString() : String(result.createdAt),
  };
}

export async function createThread(assistantId: string): Promise<BackboardThread> {
  const result = await writeClient.createThread(assistantId);
  return {
    thread_id: result.threadId,
    created_at: result.createdAt instanceof Date ? result.createdAt.toISOString() : String(result.createdAt ?? new Date()),
  };
}

export async function uploadDocument(
  assistantId: string,
  file: File | Blob,
  filename: string
): Promise<BackboardUploadResponse> {
  // SDK requires a file path — write blob to a unique temp dir so
  // path.basename() (used by SDK as the Backboard filename) stays clean
  const tempDir = join(tmpdir(), `bb-upload-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  const tempPath = join(tempDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(tempPath, buffer);

  try {
    const result = await writeClient.uploadDocumentToAssistant(assistantId, tempPath);
    return {
      document_id: result.documentId,
      filename: result.filename,
      status: result.status,
    };
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}

export async function getDocumentStatus(documentId: string): Promise<BackboardDocument> {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await readClient.getDocumentStatus(documentId);
      return mapDocument(result);
    } catch (err: unknown) {
      if (!(err instanceof Error) || attempt === maxRetries - 1) throw err;
      const statusCode = 'statusCode' in err ? (err as { statusCode?: number }).statusCode : undefined;
      const isTransient =
        (statusCode !== undefined && [429, 502, 503, 504].includes(statusCode)) ||
        err.message.includes('timed out') ||
        err.message.includes('abort');
      if (!isTransient) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('unreachable');
}

export async function listDocuments(assistantId: string): Promise<BackboardDocument[]> {
  const results = await readClient.listAssistantDocuments(assistantId);
  return results.map(mapDocument);
}

export async function deleteDocument(_assistantId: string, documentId: string): Promise<void> {
  await writeClient.deleteDocument(documentId);
}
