import { NextRequest, NextResponse } from 'next/server';

// Extracts databaseId + caseId from a CanLII URL like:
// https://canlii.org/en/ca/scc/doc/2014/2014scc40/2014scc40.html
function parseCanliiUrl(url: string): { databaseId: string; caseId: string } | null {
  try {
    const u = new URL(url);
    // Path: /en/{jurisdiction}/{databaseId}/doc/{year}/{caseId}/{caseId}.html
    const parts = u.pathname.split('/').filter(Boolean);
    const docIdx = parts.indexOf('doc');
    if (docIdx < 2) return null;
    const databaseId = parts[docIdx - 1];
    const caseId = parts[docIdx + 2]?.replace(/\.html$/, '') ?? parts[docIdx + 1];
    return { databaseId, caseId };
  } catch {
    return null;
  }
}

async function fetchCaseText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LexAI/1.0 (legal research; contact@lexai.example)' },
  });
  const html = await res.text();
  // Strip HTML tags and normalise whitespace
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return text.slice(0, 50_000); // cap at 50k chars for Backboard
}

async function uploadToBackboard(
  title: string,
  citation: string,
  text: string,
  metadata: Record<string, string>
): Promise<{ documentId: string }> {
  const apiKey = process.env.BACKBOARD_API_KEY!;
  const assistantId = process.env.BACKBOARD_ASSISTANT_ID!;
  const baseUrl = 'https://app.backboard.io/api';

  // Upload as a document to the assistant
  const form = new FormData();
  form.append(
    'file',
    new Blob([`${title}\n${citation}\n\n${text}`], { type: 'text/plain' }),
    `${citation.replace(/[^a-z0-9]/gi, '_')}.txt`
  );
  form.append('metadata', JSON.stringify({ title, citation, ...metadata }));

  const res = await fetch(`${baseUrl}/assistants/${assistantId}/documents`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Backboard upload failed: ${err}`);
  }

  const data = await res.json();
  return { documentId: data.document_id ?? data.id ?? 'unknown' };
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url required' }, { status: 400 });
    }

    const parsed = parseCanliiUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: 'Could not parse CanLII URL' }, { status: 400 });
    }

    const { databaseId, caseId } = parsed;

    // Fetch metadata from CanLII API (if key available)
    let title = caseId;
    let citation = caseId;
    const apiKey = process.env.CANLII_API_KEY;

    if (apiKey) {
      try {
        const metaRes = await fetch(
          `https://api.canlii.org/v1/caseBrowse/en/${encodeURIComponent(databaseId)}/${encodeURIComponent(caseId)}/?api_key=${apiKey}`
        );
        const meta = await metaRes.json();
        title = meta.title ?? title;
        citation = meta.citation ?? citation;
      } catch {
        // proceed with URL-derived IDs
      }
    }

    // Fetch full case text from CanLII HTML
    const text = await fetchCaseText(url);

    // Upload to Backboard
    if (process.env.BACKBOARD_API_KEY && process.env.BACKBOARD_ASSISTANT_ID) {
      const { documentId } = await uploadToBackboard(title, citation, text, { databaseId, caseId });
      return NextResponse.json({ success: true, documentId, title, citation });
    }

    // No Backboard — simulate success
    return NextResponse.json({
      success: true,
      documentId: `mock-${Date.now()}`,
      title,
      citation,
      note: 'BACKBOARD_API_KEY not set — simulated success',
    });
  } catch (err) {
    console.error('[import-url]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
