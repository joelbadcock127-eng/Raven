import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getOrCreateTrackedLink } from '@/lib/links';

export const dynamic = 'force-dynamic';

/**
 * Named tracked redirects: stable /r/<name> URLs that can be hard-coded in
 * static pages (mirror banners etc.). Each hit is counted in tracked_links /
 * link_clicks — visible in admin → Analytics — then 302s to the target
 * VERBATIM (no UTM rewriting: campaign targets like Lodgify checkout links
 * carry their own promotion params).
 *
 * Add campaign links here; the tracked_links row is created on first hit.
 */
const NAMED_LINKS: Record<
  string,
  { propertyId: string; label: string; kind: string; target: string }
> = {
  'nwtrs-banner': {
    propertyId: 'ten-fifty-bakers',
    label: 'NWTRS banner → Lodgify checkout',
    kind: 'banner',
    target:
      'https://checkout.lodgify.com/deb-badcock/726148/reservation?currency=AUD&ref=bnbox&adults=4&promotion=NWTRS',
  },
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const def = NAMED_LINKS[slug];
  if (!def) return NextResponse.redirect(new URL('/', req.url), 302);

  // count best-effort — the visitor always reaches the target
  try {
    const supabase = supabaseAdmin();
    if (supabase) {
      const link = await getOrCreateTrackedLink(supabase, {
        propertyId: def.propertyId,
        label: def.label,
        targetUrl: def.target,
        kind: def.kind,
      });
      if (link) {
        await Promise.allSettled([
          supabase.rpc('increment_link_clicks', { p_id: link.id }),
          supabase.from('link_clicks').insert({
            link_id: link.id,
            referrer: req.headers.get('referer'),
            ua: req.headers.get('user-agent'),
          }),
        ]);
      }
    }
  } catch {
    /* never block the redirect */
  }

  return NextResponse.redirect(def.target, 302);
}
