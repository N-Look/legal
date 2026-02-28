import { NextRequest, NextResponse } from 'next/server';
import { Citation } from '@/types/citation';

const SYSTEM_PROMPT = `You are a legal research assistant with access to a knowledge base of case law and statutes.

When answering a question:
1. Provide a clear, direct answer grounded ONLY in documents from your knowledge base.
2. Include inline citations with full case names, reporter citations, and pin-cites.
3. After your answer, output a JSON block fenced with \`\`\`citations ... \`\`\` containing an array of every authority you cited. Each object must have: raw (full citation string), caseName, reporter, year, pinCite (if any), type ("case"|"statute"|"regulation"), passage (the exact sentence or passage you relied on).

If you cannot find relevant authority in your knowledge base, say so clearly. Never fabricate citations.`;

const MOCK_RESPONSES: Record<string, { answer: string; citations: Citation[] }> = {
  default: {
    answer:
      'Due process requires that an individual receive timely and adequate notice detailing the reasons for a proposed termination, and an effective opportunity to defend by confronting any adverse witnesses and by presenting arguments and evidence orally. The hearing must take place before the termination of benefits to satisfy constitutional requirements.\n\n*Goldberg v. Kelly*, 397 U.S. 254, 267–68 (1970).\n\nThe Supreme Court emphasized that "the extent to which procedural due process must be afforded the recipient is influenced by the extent to which he may be \'condemned to suffer grievous loss.\'" The Court held that welfare benefits are a matter of statutory entitlement for persons qualified to receive them, and their termination involves state action that adjudicates important rights.',
    citations: [
      {
        id: crypto.randomUUID(),
        raw: 'Goldberg v. Kelly, 397 U.S. 254, 267–68 (1970)',
        caseName: 'Goldberg v. Kelly',
        reporter: '397 U.S. 254',
        year: '1970',
        pinCite: 'at 267–68',
        type: 'case',
        status: 'resolved',
        passage:
          'The extent to which procedural due process must be afforded the recipient is influenced by the extent to which he may be "condemned to suffer grievous loss." Due process requires timely and adequate notice detailing the reasons for a proposed termination, and an effective opportunity to defend.',
        source: 'Goldberg v. Kelly, 397 U.S. 254 (1970)',
      },
    ],
  },
  oakes: {
    answer:
      'The Oakes test governs the application of section 1 of the *Canadian Charter of Rights and Freedoms*, which permits "such reasonable limits prescribed by law as can be demonstrably justified in a free and democratic society." The test requires two things: (1) the objective of the measure must be of sufficient importance to warrant overriding a constitutionally protected right, and (2) the means chosen must be proportional — rationally connected to the objective, minimally impairing the right, and proportionate in effect.\n\n*R v Oakes*, [1986] 1 SCR 103 at paras 69–71.',
    citations: [
      {
        id: crypto.randomUUID(),
        raw: 'R v Oakes, [1986] 1 SCR 103 at paras 69–71',
        caseName: 'R v Oakes',
        reporter: '[1986] 1 SCR 103',
        year: '1986',
        pinCite: 'at paras 69–71',
        type: 'case',
        status: 'resolved',
        passage:
          'To establish that a limit is reasonable and demonstrably justified, two criteria must be satisfied. First, the objective must be of sufficient importance. Second, the party invoking s. 1 must show the means are reasonable and demonstrably justified through a proportionality test.',
        source: 'R v Oakes [1986] 1 SCR 103 (SCC)',
      },
    ],
  },
  dunsmuir: {
    answer:
      'The standard of review for administrative decisions was overhauled in *Dunsmuir v New Brunswick*, which collapsed the previous three standards into two: correctness and reasonableness. Reasonableness is now the presumptive standard for judicial review of administrative decisions, requiring that the decision be transparent, intelligible, and justified.\n\n*Dunsmuir v New Brunswick*, 2008 SCC 9 at paras 47–49.',
    citations: [
      {
        id: crypto.randomUUID(),
        raw: 'Dunsmuir v New Brunswick, 2008 SCC 9 at paras 47–49',
        caseName: 'Dunsmuir v New Brunswick',
        reporter: '2008 SCC 9',
        year: '2008',
        pinCite: 'at paras 47–49',
        type: 'case',
        status: 'resolved',
        passage:
          'Reasonableness is concerned mostly with the existence of justification, transparency and intelligibility within the decision-making process, and with whether the decision falls within a range of possible, acceptable outcomes.',
        source: 'Dunsmuir v New Brunswick, 2008 SCC 9 (SCC)',
      },
    ],
  },
};

function pickMock(question: string): { answer: string; citations: Citation[] } {
  const q = question.toLowerCase();
  if (q.includes('oakes') || q.includes('section 1') || q.includes('charter')) return MOCK_RESPONSES.oakes;
  if (q.includes('dunsmuir') || q.includes('standard of review') || q.includes('reasonableness')) return MOCK_RESPONSES.dunsmuir;
  return MOCK_RESPONSES.default;
}

function parseCitationsFromResponse(raw: string): { answer: string; citations: Citation[] } {
  // Try to find the fenced citations JSON block
  const fenceMatch = raw.match(/```citations\s*([\s\S]*?)```/);
  let citations: Citation[] = [];
  let answer = raw;

  if (fenceMatch) {
    answer = raw.replace(/```citations[\s\S]*?```/, '').trim();
    try {
      const parsed = JSON.parse(fenceMatch[1]);
      citations = (Array.isArray(parsed) ? parsed : []).map(
        (c: { raw: string; caseName: string; reporter: string; year: string; pinCite?: string; type?: string; passage?: string }) => ({
          id: crypto.randomUUID(),
          raw: c.raw,
          caseName: c.caseName,
          reporter: c.reporter,
          year: c.year,
          pinCite: c.pinCite,
          type: (c.type as Citation['type']) ?? 'case',
          status: 'resolved' as const,
          passage: c.passage,
          source: c.raw,
        })
      );
    } catch {
      // If JSON parsing fails, try to extract from the answer text
    }
  }

  // If no citations were parsed from JSON, try regex on the answer
  if (citations.length === 0) {
    const citeRegex = /([A-Z][a-zA-Z']+(?:\s+(?:v|c|and)\s+[A-Z][a-zA-Z']+)+),?\s+(\[?\d{4}\]?\s+\d*\s*[A-Z.\s]+\d+)(?:,?\s+(at\s+(?:para(?:s)?\.?\s*)?\d[\d–-]*))?/g;
    let m;
    while ((m = citeRegex.exec(answer)) !== null) {
      const yearMatch = m[2].match(/\d{4}/);
      citations.push({
        id: crypto.randomUUID(),
        raw: m[0],
        caseName: m[1].trim(),
        reporter: m[2].trim(),
        year: yearMatch?.[0] ?? '',
        pinCite: m[3]?.trim(),
        type: 'case',
        status: 'resolved',
        passage: '',
        source: m[0],
      });
    }
  }

  return { answer, citations };
}

async function queryBackboard(question: string): Promise<{ answer: string; citations: Citation[] }> {
  const apiKey = process.env.BACKBOARD_API_KEY!;
  const assistantId = process.env.BACKBOARD_ASSISTANT_ID;
  const baseUrl = 'https://app.backboard.io/api';

  let asstId = assistantId;
  if (!asstId) {
    const asstRes = await fetch(`${baseUrl}/assistants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        name: 'Legal Research Assistant',
        system_prompt: SYSTEM_PROMPT,
        llm_provider: 'anthropic',
        llm_model_name: 'claude-sonnet-4-6',
      }),
    });
    const asst = await asstRes.json();
    asstId = asst.assistant_id;
  }

  const threadRes = await fetch(`${baseUrl}/assistants/${asstId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({}),
  });
  const thread = await threadRes.json();

  const msgRes = await fetch(`${baseUrl}/threads/${thread.thread_id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({
      content: question,
      memory: 'auto',
      send_to_llm: true,
    }),
  });
  const msg = await msgRes.json();
  const raw: string = msg.content ?? msg.response ?? msg.message ?? '';

  return parseCitationsFromResponse(raw);
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      return NextResponse.json({ error: 'Question too short' }, { status: 400 });
    }

    const result = process.env.BACKBOARD_API_KEY
      ? await queryBackboard(question)
      : pickMock(question);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[query]', err);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}
