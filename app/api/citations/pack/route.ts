import { NextRequest, NextResponse } from 'next/server';
import { AuthorityPack, Citation } from '@/types/citation';

export async function POST(req: NextRequest) {
  try {
    const { citations, matterName }: { citations: Citation[]; matterName: string } =
      await req.json();

    if (!Array.isArray(citations)) {
      return NextResponse.json({ error: 'Invalid citations' }, { status: 400 });
    }

    const summary = {
      resolved: citations.filter((c) => c.status === 'resolved').length,
      ambiguous: citations.filter((c) => c.status === 'ambiguous').length,
      unresolved: citations.filter((c) => c.status === 'unresolved').length,
    };

    const pack: AuthorityPack = {
      matter: matterName ?? 'Unnamed Matter',
      generatedAt: new Date().toISOString(),
      citations,
      summary,
    };

    return NextResponse.json({ pack });
  } catch (err) {
    console.error('[pack]', err);
    return NextResponse.json({ error: 'Pack generation failed' }, { status: 500 });
  }
}
