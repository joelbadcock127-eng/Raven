import { NextRequest, NextResponse } from 'next/server';
import { SITES, publicHost } from '@/lib/sites';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** sitemap.xml for a property site served on its own domain. */
export async function GET(req: NextRequest) {
  const host = publicHost(req.headers);
  const bare = host.replace(/^www\./, '');
  const site =
    SITES.find((s) => s.domain === bare) ??
    // extra domains from DECRA_SITE_DOMAINS ("host=pid,...")
    SITES.find((s) =>
      ((process.env.DECRA_SITE_DOMAINS ?? process.env.RAVEN_SITE_DOMAINS) ?? '')
        .split(',')
        .some((pair) => {
          const [h, pid] = pair.split('=').map((x) => x?.trim().toLowerCase());
          return h === host && pid === s.propertyId;
        }),
    );

  if (!site) return new NextResponse('Not found', { status: 404 });
  const supabase = supabaseAdmin();

  // Mirror pages keep their WordPress permalinks (trailing slash), matching
  // their canonical tags; bespoke and builder sites use clean URLs.
  const { data: settings } = supabase
    ? await supabase.from('site_settings').select('live_version_id').eq('property_id', site.propertyId).maybeSingle()
    : { data: null };
  const trailing = !site.bespoke && !settings?.live_version_id ? '/' : '';
  const locs = site.pages.map((slug) => `https://${host}${slug === 'home' ? '/' : `/${slug}${trailing}`}`);

  // published, unexpired event pages for this property are indexable too,
  // reached through the What's-on index
  if (supabase) {
    const { data: eventPages } = await supabase
      .from('event_pages')
      .select('slug, content')
      .eq('property_id', site.propertyId)
      .eq('published', true);
    const today = new Date().toISOString().slice(0, 10);
    const live = (eventPages ?? []).filter((p) => {
      const exp = (p.content as { expiresAt?: string } | null)?.expiresAt;
      return !exp || exp >= today;
    });
    if (live.length > 0) locs.push(`https://${host}/events`);
    for (const p of live) locs.push(`https://${host}/events/${p.slug}`);
  }

  const urls = locs.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new NextResponse(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
