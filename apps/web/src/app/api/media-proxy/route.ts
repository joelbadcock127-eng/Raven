import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Same-origin proxy for a library image, so the browser canvas can read its
 * pixels without cross-origin tainting (R2 public URLs are a different host).
 * Looks the asset up by id — never proxies arbitrary URLs — so it can't be
 * used to fetch anything but our own media.
 *   GET /api/media-proxy?id=<assetId>
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return new NextResponse('id required', { status: 400 });

  const supabase = supabaseAdmin();
  if (!supabase) return new NextResponse('not configured', { status: 500 });

  const { data } = await supabase
    .from('media_assets')
    .select('public_url, mime_type')
    .eq('id', id)
    .maybeSingle();
  if (!data?.public_url) return new NextResponse('not found', { status: 404 });

  const upstream = await fetch(data.public_url, { signal: AbortSignal.timeout(20000) });
  if (!upstream.ok) return new NextResponse('upstream error', { status: 502 });

  return new NextResponse(upstream.body, {
    headers: {
      'content-type': data.mime_type ?? upstream.headers.get('content-type') ?? 'image/jpeg',
      'cache-control': 'private, max-age=300',
    },
  });
}
