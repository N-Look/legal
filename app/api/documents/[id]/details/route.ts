import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getDocumentStatus, listDocuments } from '@/lib/backboard/client';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .select('*, clients(name), matters(name)')
    .eq('id', id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Fetch Backboard enrichment if document has a Backboard ID
  let backboard_details: {
    summary: string | null;
    chunk_count: number | null;
    total_tokens: number | null;
    file_size_bytes: number | null;
    status: string;
    status_message: string | null;
  } | null = null;

  if (doc.backboard_document_id) {
    try {
      const bb = await getDocumentStatus(doc.backboard_document_id);
      backboard_details = {
        summary: bb.summary ?? null,
        chunk_count: bb.chunk_count ?? null,
        total_tokens: bb.total_tokens ?? null,
        file_size_bytes: bb.file_size_bytes ?? null,
        status: bb.status,
        status_message: bb.status_message ?? null,
      };

      // Sync status back to DB if Backboard reports a different status
      if (bb.status && bb.status !== doc.backboard_status) {
        const newStatus = bb.status === 'indexed' ? 'indexed'
          : bb.status === 'error' ? 'error'
          : bb.status === 'processing' ? 'processing'
          : 'pending';
        await supabaseAdmin
          .from('documents')
          .update({ backboard_status: newStatus })
          .eq('id', id);
        doc.backboard_status = newStatus;

        if (newStatus === 'indexed' || newStatus === 'error') {
          await supabaseAdmin
            .from('upload_sessions')
            .update({ status: newStatus === 'indexed' ? 'completed' : 'error' })
            .eq('document_id', id);
        }
      }

      // Use cached summary from DB if available
      if (doc.backboard_summary) {
        backboard_details.summary = doc.backboard_summary;
      }

      // If still no summary, try listDocuments with a 5s timeout
      if (!backboard_details.summary && doc.backboard_assistant_id) {
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
        const listFetch = listDocuments(doc.backboard_assistant_id)
          .then((docs) => docs.find((d) => d.document_id === doc.backboard_document_id)?.summary ?? null)
          .catch(() => null);
        const summary = await Promise.race([listFetch, timeout]);
        if (summary) {
          backboard_details.summary = summary;
          // Cache it so we never need listDocuments for this doc again
          await supabaseAdmin
            .from('documents')
            .update({ backboard_summary: summary })
            .eq('id', id);
        }
      }

    } catch (e) {
      console.error('Failed to fetch Backboard details:', e);
      // Non-fatal: if we have a cached summary, still return it
      if (doc.backboard_summary) {
        backboard_details = {
          summary: doc.backboard_summary,
          chunk_count: null,
          total_tokens: null,
          file_size_bytes: null,
          status: doc.backboard_status ?? 'unknown',
          status_message: null,
        };
      }
    }
  }

  return NextResponse.json({ ...doc, backboard_details });
}
