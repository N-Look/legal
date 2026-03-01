import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createThread, sendMessage, updateAssistantPrompt } from '@/lib/backboard/client';

function buildScopedMessage(filename: string, userMessage: string): string {
  // Instruct the model to ALWAYS use the search_documents tool first.
  // Backboard's document retrieval is tool-based — the LLM must invoke
  // search_documents to access indexed chunks. Without this, the model
  // may hallucinate answers instead of searching the actual document.
  return `IMPORTANT: You MUST use the search_documents tool to search "${filename}" before answering. Do NOT answer from memory or general knowledge — ONLY use content retrieved from the document.

Question: ${userMessage}

After searching, respond following these rules:
- ALWAYS include exact quotes from the retrieved content wrapped in «quote»...«/quote» markers to support every factual claim
- Be direct — no preamble like "Based on the document...", no markdown bold (**), no headers (#), no emojis
- Use bullet points only when listing multiple items
- If the search returns no relevant results, say "I could not find this information in the document."
- Never fabricate or guess information not found in the search results`;
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
      // Ensure assistant has a system prompt that instructs document searching
      try {
        await updateAssistantPrompt(
          doc.backboard_assistant_id,
          `You are a legal document assistant. You have access to uploaded legal documents via the search_documents tool. ALWAYS use search_documents to find information before answering any question. Never answer from general knowledge — only use content retrieved from the documents. Include exact quotes from the documents to support your answers.`
        );
      } catch {
        // Non-fatal — assistant may already have a prompt
      }

      const thread = await createThread(doc.backboard_assistant_id);
      threadId = thread.thread_id;
    }

    // Send document-scoped message
    const scopedMessage = buildScopedMessage(doc.original_filename, message);
    const result = await sendMessage(threadId, scopedMessage);

    console.log(`[doc-chat] doc=${id} retrievedFiles=${JSON.stringify(result.retrievedFiles)}`);

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
