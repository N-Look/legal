import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createThread, sendMessage, updateAssistantPrompt } from '@/lib/backboard/client';
// Maximum characters of document text to include in context.
// ~100k chars ≈ ~25k tokens, leaving room for the model's response.
const MAX_CONTEXT_CHARS = 100_000;

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
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

    if (mimeType === 'application/pdf') {
      return await extractPdfText(buffer);
    }

    if (mimeType?.startsWith('text/')) {
      return buffer.toString('utf-8');
    }

    return null;
  } catch (e) {
    console.error('[doc-chat] Failed to extract document text:', e);
    return null;
  }
}

function buildScopedMessage(
  filename: string,
  userMessage: string,
  documentText: string | null
): string {
  if (documentText) {
    // Truncate if too long
    const text = documentText.length > MAX_CONTEXT_CHARS
      ? documentText.slice(0, MAX_CONTEXT_CHARS) + '\n\n[... document truncated ...]'
      : documentText;

    return `Here is the full text of the document "${filename}":

<document>
${text}
</document>

Question: ${userMessage}

Respond following these rules:
- ONLY use content from the document above. Never use general knowledge or fabricate information.
- ALWAYS include exact quotes from the document wrapped in «quote»...«/quote» markers to support every factual claim.
- Be direct — no preamble like "Based on the document...", no markdown bold (**), no headers (#), no emojis.
- Use bullet points only when listing multiple items.
- If the information is not in the document, say "I could not find this information in the document."`;
  }

  // Fallback: no document text available, rely on Backboard search
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

  // Fetch document to get Backboard IDs and storage path
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
    // Extract document text from storage for direct context injection.
    // This bypasses Backboard's search_documents tool which may not
    // reliably return indexed chunks.
    let documentText: string | null = null;
    if (doc.storage_path) {
      documentText = await extractDocumentText(doc.storage_path, doc.mime_type);
    }

    // Create a new thread or reuse existing one
    let threadId = existingThreadId;
    if (!threadId) {
      // Ensure assistant has a system prompt
      try {
        await updateAssistantPrompt(
          doc.backboard_assistant_id,
          `You are a legal document assistant. Answer questions about legal documents accurately using only the document content provided. Always include exact quotes from the document to support your answers. Wrap quotes in «quote»...«/quote» markers. Be direct and concise. No markdown bold, no headers, no emojis.`
        );
      } catch {
        // Non-fatal
      }

      const thread = await createThread(doc.backboard_assistant_id);
      threadId = thread.thread_id;
    }

    // Send message with document text injected into context
    const scopedMessage = buildScopedMessage(doc.original_filename, message, documentText);
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
