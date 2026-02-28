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

      // getDocumentStatus doesn't return summary — fetch from list endpoint
      if (!backboard_details.summary && doc.backboard_assistant_id) {
        try {
          const docs = await listDocuments(doc.backboard_assistant_id);
          const match = docs.find(d => d.document_id === doc.backboard_document_id);
          if (match?.summary) {
            backboard_details.summary = match.summary;
          }
        } catch (listErr) {
          console.error('Failed to fetch summary from listDocuments:', listErr);
        }
      }
    } catch (e) {
      console.error('Failed to fetch Backboard details:', e);
      // Non-fatal: continue with null backboard data
    }
  }

  return NextResponse.json({ ...doc, backboard_details });
}
