import { NextResponse } from 'next/server';
import { retryStuckDocuments } from '@/lib/backboard/retry-stuck';

export async function POST() {
  try {
    const result = await retryStuckDocuments();
    return NextResponse.json(result);
  } catch (e) {
    console.error('[retry-stuck] Error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
