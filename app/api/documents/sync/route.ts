import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getDocumentStatus } from '@/lib/backboard/client';

/**
 * POST /api/documents/sync
 * Syncs Backboard status for all documents stuck in non-terminal states.
 * Useful for recovering from frontend polling timeouts.
 */
export async function POST() {
  const { data: docs, error } = await supabaseAdmin
    .from('documents')
    .select('id, backboard_document_id, backboard_status')
    .neq('backboard_status', 'indexed')
    .neq('backboard_status', 'error')
    .not('backboard_document_id', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { id: string; oldStatus: string; newStatus: string }[] = [];

  for (const doc of docs ?? []) {
    try {
      const bbDoc = await getDocumentStatus(doc.backboard_document_id!);

      const newStatus = bbDoc.status === 'indexed' ? 'indexed'
        : bbDoc.status === 'error' ? 'error'
        : bbDoc.status === 'processing' ? 'processing'
        : 'pending';

      if (newStatus !== doc.backboard_status) {
        await supabaseAdmin
          .from('documents')
          .update({ backboard_status: newStatus })
          .eq('id', doc.id);

        if (newStatus === 'indexed' || newStatus === 'error') {
          await supabaseAdmin
            .from('upload_sessions')
            .update({
              status: newStatus === 'indexed' ? 'completed' : 'error',
            })
            .eq('document_id', doc.id);
        }
      }

      results.push({ id: doc.id, oldStatus: doc.backboard_status, newStatus });
    } catch (e) {
      results.push({
        id: doc.id,
        oldStatus: doc.backboard_status,
        newStatus: `sync_error: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  return NextResponse.json({
    found: docs?.length ?? 0,
    updated: results.filter(r => r.oldStatus !== r.newStatus).length,
    results,
  });
}
