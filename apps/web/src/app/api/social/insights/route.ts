import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { metaConfigured, getMediaInsights } from '@/lib/meta';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Refresh performance for published Instagram posts (reach, saves, likes,
 * comments) from the Meta Graph API. Daily cron. Gracefully no-ops when Meta
 * isn't connected. Manual: /api/social/insights?secret=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  // this endpoint spends the rate-limited Meta token, so require the secret
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const qs = req.nextUrl.searchParams.get('secret');
  if (!secret || (auth !== `Bearer ${secret}` && qs !== secret))
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  if (!metaConfigured()) return NextResponse.json({ ok: true, skipped: 'Meta not connected' });

  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'supabase not configured' }, { status: 500 });

  // published IG posts, refresh those never synced or synced over 12h ago
  const cutoff = new Date(Date.now() - 12 * 3600_000).toISOString();
  const { data: posts } = await supabase
    .from('social_posts')
    .select('id, external_id, insights_synced_at')
    .eq('status', 'published')
    .not('external_id', 'is', null)
    .or(`insights_synced_at.is.null,insights_synced_at.lt.${cutoff}`)
    .limit(40);

  let updated = 0;
  for (const p of posts ?? []) {
    const ins = await getMediaInsights(p.external_id as string);
    // a transient Graph failure returns all-nulls — skip rather than wipe
    // previously-synced metrics (and leave insights_synced_at old so it retries)
    if (ins.reach == null && ins.saves == null && ins.likes == null && ins.comments == null) continue;
    await supabase
      .from('social_posts')
      .update({
        reach: ins.reach,
        saves: ins.saves,
        likes: ins.likes,
        comments: ins.comments,
        insights_synced_at: new Date().toISOString(),
      })
      .eq('id', p.id);
    updated++;
  }
  return NextResponse.json({ ok: true, updated });
}
