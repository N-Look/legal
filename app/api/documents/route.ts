import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get('clientId');
  const matterId = searchParams.get('matterId');
  const docType = searchParams.get('docType');
  const pinnedOnly = searchParams.get('pinnedOnly') === 'true';
  const search = searchParams.get('search');

  let query = supabaseAdmin
    .from('documents')
    .select('*, clients(name), matters(name)')
    .order('created_at', { ascending: false });

  if (clientId) query = query.eq('client_id', clientId);
  if (matterId) query = query.eq('matter_id', matterId);
  if (docType) query = query.eq('doc_type', docType);
  if (pinnedOnly) query = query.eq('pinned_to_matter', true);
  if (search) query = query.ilike('original_filename', `%${search}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
