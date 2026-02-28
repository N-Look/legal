import { BackboardClient } from 'backboard-sdk';
import type { Document as BBDocument } from 'backboard-sdk';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { BackboardAssistant, BackboardThread, BackboardDocument, BackboardUploadResponse } from './types';

const BASE_OPTIONS = {
  apiKey: process.env.BACKBOARD_API_KEY!,
  baseUrl: process.env.BACKBOARD_API_URL,
};

// Short timeout for read-only polling (status checks, listings)
const readClient = new BackboardClient({ ...BASE_OPTIONS, timeout: 5000 });
// Longer timeout for mutations (create, upload, delete)
const writeClient = new BackboardClient({ ...BASE_OPTIONS, timeout: 30000 });

function mapDocument(doc: BBDocument): BackboardDocument {
  return {
    document_id: doc.documentId,
    filename: doc.filename,
    status: doc.status as BackboardDocument['status'],
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
  // SDK requires a file path — write blob to a temp file then clean up
  const tempPath = join(tmpdir(), `bb-${Date.now()}-${filename}`);
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
  const result = await readClient.getDocumentStatus(documentId);
  return mapDocument(result);
}

export async function listDocuments(assistantId: string): Promise<BackboardDocument[]> {
  const results = await readClient.listAssistantDocuments(assistantId);
  return results.map(mapDocument);
}

export async function deleteDocument(_assistantId: string, documentId: string): Promise<void> {
  await writeClient.deleteDocument(documentId);
}
