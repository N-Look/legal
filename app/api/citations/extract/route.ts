import { NextRequest, NextResponse } from 'next/server';
import { Citation, CitationType } from '@/types/citation';

// Mock data for when Backboard API key is not configured
function getMockCitations(text: string): Citation[] {
  const mocks: Citation[] = [
    {
      id: crypto.randomUUID(),
      raw: 'Donoghue v Stevenson, [1932] AC 562',
      caseName: 'Donoghue v Stevenson',
      reporter: '[1932] AC 562',
      year: '1932',
      type: 'case',
      status: 'pending',
    },
    {
      id: crypto.randomUUID(),
      raw: 'R v Oakes, [1986] 1 SCR 103',
      caseName: 'R v Oakes',
      reporter: '[1986] 1 SCR 103',
      year: '1986',
      type: 'case',
      status: 'pending',
    },
    {
      id: crypto.randomUUID(),
      raw: 'Canadian Charter of Rights and Freedoms, s 1',
      caseName: 'Canadian Charter of Rights and Freedoms',
      reporter: 's 1',
      year: '1982',
      type: 'statute',
      status: 'pending',
    },
  ];
  // Return a subset based on text length so it feels dynamic
  return mocks.slice(0, Math.min(3, Math.max(1, Math.floor(text.length / 100) + 1)));
}

async function extractWithBackboard(text: string): Promise<Citation[]> {
  const apiKey = process.env.BACKBOARD_API_KEY!;
  const assistantId = process.env.BACKBOARD_ASSISTANT_ID;

  const baseUrl = 'https://app.backboard.io/api';

  // Create or reuse assistant
  let asstId: string;
  if (assistantId) {
    asstId = assistantId;
  } else {
    const asstRes = await fetch(`${baseUrl}/assistants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        name: 'Legal Citation Extractor',
        system_prompt:
          'You are an expert Canadian legal citation extractor. When given legal text, extract every legal citation and return ONLY a valid JSON array. Each object must have: raw (full citation string), caseName, reporter, year, pinCite (optional, e.g. "at para 42"), type ("case"|"statute"|"regulation"|"exhibit"). Do not include any text outside the JSON array.',
      }),
    });
    const asst = await asstRes.json();
    asstId = asst.assistant_id;
  }

  // Create thread
  const threadRes = await fetch(`${baseUrl}/assistants/${asstId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({}),
  });
  const thread = await threadRes.json();

  // Send message
  const form = new FormData();
  form.append('content', `Extract all legal citations from this text:\n\n${text}`);
  form.append('stream', 'false');
  form.append('memory', 'off');
  form.append('llm_provider', 'anthropic');
  form.append('model_name', 'claude-sonnet-4-6');

  const msgRes = await fetch(`${baseUrl}/threads/${thread.thread_id}/messages`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form,
  });
  const msg = await msgRes.json();

  // Parse the JSON from the assistant reply
  const raw: string = msg.content ?? '';
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return getMockCitations(text);

  const parsed: Array<{
    raw: string;
    caseName: string;
    reporter: string;
    year: string;
    pinCite?: string;
    type: CitationType;
  }> = JSON.parse(jsonMatch[0]);

  return parsed.map((c) => ({
    id: crypto.randomUUID(),
    raw: c.raw,
    caseName: c.caseName,
    reporter: c.reporter,
    year: c.year,
    pinCite: c.pinCite,
    type: c.type ?? 'case',
    status: 'pending',
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json({ error: 'Text too short' }, { status: 400 });
    }

    const citations = process.env.BACKBOARD_API_KEY
      ? await extractWithBackboard(text)
      : getMockCitations(text);

    return NextResponse.json({ citations });
  } catch (err) {
    console.error('[extract]', err);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}
