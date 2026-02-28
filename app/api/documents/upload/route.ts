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
  const matterNumber = formData.get('matterNumber') as string | null;
  const docType = (formData.get('docType') as DocType) || 'other';
  const jurisdiction = formData.get('jurisdiction') as string | null;
  const court = formData.get('court') as string | null;

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
            matter_number: matterNumber || null,
            backboard_thread_id: backboardThreadId,
            jurisdiction: jurisdiction || null,
            court: court || null,
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
    const filename = file ? file.name : `raw-text-${Date.now()}.txt`;
    const originalFilename = file ? file.name : 'Pasted Text';
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
        metadata: { jurisdiction, court },
      })
      .select()
      .single();

    if (docError) throw new Error(`Failed to insert document: ${docError.message}`);

    // 5. Create upload session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('upload_sessions')
      .insert({ document_id: doc.id, status: 'uploading' })
      .select()
      .single();

    if (sessionError) throw new Error(`Failed to create upload session: ${sessionError.message}`);

    // 6. Upload to Backboard (if assistant exists)
    if (client.backboard_assistant_id) {
      try {
        const uploadBlob = file || new Blob([rawText!], { type: 'text/plain' });
        const bbDoc = await uploadDocument(
          client.backboard_assistant_id,
          uploadBlob,
          filename
        );

        await supabaseAdmin
          .from('documents')
          .update({
            backboard_document_id: bbDoc.document_id,
            backboard_status: 'processing',
          })
          .eq('id', doc.id);

        await supabaseAdmin
          .from('upload_sessions')
          .update({ status: 'processing' })
          .eq('id', session.id);

        return NextResponse.json({
          documentId: doc.id,
          sessionId: session.id,
          status: 'processing' as const,
        }, { status: 201 });
      } catch (e) {
        console.error('Failed to upload to Backboard:', e);
        await supabaseAdmin
          .from('documents')
          .update({ backboard_status: 'error' })
          .eq('id', doc.id);

        await supabaseAdmin
          .from('upload_sessions')
          .update({ status: 'error', error_message: String(e) })
          .eq('id', session.id);

        return NextResponse.json(
          { error: `Failed to upload to document service: ${e instanceof Error ? e.message : 'Unknown error'}` },
          { status: 502 }
        );
      }
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
