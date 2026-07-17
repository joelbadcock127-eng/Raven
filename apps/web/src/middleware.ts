import { NextRequest, NextResponse } from 'next/server';
import { SITES } from '@/lib/sites';

/**
 * Custom-domain serving for the mirrored property websites.
 *
 * When a request arrives on a domain mapped to a property (the property's
 * own domain pointed at this Vercel project, or extra domains listed in the
 * RAVEN_SITE_DOMAINS env var as "host=property-id,host2=property-id2"),
 * the site is served standalone at clean URLs — no Raven UI, fully
 * crawlable, with its own robots.txt and sitemap.xml.
 *
 * On the Raven app's own domain the mirrors stay reachable under /mirror/*
 * for the Sites editor, but are marked noindex so Google only ever indexes
 * the standalone domains.
 */

function domainMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of SITES) {
    map.set(s.domain, s.propertyId);
    map.set('www.' + s.domain, s.propertyId);
  }
  const extra = process.env.RAVEN_SITE_DOMAINS ?? '';
  for (const pair of extra.split(',')) {
    const [host, pid] = pair.split('=').map((x) => x?.trim().toLowerCase());
    if (host && pid) map.set(host, pid);
  }
  return map;
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];
  const pid = domainMap().get(host);
  const { pathname } = req.nextUrl;

  if (!pid) {
    // Raven's own domain: keep editor mirrors out of search engines
    if (pathname.startsWith('/mirror')) {
      const res = NextResponse.next();
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    }
    return NextResponse.next();
  }

  // ── Standalone property-site domain ──
  const site = SITES.find((s) => s.propertyId === pid)!;

  // canonicalise any /mirror/... path to the clean URL
  const mirrorMatch = pathname.match(/^\/mirror\/[^/]+\/([^/]+)\.html$/);
  if (mirrorMatch) {
    const slug = mirrorMatch[1];
    return NextResponse.redirect(
      new URL(slug === 'home' ? '/' : `/${slug}`, req.url),
      301,
    );
  }

  if (pathname === '/robots.txt')
    return NextResponse.rewrite(new URL('/api/standalone/robots', req.url));
  if (pathname === '/sitemap.xml')
    return NextResponse.rewrite(new URL('/api/standalone/sitemap', req.url));

  if (pathname === '/' || pathname === '')
    return NextResponse.rewrite(new URL(`/mirror/${pid}/home.html`, req.url));

  const slug = pathname.replace(/^\/+|\/+$/g, '');
  if (site.pages.includes(slug))
    return NextResponse.rewrite(new URL(`/mirror/${pid}/${slug}.html`, req.url));

  // assets, /api/site-overrides, /mirror-editor.js, _next etc. pass through
  return NextResponse.next();
}

export const config = {
  // run on everything except Next internals and static chunks
  matcher: ['/((?!_next/|favicon.ico).*)'],
};
