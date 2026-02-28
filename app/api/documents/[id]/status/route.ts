import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getDocumentStatus } from '@/lib/backboard/client';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // If already indexed or errored, return current status
  if (doc.backboard_status === 'indexed' || doc.backboard_status === 'error') {
    return NextResponse.json({ status: doc.backboard_status }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // Poll Backboard for latest status
  if (doc.backboard_document_id) {
    try {
      const bbDoc = await getDocumentStatus(doc.backboard_document_id);

      console.log(`[status] doc=${id} backboard_status=${bbDoc.status}`);

      const newStatus = bbDoc.status === 'indexed' ? 'indexed'
        : bbDoc.status === 'error' ? 'error'
        : bbDoc.status === 'processing' ? 'processing'
        : 'pending';

      if (newStatus !== doc.backboard_status) {
        await supabaseAdmin
          .from('documents')
          .update({ backboard_status: newStatus })
          .eq('id', id);

        if (newStatus === 'indexed' || newStatus === 'error') {
          await supabaseAdmin
            .from('upload_sessions')
            .update({
              status: newStatus === 'indexed' ? 'completed' : 'error',
            })
            .eq('document_id', id);
        }
      }

      return NextResponse.json({ status: newStatus }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch (e) {
      // Surface the real error so the frontend can stop polling instead of looping forever
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[status] Backboard check failed for doc=${id} (backboard_id=${doc.backboard_document_id}): ${message}`);

      // Mark as error in DB so future polls return immediately without hitting Backboard
      await supabaseAdmin
        .from('documents')
        .update({ backboard_status: 'error' })
        .eq('id', id);

      return NextResponse.json(
        { status: 'error', error: `Indexing failed: ${message}` },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
  }

  // No backboard_document_id — upload didn't reach Backboard
  console.warn(`[status] doc=${id} has no backboard_document_id (db_status=${doc.backboard_status})`);
  return NextResponse.json({ status: doc.backboard_status }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
