import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { draftPost } from '@/app/(admin)/social/actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * The social regular: called by Vercel cron every 3 days. For each property
 * with media and no pending draft, prepare one post (or reel when a video is
 * available) for the owner to approve in the Social tab.
 *
 * Also callable manually: /api/social/draft?secret=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const qs = req.nextUrl.searchParams.get('secret');
  if (secret && auth !== `Bearer ${secret}` && qs !== secret)
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'supabase not configured' }, { status: 500 });

  const results: Record<string, string> = {};
  for (const pid of ['ten-fifty-bakers', 'prescription-pad', 'annie-may']) {
    // skip if a draft/approved post is already waiting
    const { count } = await supabase
      .from('social_posts')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', pid)
      .in('status', ['draft', 'approved']);
    if ((count ?? 0) > 0) {
      results[pid] = 'skipped — pending post already in queue';
      continue;
    }
    // prefer a reel when an unused video exists, else a post
    const { data: video } = await supabase
      .from('media_assets')
      .select('id')
      .eq('property_id', pid)
      .eq('kind', 'video')
      .order('times_used', { ascending: true })
      .limit(1);
    const res = await draftPost(pid, video?.length ? 'reel' : 'post');
    results[pid] = res.message;
  }

  return NextResponse.json({ ok: true, results });
}
