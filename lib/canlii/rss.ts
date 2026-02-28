// Maps CanLII databaseId → jurisdiction/court path used in CanLII URLs and RSS feeds
const DB_PATH: Record<string, string> = {
  // Federal
  'csc-scc':  'ca/scc',
  'fca-caf':  'ca/fca',
  'fc-cf':    'ca/fc',
  'cct-tcc':  'ca/cct',
  // Ontario
  'onca':    'on/onca',
  'onsc':    'on/onsc',
  'onscdc':  'on/onscdc',
  'oncj':    'on/oncj',
  // British Columbia
  'bcca':    'bc/bcca',
  'bcsc':    'bc/bcsc',
  'bcpc':    'bc/bcpc',
  // Alberta
  'abca':    'ab/abca',
  'abkb':    'ab/abkb',
  'abpc':    'ab/abpc',
  // Quebec
  'qcca':    'qc/qcca',
  'qccs':    'qc/qccs',
  // Saskatchewan
  'skca':    'sk/skca',
  'skqb':    'sk/skqb',
  // Manitoba
  'mbca':    'mb/mbca',
  'mbkb':    'mb/mbkb',
  // Nova Scotia
  'nsca':    'ns/nsca',
  'nssc':    'ns/nssc',
  // New Brunswick
  'nbca':    'nb/nbca',
  'nbkb':    'nb/nbkb',
  // Newfoundland
  'nlca':    'nl/nlca',
  'nltd':    'nl/nltd',
  // PEI
  'peca':    'pe/peca',
  'pesctd':  'pe/pesctd',
  // Territories
  'nwtca':   'nt/nwtca',
  'nwtsc':   'nt/nwtsc',
  'nuca':    'nu/nuca',
  'nucj':    'nu/nucj',
  'ykca':    'yk/ykca',
  'yksm':    'yk/yksm',
};

export interface RssCaseItem {
  databaseId: string;
  caseId: string;
  title: string;
  citation: string;
  url: string;
  decisionDate: string;
}

function extractCaseId(url: string): string {
  // https://www.canlii.org/en/ca/scc/doc/2024/2024scc1/2024scc1.html → 2024scc1
  const m = url.match(/\/doc\/\d+\/([^/]+)\//);
  return m ? m[1] : url.split('/').filter(Boolean).pop()?.replace('.html', '') ?? 'unknown';
}

function parsePubDate(raw: string): string {
  try { return new Date(raw).toISOString().split('T')[0]; } catch { return ''; }
}

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

export async function fetchRssCases(databaseId: string): Promise<RssCaseItem[]> {
  const path = DB_PATH[databaseId];
  if (!path) return [];

  const url = `https://www.canlii.org/en/${path}/rss.xml`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LexAI/1.0 (legal research assistant)' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const items: RssCaseItem[] = [];

    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const block = m[1];
      const titleRaw = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
      const link     = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? '';
      const pubDate  = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';

      if (!link) continue;

      const fullTitle = stripCdata(titleRaw);
      // CanLII RSS titles are typically "Case Name, 2024 SCC 1"
      const citMatch = fullTitle.match(/^(.*?),\s*(\d{4}\s+\S+\s+\d+.*)$/);
      const caseName = citMatch ? citMatch[1].trim() : fullTitle;
      const citation = citMatch ? citMatch[2].trim() : '';

      items.push({
        databaseId,
        caseId: extractCaseId(link),
        title: caseName,
        citation,
        url: link,
        decisionDate: parsePubDate(pubDate),
      });
    }

    return items;
  } catch {
    return [];
  }
}

export function canliiBrowseUrl(databaseId: string): string | null {
  const path = DB_PATH[databaseId];
  return path ? `https://www.canlii.org/en/${path}/` : null;
}
