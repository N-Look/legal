import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a helpful legal document assistant with access to a knowledge base of uploaded legal documents.
Answer questions about the documents concisely and accurately.
When referencing information from documents, be specific about what you found.
If you cannot find relevant information in the knowledge base, say so clearly.
Keep answers focused and practical for legal professionals.`;

const MOCK_ANSWERS = [
  "Based on the documents in your library, I can help you analyze the key arguments and relevant case law. Could you be more specific about what aspect you'd like to explore?",
  "I've reviewed the document context. The key legal issues appear to relate to procedural requirements and evidentiary standards. Let me know if you'd like me to elaborate on any specific point.",
  "From what I can see in your document library, this involves questions of liability and damages. I can provide more detailed analysis if you narrow down your question.",
];

let mockIdx = 0;

interface DocumentContext {
  name: string;
  type: string;
  client?: string;
  matter?: string;
}

async function queryBackboard(
  message: string,
  threadId: string | null,
  assistantId: string | null,
  documentContext?: DocumentContext,
): Promise<{ answer: string; threadId: string }> {
  const apiKey = process.env.BACKBOARD_API_KEY!;
  const baseUrl = process.env.BACKBOARD_API_URL ?? 'https://app.backboard.io/api';

  let asstId = assistantId ?? process.env.BACKBOARD_ASSISTANT_ID ?? null;
  let activeThreadId = threadId;

  if (!activeThreadId) {
    if (!asstId) {
      const asstRes = await fetch(`${baseUrl}/assistants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ name: 'Document Library Assistant', system_prompt: SYSTEM_PROMPT }),
      });
      const asst = await asstRes.json();
      asstId = asst.assistant_id;
    }

    const threadRes = await fetch(`${baseUrl}/assistants/${asstId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({}),
    });

    if (!threadRes.ok) {
      const errBody = await threadRes.text();
      console.error(`[chat] Thread creation failed for assistant ${asstId} (${threadRes.status}):`, errBody);
      throw new Error(`Failed to create thread: ${errBody}`);
    }

    const thread = await threadRes.json();
    activeThreadId = thread.thread_id;
  }

  let content = message;
  if (documentContext) {
    const parts = [`[Document context: "${documentContext.name}"`];
    if (documentContext.type) parts.push(`type: ${documentContext.type}`);
    if (documentContext.client) parts.push(`client: ${documentContext.client}`);
    if (documentContext.matter) parts.push(`matter: ${documentContext.matter}`);
    content = `${parts.join(', ')}]\n\n${message}`;
  }

  const msgRes = await fetch(`${baseUrl}/threads/${activeThreadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ content, memory: 'auto', send_to_llm: true }),
  });

  if (!msgRes.ok) {
    const errBody = await msgRes.text();
    console.error(`[chat] Backboard message failed (${msgRes.status}):`, errBody);
    throw new Error(`Backboard returned ${msgRes.status}`);
  }

  const msg = await msgRes.json();

  if (!msg.content) {
    console.error('[chat] Backboard response missing content:', JSON.stringify(msg).slice(0, 500));
  }

  const answer: string = msg.content ?? 'I was unable to generate a response. Please try again.';

  return { answer, threadId: activeThreadId! };
}

export async function POST(req: NextRequest) {
  try {
    const { message, threadId, assistantId, documentContext } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length < 2) {
      return NextResponse.json({ error: 'Message too short' }, { status: 400 });
    }

    if (process.env.BACKBOARD_API_KEY) {
      const result = await queryBackboard(
        message.trim(),
        threadId ?? null,
        assistantId ?? null,
        documentContext,
      );
      return NextResponse.json(result);
    }

    // Mock fallback
    await new Promise((r) => setTimeout(r, 800));
    const answer = MOCK_ANSWERS[mockIdx % MOCK_ANSWERS.length];
    mockIdx++;
    return NextResponse.json({ answer, threadId: 'mock-thread' });
  } catch (err) {
    console.error('[chat]', err);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
