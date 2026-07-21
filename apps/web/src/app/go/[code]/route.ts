import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { appendUtm } from '@/lib/links';

export const dynamic = 'force-dynamic';

/**
 * Tracked-link redirect: /go/<code> records a click then 302s to the real
 * target with UTM tags. Always redirects somewhere, even if the code is
 * unknown or the tables aren't migrated yet, so a bad link never dead-ends.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const home = new URL('/', req.url);

  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.redirect(home, 302);

  try {
    const { data: link } = await supabase
      .from('tracked_links')
      .select('id, target_url, property_id, campaign_id')
      .eq('code', code)
      .maybeSingle();
    if (!link?.target_url) return NextResponse.redirect(home, 302);

    // count the click (best-effort — never block the redirect)
    await Promise.allSettled([
      supabase.rpc('increment_link_clicks', { p_id: link.id }),
      supabase.from('link_clicks').insert({
        link_id: link.id,
        referrer: req.headers.get('referer'),
        ua: req.headers.get('user-agent'),
      }),
    ]);

    const target = appendUtm(link.target_url, {
      source: 'raven',
      medium: 'link',
      campaign: link.campaign_id ?? link.property_id ?? 'social',
    });
    return NextResponse.redirect(target, 302);
  } catch {
    return NextResponse.redirect(home, 302);
  }
}
