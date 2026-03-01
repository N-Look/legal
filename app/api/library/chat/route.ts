import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createThread, sendMessage } from '@/lib/backboard/client';

/** Detect if the query is a simple lookup/search or needs deeper analysis */
function isDeepQuery(message: string): boolean {
  const lower = message.toLowerCase().trim();
  const deepPatterns = [
    /^(explain|analyze|compare|contrast|summarize|interpret|evaluate|assess|discuss)/,
    /^(why|how does|how do|how can|how would|what is the (significance|meaning|implication|difference))/,
    /\b(in detail|step by step|thorough|comprehensive|analysis)\b/,
    /\b(relationship between|implications of|pros and cons)\b/,
  ];
  return deepPatterns.some((p) => p.test(lower));
}

function buildLibraryMessage(userMessage: string, documentList: string): string {
  return `[INSTRUCTIONS — follow these exactly:
You are a research assistant searching across a document library. Here are the indexed documents:
${documentList}

RULES:
1. Only discuss documents and content that are RELEVANT to the user's question. Never mention irrelevant documents.
2. When a document is relevant, reference it by exact filename.
3. Wrap exact quotes from documents in «quote»...«/quote» markers.
4. Be concise. Answer in 1-3 short sentences unless the user asks for detail.
5. If nothing is relevant, reply with exactly: "No relevant results found."
6. Never suggest uploading files, never list what you can't do, never give instructions to the user.
7. Never use emojis or markdown headers.]

${userMessage}`;
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

function isUsefulResponse(content: string): boolean {
  const lower = content.toLowerCase();
  const unhelpfulPhrases = [
    'no documents appear to have been uploaded',
    'no files have been uploaded',
    'no files have been shared',
    'i don\'t have any documents',
    'i do not currently have any',
    'i don\'t have visibility into',
    'i don\'t currently see any documents',
    'no documents have been uploaded',
    'please upload',
    'please re-upload',
    'upload the relevant documents',
    'once uploaded',
    'once documents are provided',
    'once documents are available',
    'no files are currently available',
    'i was unable to find any files',
    'i cannot see any uploaded files',
    'no relevant results found',
    'does not appear to be related',
    'does not contain information related',
    'none of the available documents contain',
  ];
  return !unhelpfulPhrases.some((phrase) => lower.includes(phrase));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, threadIds: existingThreadIds } = body as {
    message: string;
    threadIds?: Record<string, string>;
  };

  if (!message || typeof message !== 'string' || message.trim().length < 2) {
    return NextResponse.json({ error: 'Message too short' }, { status: 400 });
  }

  // Only get clients that have indexed documents
  const { data: clientsWithDocs, error } = await supabaseAdmin
    .from('documents')
    .select('client_id, clients!inner(id, name, backboard_assistant_id)')
    .eq('backboard_status', 'indexed')
    .not('clients.backboard_assistant_id', 'is', null);

  if (error || !clientsWithDocs || clientsWithDocs.length === 0) {
    return NextResponse.json(
      { error: 'No indexed documents found.' },
      { status: 404 }
    );
  }

  // Deduplicate clients
  const clientMap = new Map<string, { name: string; assistantId: string }>();
  for (const row of clientsWithDocs) {
    const client = row.clients as unknown as { id: string; name: string; backboard_assistant_id: string };
    if (!clientMap.has(client.id)) {
      clientMap.set(client.id, {
        name: client.name,
        assistantId: client.backboard_assistant_id,
      });
    }
  }

  // Get indexed documents with their IDs for linking
  const { data: indexedDocs } = await supabaseAdmin
    .from('documents')
    .select('id, original_filename, client_id')
    .eq('backboard_status', 'indexed');

  // Build a filename → document ID map for the frontend
  const docIdMap: Record<string, string> = {};
  for (const doc of indexedDocs ?? []) {
    docIdMap[doc.original_filename] = doc.id;
  }

  const clients = Array.from(clientMap.entries());

  try {
    const threadIds: Record<string, string> = { ...(existingThreadIds ?? {}) };

    const docListByClient = clients.map(([clientId]) => {
      const docs = (indexedDocs ?? [])
        .filter((d) => d.client_id === clientId)
        .map((d) => `"${d.original_filename}"`);
      return docs.join(', ');
    }).join(', ');

    // Query client assistants in parallel
    const results = await Promise.allSettled(
      clients.map(async ([, client]) => {
        const assistantId = client.assistantId;

        let threadId = threadIds[assistantId];
        if (!threadId) {
          const thread = await createThread(assistantId);
          threadId = thread.thread_id;
          threadIds[assistantId] = threadId;
        }

        const scopedMessage = buildLibraryMessage(message, docListByClient);
        const modelName = isDeepQuery(message) ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';
        const result = await sendMessage(threadId, scopedMessage, { modelName });
        return {
          clientName: client.name,
          content: result.content,
          quotes: parseQuotes(result.content),
        };
      })
    );

    const allResults = results
      .filter(
        (r): r is PromiseFulfilledResult<{
          clientName: string;
          content: string;
          quotes: string[];
        }> => r.status === 'fulfilled'
      )
      .map((r) => r.value);

    // Only keep responses that actually found something
    const usefulResults = allResults.filter((r) => isUsefulResponse(r.content));

    if (usefulResults.length === 0) {
      return NextResponse.json({
        threadIds,
        content: 'No relevant results found across your documents.',
        quotes: [],
        documentIds: docIdMap,
      });
    }

    let content: string;
    let quotes: string[] = [];

    if (usefulResults.length === 1) {
      content = usefulResults[0].content;
      quotes = usefulResults[0].quotes;
    } else {
      content = usefulResults
        .map((r) => r.content)
        .join('\n\n---\n\n');
      quotes = usefulResults.flatMap((r) => r.quotes);
    }

    return NextResponse.json({
      threadIds,
      content,
      quotes,
      documentIds: docIdMap,
    });
  } catch (e) {
    console.error('Library chat failed:', e);
    return NextResponse.json(
      { error: 'Chat request failed' },
      { status: 500 }
    );
  }
}
