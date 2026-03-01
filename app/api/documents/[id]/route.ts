import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { deleteDocument as deleteBackboardDocument, getDocumentStatus } from '@/lib/backboard/client';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*, clients(name), matters(name)')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Fetch Backboard memory details if document is indexed
  let memory = null;
  if (data.backboard_document_id && process.env.BACKBOARD_API_KEY) {
    try {
      const bbDoc = await getDocumentStatus(data.backboard_document_id);
      memory = {
        summary: bbDoc.summary ?? null,
        chunk_count: bbDoc.chunk_count ?? null,
        total_tokens: bbDoc.total_tokens ?? null,
        file_size_bytes: bbDoc.file_size_bytes ?? null,
        status: bbDoc.status,
      };

      // Sync status back to DB if it changed
      if (bbDoc.status && bbDoc.status !== data.backboard_status) {
        const newStatus = bbDoc.status === 'indexed' ? 'indexed'
          : bbDoc.status === 'error' ? 'error'
          : bbDoc.status === 'processing' ? 'processing'
          : 'pending';
        await supabaseAdmin
          .from('documents')
          .update({ backboard_status: newStatus })
          .eq('id', id);
        data.backboard_status = newStatus;

        if (newStatus === 'indexed' || newStatus === 'error') {
          await supabaseAdmin
            .from('upload_sessions')
            .update({ status: newStatus === 'indexed' ? 'completed' : 'error' })
            .eq('document_id', id);
        }
      }
    } catch (e) {
      console.error(`[document detail] Failed to fetch Backboard details for ${id}:`, e);
    }
  }

  return NextResponse.json({ ...data, memory });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const allowedFields = ['pinned_to_matter', 'doc_type', 'metadata'];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Fetch document to get Backboard IDs, storage path, and client info
  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('documents')
    .select('backboard_assistant_id, backboard_document_id, storage_path, client_id')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Delete from Backboard first (if IDs exist)
  if (doc.backboard_assistant_id && doc.backboard_document_id) {
    try {
      await deleteBackboardDocument(doc.backboard_assistant_id, doc.backboard_document_id);
    } catch (e) {
      console.error('Failed to delete from Backboard:', e);
      // Continue with Supabase deletion even if Backboard fails
    }
  }

  // Delete from Supabase Storage (if file exists)
  if (doc.storage_path) {
    try {
      await supabaseAdmin.storage.from('documents').remove([doc.storage_path]);
    } catch (e) {
      console.error('Failed to delete from Supabase Storage:', e);
    }
  }

  // Delete from Supabase (cascade handles upload_sessions)
  const { error: deleteError } = await supabaseAdmin
    .from('documents')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Clean up orphaned client (and its matters) if no documents remain
  if (doc.client_id) {
    const { count } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', doc.client_id);

    if (count === 0) {
      // Delete matters first (they reference the client)
      await supabaseAdmin
        .from('matters')
        .delete()
        .eq('client_id', doc.client_id);

      await supabaseAdmin
        .from('clients')
        .delete()
        .eq('id', doc.client_id);
    }
  }

  return NextResponse.json({ success: true });
}
