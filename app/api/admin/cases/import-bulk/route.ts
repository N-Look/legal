import { NextRequest } from 'next/server';
import { fetchRssCases } from '@/lib/canlii/rss';

interface CaseEntry {
  databaseId: string;
  caseId: string;
  title: string;
  citation: string;
  url?: string;
  decisionDate?: string;
}

async function fetchAllCasesFromApi(databaseId: string, canliiApiKey: string): Promise<CaseEntry[]> {
  const all: CaseEntry[] = [];
  let offset = 0;
  const resultCount = 100;

  while (true) {
    const res = await fetch(
      `https://api.canlii.org/v1/caseBrowse/en/${encodeURIComponent(databaseId)}/?api_key=${canliiApiKey}&offset=${offset}&resultCount=${resultCount}`
    );
    if (!res.ok) break;
    const data = await res.json();
    const cases: CaseEntry[] = (data.cases ?? []).map(
      (c: { databaseId?: string; caseId: string; title: string; citation: string; url?: string; decisionDate?: string }) => ({
        databaseId: c.databaseId ?? databaseId,
        caseId: c.caseId,
        title: c.title,
        citation: c.citation,
        url: c.url,
        decisionDate: c.decisionDate,
      })
    );
    all.push(...cases);
    if (cases.length < resultCount) break;
    offset += resultCount;
    if (all.length > 5000) break;
  }

  return all;
}

async function fetchCaseText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LexAI/1.0 (legal research)' },
      signal: AbortSignal.timeout(15_000),
    });
    const html = await res.text();
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 40_000);
  } catch {
    return '';
  }
}

async function uploadToBackboard(
  assistantId: string,
  apiKey: string,
  title: string,
  citation: string,
  text: string,
  meta: Record<string, string>
): Promise<void> {
  const baseUrl = 'https://app.backboard.io/api';
  const form = new FormData();
  form.append(
    'file',
    new Blob([`${title}\n${citation}\n\n${text}`], { type: 'text/plain' }),
    `${citation.replace(/[^a-z0-9]/gi, '_').slice(0, 80)}.txt`
  );
  form.append('metadata', JSON.stringify({ title, citation, ...meta }));

  await fetch(`${baseUrl}/assistants/${assistantId}/documents`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form,
  });
}

function encode(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const databaseIdsParam = searchParams.get('databaseIds') ?? '';
  const databaseIds = databaseIdsParam.split(',').map((s) => s.trim()).filter(Boolean);

  if (databaseIds.length === 0) {
    return new Response('databaseIds param required', { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = (data: object) => controller.enqueue(new TextEncoder().encode(encode(data)));

      const canliiKey = process.env.CANLII_API_KEY;
      const backboardKey = process.env.BACKBOARD_API_KEY;
      const assistantId = process.env.BACKBOARD_ASSISTANT_ID;

      let totalImported = 0;
      let totalFailed = 0;

      for (const dbId of databaseIds) {
        enc({ type: 'database_start', databaseId: dbId });

        let cases: CaseEntry[];

        if (canliiKey) {
          try {
            cases = await fetchAllCasesFromApi(dbId, canliiKey);
          } catch {
            enc({ type: 'error', databaseId: dbId, message: 'Failed to fetch from CanLII API' });
            continue;
          }
        } else {
          // No CanLII API key — use public RSS feed
          cases = await fetchRssCases(dbId);
          if (cases.length === 0) {
            enc({ type: 'error', databaseId: dbId, message: 'No cases found via RSS for this court' });
            continue;
          }
        }

        enc({ type: 'database_total', databaseId: dbId, total: cases.length });

        for (let i = 0; i < cases.length; i++) {
          const c = cases[i];

          try {
            let text = '';
            if (c.url) {
              text = await fetchCaseText(c.url);
            }

            if (backboardKey && assistantId) {
              await uploadToBackboard(assistantId, backboardKey, c.title, c.citation, text, {
                databaseId: c.databaseId,
                caseId: c.caseId,
              });
            }
            // If no Backboard keys, we still stream progress (demo mode)

            totalImported++;
            enc({
              type: 'case_imported',
              databaseId: dbId,
              caseId: c.caseId,
              title: c.title,
              citation: c.citation,
              index: i + 1,
              total: cases.length,
              totalImported,
            });
          } catch {
            totalFailed++;
            enc({
              type: 'case_failed',
              databaseId: dbId,
              caseId: c.caseId,
              title: c.title,
            });
          }

          // Small yield to avoid blocking
          await new Promise((r) => setTimeout(r, 50));
        }

        enc({ type: 'database_done', databaseId: dbId });
      }

      enc({ type: 'complete', totalImported, totalFailed });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
