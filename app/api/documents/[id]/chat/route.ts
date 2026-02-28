import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createThread, sendMessage } from '@/lib/backboard/client';

function buildScopedMessage(filename: string, userMessage: string): string {
  return `[System context: You are answering questions about a specific document titled "${filename}".
Only answer using content from this document. When quoting text from the document, wrap exact quotes in «quote»...«/quote» markers.
If the information is not found in the document, say so clearly. Do not fabricate or guess.]

User question: ${userMessage}`;
}

function parseQuotes(content: string): string[] {
  const quotes: string[] = [];
  const regex = /«quote»([\s\S]*?)«\/quote»/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    quotes.push(match[1].trim());
  }
  return quotes;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await req.json();
  const { message, threadId: existingThreadId } = body as {
    message: string;
    threadId?: string;
  };

  if (!message || typeof message !== 'string' || message.trim().length < 2) {
    return NextResponse.json({ error: 'Message too short' }, { status: 400 });
  }

  // Fetch document to get Backboard IDs
  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .select('backboard_assistant_id, backboard_document_id, original_filename')
    .eq('id', id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  if (!doc.backboard_assistant_id) {
    return NextResponse.json(
      { error: 'Document has no associated AI assistant' },
      { status: 400 }
    );
  }

  try {
    // Create a new thread or reuse existing one
    let threadId = existingThreadId;
    if (!threadId) {
      const thread = await createThread(doc.backboard_assistant_id);
      threadId = thread.thread_id;
    }

    // Send document-scoped message
    const scopedMessage = buildScopedMessage(doc.original_filename, message);
    const result = await sendMessage(threadId, scopedMessage);

    // Parse quotes from response
    const quotes = parseQuotes(result.content);

    return NextResponse.json({
      threadId,
      content: result.content,
      messageId: result.messageId,
      quotes,
    });
  } catch (e) {
    console.error('Document chat failed:', e);
    return NextResponse.json({ error: 'Chat request failed' }, { status: 500 });
  }
}
