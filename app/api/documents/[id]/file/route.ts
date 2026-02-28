import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .select('storage_path, mime_type, original_filename')
    .eq('id', id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  if (!doc.storage_path) {
    return NextResponse.json({ error: 'No file stored for this document' }, { status: 404 });
  }

  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 3600);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 });
  }

  return NextResponse.json({
    url: signedUrlData.signedUrl,
    mimeType: doc.mime_type,
    filename: doc.original_filename,
  });
}
