import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createAssistant } from '@/lib/backboard/client';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
  }

  // Check if client already exists
  const { data: existing } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('name', name.trim())
    .single();

  if (existing) {
    return NextResponse.json(existing);
  }

  // Create Backboard assistant for this client
  let backboardAssistantId: string | null = null;
  try {
    const assistant = await createAssistant(name.trim());
    backboardAssistantId = assistant.assistant_id;
  } catch (e) {
    console.error('Failed to create Backboard assistant:', e);
  }

  const { data, error } = await supabaseAdmin
    .from('clients')
    .insert({
      name: name.trim(),
      backboard_assistant_id: backboardAssistantId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
