import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createStorageUploadUrl, type StorageProvider } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Phone ingestion endpoint for the "Send to Raven" iOS Shortcut.
 * Token-protected via RAVEN_UPLOAD_TOKEN (query `token` or `x-raven-token`
 * header). Two steps so large videos upload straight to R2, never through
 * Vercel's request-body limit:
 *
 *   1. GET  /api/ingest?token=…&name=IMG_1234.MOV&type=video/quicktime&property=ten-fifty-bakers
 *      → { uploadUrl, ... }   — Shortcut PUTs the file to uploadUrl
 *   2. POST /api/ingest  { token, provider, storagePath, publicUrl, fileName,
 *                          mimeType, sizeBytes, property }
 *      → registers the asset in the library
 */

function authed(req: NextRequest, bodyToken?: string): boolean {
  const secret = process.env.RAVEN_UPLOAD_TOKEN;
  if (!secret) return false;
  const provided =
    bodyToken ?? req.nextUrl.searchParams.get('token') ?? req.headers.get('x-raven-token');
  return provided === secret;
}

const PROPERTY_IDS = new Set(['ten-fifty-bakers', 'prescription-pad', 'annie-may', '']);

export async function GET(req: NextRequest) {
  if (!authed(req))
    return NextResponse.json(
      { ok: false, message: process.env.RAVEN_UPLOAD_TOKEN ? 'Bad token' : 'RAVEN_UPLOAD_TOKEN not set' },
      { status: 401 },
    );

  const name = req.nextUrl.searchParams.get('name') || `upload-${Date.now()}`;
  const type = req.nextUrl.searchParams.get('type') || 'application/octet-stream';

  const ticket = await createStorageUploadUrl(name, type);
  if (!ticket.ok) return NextResponse.json(ticket, { status: 500 });
  return NextResponse.json({
    ok: true,
    uploadUrl: ticket.signedUrl,
    provider: ticket.provider,
    storagePath: ticket.storagePath,
    publicUrl: ticket.publicUrl,
    contentType: type,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    token?: string;
    provider?: StorageProvider;
    storagePath?: string;
    publicUrl?: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    property?: string;
  };
  if (!authed(req, body.token))
    return NextResponse.json({ ok: false, message: 'Bad token' }, { status: 401 });
  if (!body.storagePath || !body.publicUrl)
    return NextResponse.json({ ok: false, message: 'Missing storagePath/publicUrl' }, { status: 400 });

  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 500 });

  const property = PROPERTY_IDS.has(body.property ?? '') ? body.property || null : null;
  const mime = body.mimeType ?? 'application/octet-stream';
  const { error } = await supabase.from('media_assets').insert({
    property_id: property,
    kind: mime.startsWith('video') ? 'video' : 'image',
    storage_provider: body.provider ?? 'r2',
    storage_path: body.storagePath,
    public_url: body.publicUrl,
    file_name: body.fileName ?? body.storagePath.split('/').pop(),
    mime_type: mime,
    size_bytes: body.sizeBytes ?? null,
  });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: 'In the library' });
}
