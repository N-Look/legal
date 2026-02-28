import { NextRequest, NextResponse } from 'next/server';
import { fetchRssCases } from '@/lib/canlii/rss';

export interface CaseItem {
  databaseId: string;
  caseId: string;
  title: string;
  citation: string;
  decisionDate?: string;
  keywords?: string[];
  url?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const databaseId = searchParams.get('databaseId');
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const resultCount = Math.min(parseInt(searchParams.get('resultCount') ?? '20', 10), 100);

  if (!databaseId) {
    return NextResponse.json({ error: 'databaseId required' }, { status: 400 });
  }

  const apiKey = process.env.CANLII_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.canlii.org/v1/caseBrowse/en/${encodeURIComponent(databaseId)}/?api_key=${apiKey}&offset=${offset}&resultCount=${resultCount}`,
      );
      const data = await res.json();
      const cases: CaseItem[] = (data.cases ?? []).map(
        (c: { databaseId: string; caseId: string; title: string; citation: string; decisionDate?: string; keywords?: string[]; url?: string }) => ({
          databaseId: c.databaseId ?? databaseId,
          caseId: c.caseId,
          title: c.title,
          citation: c.citation,
          decisionDate: c.decisionDate,
          keywords: c.keywords ?? [],
          url: c.url,
        })
      );
      return NextResponse.json({ cases, total: data.resultCount ?? cases.length });
    } catch {
      // fall through to RSS
    }
  }

  // No CanLII API key — use public RSS feed
  const rssCases = await fetchRssCases(databaseId);
  const page = rssCases.slice(offset, offset + resultCount);
  return NextResponse.json({ cases: page, total: rssCases.length });
}
