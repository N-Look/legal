import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { listDocuments } from '@/lib/backboard/client';
import type { BackboardDocument } from '@/lib/backboard/types';

export async function GET() {
  // Fetch all clients that have a Backboard assistant
  const { data: clients, error: clientsError } = await supabaseAdmin
    .from('clients')
    .select('id, name, backboard_assistant_id')
    .not('backboard_assistant_id', 'is', null);

  if (clientsError) {
    return NextResponse.json({ error: clientsError.message }, { status: 500 });
  }

  // Fetch all documents from Supabase that have Backboard IDs
  const { data: documents, error: docsError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .not('backboard_document_id', 'is', null)
    .order('created_at', { ascending: false });

  if (docsError) {
    return NextResponse.json({ error: docsError.message }, { status: 500 });
  }

  // Fetch Backboard details for each client's assistant
  const backboardDocs = new Map<string, BackboardDocument>();

  await Promise.all(
    clients.map(async (client) => {
      if (!client.backboard_assistant_id) return;
      try {
        const docs = await listDocuments(client.backboard_assistant_id);
        for (const doc of docs) {
          backboardDocs.set(doc.document_id, doc);
        }
      } catch (e) {
        console.error(`Failed to fetch Backboard docs for client ${client.name}:`, e);
      }
    })
  );

  // Build client name lookup
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  // Merge Supabase documents with Backboard details
  const merged = documents.map((doc) => {
    const bb = doc.backboard_document_id
      ? backboardDocs.get(doc.backboard_document_id)
      : null;

    return {
      id: doc.id,
      filename: doc.original_filename,
      client_id: doc.client_id,
      client_name: clientMap.get(doc.client_id) ?? 'Unknown',
      backboard_status: bb?.status ?? doc.backboard_status,
      summary: bb?.summary ?? null,
      chunk_count: bb?.chunk_count ?? null,
      total_tokens: bb?.total_tokens ?? null,
      file_size_bytes: bb?.file_size_bytes ?? doc.file_size,
      created_at: doc.created_at,
    };
  });

  return NextResponse.json(merged);
}
