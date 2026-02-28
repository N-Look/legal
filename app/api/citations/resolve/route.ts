import { NextRequest, NextResponse } from 'next/server';
import { Citation, CitationStatus } from '@/types/citation';

const MOCK_PASSAGES: Record<string, { passage: string; source: string; status: CitationStatus }> = {
  case: {
    passage:
      'The neighbour principle established that you must take reasonable care to avoid acts or omissions which you can reasonably foresee would be likely to injure your neighbour.',
    source: 'Donoghue v Stevenson [1932] AC 562 (HL)',
    status: 'resolved',
  },
  statute: {
    passage:
      'The rights and freedoms set out in it subject only to such reasonable limits prescribed by law as can be demonstrably justified in a free and democratic society.',
    source: 'Canadian Charter of Rights and Freedoms, s 1',
    status: 'resolved',
  },
  regulation: {
    passage: 'As prescribed under the applicable regulatory framework.',
    source: 'Federal Regulations',
    status: 'ambiguous',
  },
  exhibit: {
    passage: 'Exhibit not found in current knowledge base.',
    source: '',
    status: 'unresolved',
  },
};

async function resolveWithBackboard(citations: Citation[]): Promise<Citation[]> {
  const apiKey = process.env.BACKBOARD_API_KEY!;
  const assistantId = process.env.BACKBOARD_ASSISTANT_ID;
  const baseUrl = 'https://app.backboard.io/api';

  let asstId = assistantId;
  if (!asstId) {
    const asstRes = await fetch(`${baseUrl}/assistants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        name: 'Legal Citation Resolver',
        system_prompt:
          'You are a Canadian legal authority. Given a legal citation, search your knowledge base for the case or statute. Return a JSON object with: status ("resolved"|"ambiguous"|"unresolved"), passage (relevant excerpt, max 2 sentences), source (canonical name + citation). If not found, set status to "unresolved" and leave passage empty.',
      }),
    });
    const asst = await asstRes.json();
    asstId = asst.assistant_id;
  }

  // Create one thread for the whole batch
  const threadRes = await fetch(`${baseUrl}/assistants/${asstId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({}),
  });
  const thread = await threadRes.json();

  const resolved: Citation[] = [];

  for (const citation of citations) {
    try {
      const form = new FormData();
      form.append('content', `Find this citation in your knowledge base and return JSON: "${citation.raw}"`);
      form.append('stream', 'false');
      form.append('memory', 'auto');
      form.append('llm_provider', 'anthropic');
      form.append('model_name', 'claude-sonnet-4-6');

      const msgRes = await fetch(`${baseUrl}/threads/${thread.thread_id}/messages`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey },
        body: form,
      });
      const msg = await msgRes.json();
      const raw: string = msg.content ?? '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const data: { status: CitationStatus; passage?: string; source?: string } = JSON.parse(
          jsonMatch[0]
        );
        resolved.push({
          ...citation,
          status: data.status ?? 'unresolved',
          passage: data.passage,
          source: data.source,
        });
      } else {
        resolved.push({ ...citation, status: 'unresolved' });
      }
    } catch {
      resolved.push({ ...citation, status: 'unresolved' });
    }
  }

  return resolved;
}

function resolveMock(citations: Citation[]): Citation[] {
  return citations.map((c, i) => {
    const mock = MOCK_PASSAGES[c.type] ?? MOCK_PASSAGES.case;
    // Simulate one ambiguous and one unresolved for variety
    if (i === 1) return { ...c, status: 'ambiguous', passage: mock.passage, source: mock.source };
    if (i >= 3) return { ...c, status: 'unresolved' };
    return { ...c, ...mock };
  });
}

export async function POST(req: NextRequest) {
  try {
    const { citations } = await req.json();
    if (!Array.isArray(citations) || citations.length === 0) {
      return NextResponse.json({ error: 'No citations provided' }, { status: 400 });
    }

    const resolved = process.env.BACKBOARD_API_KEY
      ? await resolveWithBackboard(citations)
      : resolveMock(citations);

    return NextResponse.json({ citations: resolved });
  } catch (err) {
    console.error('[resolve]', err);
    return NextResponse.json({ error: 'Resolution failed' }, { status: 500 });
  }
}
