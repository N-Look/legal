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
    return NextResponse.json({ status: doc.backboard_status });
  }

  // Poll Backboard for latest status
  if (doc.backboard_document_id) {
    try {
      const bbDoc = await getDocumentStatus(doc.backboard_document_id);

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

      return NextResponse.json({ status: newStatus });
    } catch (e) {
      console.error('Failed to poll Backboard status:', e);
      return NextResponse.json({ status: doc.backboard_status });
    }
  }

  return NextResponse.json({ status: doc.backboard_status });
}
