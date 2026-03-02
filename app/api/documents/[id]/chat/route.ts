import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  createThread,
  sendMessage,
  updateAssistantPrompt,
  getOrCreatePlainAssistant,
} from '@/lib/backboard/client';

const MAX_CONTEXT_CHARS = 100_000;

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(globalThis as any).pdfjsWorker) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useWorkerFetch: false, isEvalSupported: false } as Parameters<typeof pdfjs.getDocument>[0]).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n\n');
}

async function extractDocumentText(storagePath: string, mimeType: string | null): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .download(storagePath);

    if (error || !data) {
      console.error('[doc-chat] Failed to download document:', error);
      return null;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const resolvedMime = mimeType || (storagePath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : null);

    if (resolvedMime === 'application/pdf' || storagePath.toLowerCase().endsWith('.pdf')) {
      return await extractPdfText(buffer);
    }

    if (resolvedMime?.startsWith('text/')) {
      return buffer.toString('utf-8');
    }

    return null;
  } catch (e) {
    console.error('[doc-chat] Failed to extract document text:', e);
    return null;
  }
}

const SYSTEM_PROMPT = `You answer questions about a legal document. Follow these rules strictly:
- Answer the user's question immediately. Your very first sentence must be the answer.
- NEVER greet, introduce yourself, summarize the document, or offer to help.
- NEVER say "Thank you", "I have read", "The document contains", or any preamble.
- NEVER ask the user to clarify. Answer based on what is asked.
- Use only content from the document. Never use general knowledge or fabricate information.
- Include exact quotes wrapped in «quote»...«/quote» markers to support factual claims.
- No markdown bold (**), no headers (#), no emojis.
- NEVER respond in JSON format. Always respond in plain text.
- Use bullet points only when listing multiple items.
- If the information is not in the document, say only: "I could not find this information in the document."`;

function buildDirectMessage(documentText: string, userMessage: string): string {
  const text = documentText.length > MAX_CONTEXT_CHARS
    ? documentText.slice(0, MAX_CONTEXT_CHARS) + '\n\n[... document truncated ...]'
    : documentText;

  // Question goes BEFORE the document so the model knows what to look for
  // while processing the long document text, then is repeated after as a reminder.
  return `The user's question is: "${userMessage}"

Find the answer to this specific question in the following document.

<document>
${text}
</document>

Now answer this question: ${userMessage}`;
}

function buildBackboardFallbackMessage(filename: string, userMessage: string): string {
  return `IMPORTANT: You MUST use the search_documents tool to search "${filename}" before answering. Do NOT answer from memory or general knowledge — ONLY use content retrieved from the document.

Question: ${userMessage}

After searching, respond following these rules:
- Answer the question directly using only content found in the document.
- Include exact quotes from the retrieved content wrapped in «quote»...«/quote» markers to support factual claims.
- Be direct — no preamble, no markdown bold (**), no headers (#), no emojis.
- Use bullet points only when listing multiple items.
- NEVER mention the search tool, retrieval process, tool failures, or any technical limitations.
- NEVER say things like "my search tool did not return...", "I was unable to retrieve...", or similar meta-commentary.
- If the information truly is not in the document, say only: "I could not find this information in the document."
- Never fabricate or guess information not found in the search results.`;
}

/**
 * If the model returns a JSON object with "answer" and/or "source" fields,
 * extract them into plain text so the UI doesn't show raw JSON.
 */
function unwrapJsonResponse(raw: string): string {
  const trimmed = raw.trim();
  if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) return raw;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed.answer === 'string') {
      let result = parsed.answer;
      if (typeof parsed.source === 'string' && parsed.source.trim()) {
        result += `\n\n«quote»${parsed.source}«/quote»`;
      }
      return result;
    }
  } catch {
    // Not valid JSON — return as-is
  }
  return raw;
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

  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .select('backboard_assistant_id, backboard_document_id, original_filename, storage_path, mime_type')
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
    // Try to extract document text for direct context injection
    let documentText: string | null = null;
    if (doc.storage_path) {
      documentText = await extractDocumentText(doc.storage_path, doc.mime_type);
      console.log('[doc-chat] extracted text length:', documentText?.length ?? 'null');
    }

    // Path A: We have document text — use a plain assistant (no documents attached)
    // so Backboard won't inject the search_documents tool that overrides our context.
    if (documentText) {
      console.log('[doc-chat] Using plain assistant (no search tool)');
      const plainAssistantId = await getOrCreatePlainAssistant(SYSTEM_PROMPT);
      const thread = await createThread(plainAssistantId);

      const directMessage = buildDirectMessage(documentText, message);
      const result = await sendMessage(thread.thread_id, directMessage);
      const content = unwrapJsonResponse(result.content);
      const quotes = parseQuotes(content);

      return NextResponse.json({
        threadId: thread.thread_id,
        content,
        messageId: result.messageId,
        quotes,
      });
    }

    // Path B: No document text — fall back to Backboard RAG with search_documents
    console.log('[doc-chat] Using Backboard RAG fallback');
    let threadId = existingThreadId;
    if (!threadId) {
      try {
        await updateAssistantPrompt(doc.backboard_assistant_id, SYSTEM_PROMPT);
      } catch {
        // Non-fatal
      }
      const thread = await createThread(doc.backboard_assistant_id);
      threadId = thread.thread_id;
    }

    const scopedMessage = buildBackboardFallbackMessage(doc.original_filename, message);
    const result = await sendMessage(threadId, scopedMessage);
    const content = unwrapJsonResponse(result.content);
    const quotes = parseQuotes(content);

    return NextResponse.json({
      threadId,
      content,
      messageId: result.messageId,
      quotes,
    });
  } catch (e) {
    console.error('Document chat failed:', e);

    const isIndexing =
      e instanceof Error &&
      (e.message.includes('still being indexed') || e.message.includes('still being processed'));
    if (isIndexing) {
      return NextResponse.json(
        { error: 'Documents are still being indexed. Please wait a moment and try again.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Chat request failed' }, { status: 500 });
  }
}
