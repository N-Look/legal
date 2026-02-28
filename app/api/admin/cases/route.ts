import { NextRequest, NextResponse } from 'next/server';

export interface CaseItem {
  databaseId: string;
  caseId: string;
  title: string;
  citation: string;
  decisionDate?: string;
  keywords?: string[];
  url?: string;
}

const MOCK_CASES: Record<string, CaseItem[]> = {
  'csc-scc': [
    { databaseId: 'csc-scc', caseId: '1986scc4', title: 'R v Oakes', citation: '[1986] 1 SCR 103', decisionDate: '1986-02-28', keywords: ['Charter', 'Section 1', 'Oakes test'], url: 'https://canlii.org/en/ca/scc/doc/1986/1986canlii46/1986canlii46.html' },
    { databaseId: 'csc-scc', caseId: '1999scc4', title: 'Baker v Canada (Minister of Citizenship and Immigration)', citation: '[1999] 2 SCR 817', decisionDate: '1999-07-09', keywords: ['Administrative law', 'Procedural fairness'], url: 'https://canlii.org/en/ca/scc/doc/1999/1999canlii699/1999canlii699.html' },
    { databaseId: 'csc-scc', caseId: '2003scc5', title: 'Dunsmuir v New Brunswick', citation: '2008 SCC 9', decisionDate: '2008-03-07', keywords: ['Administrative law', 'Standard of review', 'Reasonableness'], url: 'https://canlii.org/en/ca/scc/doc/2008/2008scc9/2008scc9.html' },
  ],
  'onca': [
    { databaseId: 'onca', caseId: '2019onca1', title: 'Rankin (Rankin\'s Garage & Sales) v J.J.', citation: '2018 ONCA 1', decisionDate: '2018-01-01', keywords: ['Negligence', 'Duty of care'], url: 'https://canlii.org/en/on/onca/doc/2018/2018onca1/2018onca1.html' },
    { databaseId: 'onca', caseId: '2020onca200', title: 'Sample Energy v Green Falls Co.', citation: '2022 ONCA 201', decisionDate: '2022-03-15', keywords: ['Contract', 'Rescission'], url: 'https://canlii.org/en/on/onca/doc/2022/2022onca201/2022onca201.html' },
  ],
};

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
      // CanLII returns { cases: [...] }
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
      // fall through to mock
    }
  }

  const mock = MOCK_CASES[databaseId] ?? [];
  return NextResponse.json({ cases: mock.slice(offset, offset + resultCount), total: mock.length });
}
