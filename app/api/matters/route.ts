import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createThread } from '@/lib/backboard/client';

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId');

  let query = supabaseAdmin.from('matters').select('*').order('name');

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { clientId, name, matterNumber, jurisdiction, court } = await req.json();

  if (!clientId || !name?.trim()) {
    return NextResponse.json({ error: 'Client ID and matter name are required' }, { status: 400 });
  }

  // Get client for Backboard assistant ID
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('backboard_assistant_id')
    .eq('id', clientId)
    .single();

  // Create Backboard thread if assistant exists
  let backboardThreadId: string | null = null;
  if (client?.backboard_assistant_id) {
    try {
      const thread = await createThread(client.backboard_assistant_id);
      backboardThreadId = thread.thread_id;
    } catch (e) {
      console.error('Failed to create Backboard thread:', e);
    }
  }

  const { data, error } = await supabaseAdmin
    .from('matters')
    .insert({
      client_id: clientId,
      name: name.trim(),
      matter_number: matterNumber || null,
      backboard_thread_id: backboardThreadId,
      jurisdiction: jurisdiction || null,
      court: court || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
