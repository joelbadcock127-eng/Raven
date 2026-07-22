import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { draftPost } from '@/app/(admin)/social/actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * The social regular, driven by owner-configured posting plans.
 * Runs daily via Vercel cron: every active plan whose next_run_at has
 * arrived gets a draft (post/reel/story/carousel per its settings), then
 * advances by its cadence. Falls back to the original default (one post
 * per property every 3 days) only when a property has no plans at all.
 *
 * Manual trigger: /api/social/draft?secret=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const qs = req.nextUrl.searchParams.get('secret');
  if (secret && auth !== `Bearer ${secret}` && qs !== secret)
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'supabase not configured' }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  const results: Record<string, string> = {};

  const { data: due } = await supabase
    .from('posting_plans')
    .select('*')
    .eq('active', true)
    .lte('next_run_at', today);

  for (const plan of due ?? []) {
    // skip when this plan already has an unhandled draft waiting
    const { count } = await supabase
      .from('social_posts')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', plan.property_id)
      .in('status', ['draft', 'approved']);
    if ((count ?? 0) > 2) {
      results[plan.name] = 'skipped — queue already has pending posts';
      continue;
    }

    const res = await draftPost(plan.property_id, plan.format, {
      platform: plan.platform,
      direction: plan.direction ?? undefined,
      reuseCooldownDays: plan.reuse_cooldown_days,
      allowReuse: plan.allow_reuse,
      alsoStory: plan.also_story,
      folderId: plan.folder_id ?? undefined,
      planId: plan.id,
    });
    results[plan.name] = res.message;

    if (plan.mode === 'once') {
      // a one-off retires once it has actually produced a draft; if the draft
      // failed (e.g. no eligible media) leave it active to retry next run
      if (res.ok) await supabase.from('posting_plans').update({ active: false }).eq('id', plan.id);
    } else {
      const next = new Date(Date.now() + plan.every_days * 86_400_000).toISOString().slice(0, 10);
      await supabase.from('posting_plans').update({ next_run_at: next }).eq('id', plan.id);
    }
  }

  // No plans, no posts — drafting only happens on owner-configured plans
  // (or manual quick drafts in the Social tab).
  return NextResponse.json({ ok: true, results });
}
