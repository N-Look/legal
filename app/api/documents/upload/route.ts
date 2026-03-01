import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createAssistant, createThread, uploadDocument } from '@/lib/backboard/client';
import type { DocType } from '@/lib/types/database';

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const file = formData.get('file') as File | null;
  const rawText = formData.get('rawText') as string | null;
  const clientName = formData.get('clientName') as string;
  const matterName = formData.get('matterName') as string | null;
  const docType = (formData.get('docType') as DocType) || 'other';

  if (!clientName?.trim()) {
    return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
  }

  if (!file && !rawText?.trim()) {
    return NextResponse.json({ error: 'File or raw text is required' }, { status: 400 });
  }

  try {
    // 1. Find or create client
    let { data: client } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('name', clientName.trim())
      .single();

    if (!client) {
      let backboardAssistantId: string | null = null;
      try {
        const assistant = await createAssistant(clientName.trim());
        backboardAssistantId = assistant.assistant_id;
      } catch (e) {
        console.error('Failed to create Backboard assistant:', e);
      }

      const { data: newClient, error: clientError } = await supabaseAdmin
        .from('clients')
        .insert({ name: clientName.trim(), backboard_assistant_id: backboardAssistantId })
        .select()
        .single();

      if (clientError) throw new Error(`Failed to create client: ${clientError.message}`);
      client = newClient;

    }
    // If existing client is missing a Backboard assistant, try to create one
    if (!client.backboard_assistant_id) {
      try {
        const assistant = await createAssistant(client.name);
        await supabaseAdmin
          .from('clients')
          .update({ backboard_assistant_id: assistant.assistant_id })
          .eq('id', client.id);
        client = { ...client, backboard_assistant_id: assistant.assistant_id };

      } catch (e) {
        console.error('Failed to create Backboard assistant for existing client:', e);
      }
    }

    // 2. Find or create matter (if provided)
    let matterId: string | null = null;
    if (matterName?.trim()) {
      let { data: matter } = await supabaseAdmin
        .from('matters')
        .select('*')
        .eq('client_id', client.id)
        .eq('name', matterName.trim())
        .single();

      if (!matter) {
        let backboardThreadId: string | null = null;
        if (client.backboard_assistant_id) {
          try {
            const thread = await createThread(client.backboard_assistant_id);
            backboardThreadId = thread.thread_id;
          } catch (e) {
            console.error('Failed to create Backboard thread:', e);
          }
        }

        const { data: newMatter, error: matterError } = await supabaseAdmin
          .from('matters')
          .insert({
            client_id: client.id,
            name: matterName.trim(),
            backboard_thread_id: backboardThreadId,
          })
          .select()
          .single();

        if (matterError) throw new Error(`Failed to create matter: ${matterError.message}`);
        matter = newMatter;
      }
      matterId = matter.id;
    }
    // 3. Determine file details
    const isRawText = !file;
    const originalFilename = file ? file.name : 'Pasted Text';
    // Sanitize for storage: normalize unicode, strip non-ASCII, replace unsafe chars
    const sanitizeForStorage = (name: string) =>
      name.normalize('NFKD').replace(/[^\x00-\x7F]/g, '-').replace(/[^a-zA-Z0-9._\-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
    const filename = file ? sanitizeForStorage(file.name) : `raw-text-${Date.now()}.txt`;
    const fileSize = file ? file.size : new Blob([rawText!]).size;
    const mimeType = file ? file.type : 'text/plain';

    // 4. Insert document metadata
    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        client_id: client.id,
        matter_id: matterId,
        filename,
        original_filename: originalFilename,
        file_size: fileSize,
        mime_type: mimeType,
        doc_type: docType,
        backboard_assistant_id: client.backboard_assistant_id,
        backboard_status: 'uploading',
        is_raw_text: isRawText,
        metadata: {},
      })
      .select()
      .single();

    if (docError) throw new Error(`Failed to insert document: ${docError.message}`);
    // 5. Create upload session + buffer file in parallel
    //    (session insert needs doc.id but not the file buffer, and buffering is independent)
    const sourceBlob = file || new Blob([rawText!], { type: 'text/plain' });
    const [sessionResult, fileBuffer] = await Promise.all([
      supabaseAdmin
        .from('upload_sessions')
        .insert({ document_id: doc.id, status: 'uploading' })
        .select()
        .single(),
      sourceBlob.arrayBuffer().then((ab) => Buffer.from(ab)),
    ]);

    const { data: session, error: sessionError } = sessionResult;
    if (sessionError) throw new Error(`Failed to create upload session: ${sessionError.message}`);
    const storagePath = `${client.id}/${doc.id}/${filename}`;

    // 7. Upload to Supabase Storage and Backboard in parallel
    if (client.backboard_assistant_id) {
      const storagePromise = supabaseAdmin.storage
        .from('documents')
        .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false })
        .then(async ({ error: storageError }) => {
          if (storageError) {
            console.error('Supabase Storage upload error:', storageError);
          } else {
            await supabaseAdmin
              .from('documents')
              .update({ storage_path: storagePath })
              .eq('id', doc.id);
          }
        })
        .catch((e) => {
          console.error('Failed to upload to Supabase Storage:', e);
        });

      const backboardBlob = new Blob([fileBuffer], { type: mimeType });
      const backboardPromise = uploadDocument(
        client.backboard_assistant_id,
        backboardBlob,
        filename
      );

      try {
        const [, bbDoc] = await Promise.all([storagePromise, backboardPromise]);
        // Update document and session status in parallel
        await Promise.all([
          supabaseAdmin
            .from('documents')
            .update({
              backboard_document_id: bbDoc.document_id,
              backboard_status: 'processing',
            })
            .eq('id', doc.id),
          supabaseAdmin
            .from('upload_sessions')
            .update({ status: 'processing' })
            .eq('id', session.id),
        ]);

        return NextResponse.json({
          documentId: doc.id,
          sessionId: session.id,
          status: 'processing' as const,
        }, { status: 201 });
      } catch (e) {
        console.error('Failed to upload to Backboard:', e);
        await Promise.all([
          supabaseAdmin
            .from('documents')
            .update({ backboard_status: 'error' })
            .eq('id', doc.id),
          supabaseAdmin
            .from('upload_sessions')
            .update({ status: 'error', error_message: String(e) })
            .eq('id', session.id),
        ]);

        return NextResponse.json(
          { error: `Failed to upload to document service: ${e instanceof Error ? e.message : 'Unknown error'}` },
          { status: 502 }
        );
      }
    }

    // No Backboard assistant — still upload to storage
    try {
      const { error: storageError } = await supabaseAdmin.storage
        .from('documents')
        .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });
      if (storageError) {
        console.error('Supabase Storage upload error:', storageError);
      } else {
        await supabaseAdmin
          .from('documents')
          .update({ storage_path: storagePath })
          .eq('id', doc.id);
      }
    } catch (e) {
      console.error('Failed to upload to Supabase Storage:', e);
    }

    // No Backboard assistant — mark as error so the frontend doesn't poll forever
    await supabaseAdmin
      .from('documents')
      .update({ backboard_status: 'error' })
      .eq('id', doc.id);

    await supabaseAdmin
      .from('upload_sessions')
      .update({ status: 'error', error_message: 'Document service not configured' })
      .eq('id', session.id);

    return NextResponse.json(
      { error: 'Document service is not configured. Check your Backboard API key.' },
      { status: 503 }
    );

  } catch (e) {
    console.error('Upload error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
