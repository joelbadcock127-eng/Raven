import { NextRequest, NextResponse } from 'next/server';
import { SITES } from '@/lib/sites';

export const dynamic = 'force-dynamic';

/** sitemap.xml for a property site served on its own domain. */
export async function GET(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];
  const bare = host.replace(/^www\./, '');
  const site =
    SITES.find((s) => s.domain === bare) ??
    // extra domains from RAVEN_SITE_DOMAINS ("host=pid,...")
    SITES.find((s) =>
      (process.env.RAVEN_SITE_DOMAINS ?? '')
        .split(',')
        .some((pair) => {
          const [h, pid] = pair.split('=').map((x) => x?.trim().toLowerCase());
          return h === host && pid === s.propertyId;
        }),
    );

  if (!site) return new NextResponse('Not found', { status: 404 });

  const urls = site.pages
    .map((slug) => `https://${host}${slug === 'home' ? '/' : '/' + slug}`)
    .map((loc) => `  <url><loc>${loc}</loc></url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new NextResponse(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
