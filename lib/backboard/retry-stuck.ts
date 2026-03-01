import { supabaseAdmin } from '@/lib/supabase/server';
import { getDocumentStatus, deleteDocument, uploadDocument } from './client';

const MAX_RETRIES = 3;
const STUCK_THRESHOLD_MINUTES = 10;

interface RetryResult {
  documentId: string;
  action: 'retried' | 'synced' | 'marked_error' | 'skipped';
  detail?: string;
}

export async function retryStuckDocuments(): Promise<{
  found: number;
  results: RetryResult[];
}> {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000).toISOString();

  const { data: stuckDocs, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('backboard_status', 'processing')
    .not('backboard_document_id', 'is', null)
    .lt('updated_at', cutoff);

  if (error) throw new Error(`Failed to query stuck documents: ${error.message}`);
  if (!stuckDocs || stuckDocs.length === 0) return { found: 0, results: [] };

  // Filter to only docs under retry limit
  const eligible = stuckDocs.filter(
    (doc) => ((doc.metadata as Record<string, unknown>)?.retry_count as number ?? 0) < MAX_RETRIES
  );

  const overLimit = stuckDocs.filter(
    (doc) => ((doc.metadata as Record<string, unknown>)?.retry_count as number ?? 0) >= MAX_RETRIES
  );

  const results: RetryResult[] = [];

  // Mark docs that exceeded retries as error
  for (const doc of overLimit) {
    try {
      await supabaseAdmin
        .from('documents')
        .update({ backboard_status: 'error', metadata: { ...doc.metadata, error_reason: 'max_retries_exceeded' } })
        .eq('id', doc.id);
      results.push({ documentId: doc.id, action: 'marked_error', detail: 'Exceeded max retries' });
    } catch (e) {
      results.push({ documentId: doc.id, action: 'skipped', detail: `Failed to mark error: ${e}` });
    }
  }

  for (const doc of eligible) {
    try {
      // Double-check current Backboard status — it may have finished since our query
      const bbStatus = await getDocumentStatus(doc.backboard_document_id!);

      if (bbStatus.status === 'indexed' || bbStatus.status === 'error') {
        // Sync the real status locally and skip retry
        await supabaseAdmin
          .from('documents')
          .update({
            backboard_status: bbStatus.status,
            backboard_summary: bbStatus.summary ?? doc.backboard_summary,
          })
          .eq('id', doc.id);
        results.push({ documentId: doc.id, action: 'synced', detail: `Backboard status was ${bbStatus.status}` });
        continue;
      }

      // Still stuck — delete and re-upload
      if (!doc.storage_path || !doc.backboard_assistant_id) {
        results.push({ documentId: doc.id, action: 'skipped', detail: 'Missing storage_path or assistant_id' });
        continue;
      }

      // Delete old document from Backboard
      await deleteDocument(doc.backboard_assistant_id, doc.backboard_document_id!);

      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('documents')
        .download(doc.storage_path);

      if (downloadError || !fileData) {
        results.push({ documentId: doc.id, action: 'skipped', detail: `Storage download failed: ${downloadError?.message}` });
        continue;
      }

      // Re-upload to Backboard
      const bbDoc = await uploadDocument(doc.backboard_assistant_id, fileData, doc.filename);

      const retryCount = ((doc.metadata as Record<string, unknown>)?.retry_count as number ?? 0) + 1;

      await supabaseAdmin
        .from('documents')
        .update({
          backboard_document_id: bbDoc.document_id,
          backboard_status: 'processing',
          metadata: {
            ...doc.metadata,
            retry_count: retryCount,
            last_retry_at: new Date().toISOString(),
          },
        })
        .eq('id', doc.id);

      results.push({ documentId: doc.id, action: 'retried', detail: `Retry #${retryCount}` });
    } catch (e) {
      console.error(`[retry-stuck] Failed to retry document ${doc.id}:`, e);
      results.push({ documentId: doc.id, action: 'skipped', detail: `Error: ${e instanceof Error ? e.message : e}` });
    }
  }

  return { found: stuckDocs.length, results };
}
