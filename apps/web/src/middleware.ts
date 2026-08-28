import { NextRequest, NextResponse } from 'next/server';
import { SITES } from '@/lib/sites';

/**
 * Custom-domain serving for the property websites.
 *
 * Domain → property comes from three layers (first match wins):
 *   1. site_settings.domains in the database (editable from the Sites tab)
 *   2. the built-in domains in lib/sites.ts
 *   3. the DECRA_SITE_DOMAINS env var ("host=property-id,…")
 *
 * What gets served on a mapped domain:
 *   - if the property has a published v2 site (site_settings.live_version_id),
 *     the section-based site renders at clean URLs
 *   - otherwise the WordPress mirror serves as before
 * Decra's own domain keeps /mirror/* editor-only (noindex).
 */

interface SettingsRow {
  property_id: string;
  live_version_id: string | null;
  domains: string[];
}

let cache: { at: number; rows: SettingsRow[] } | null = null;
const CACHE_MS = 60_000;

async function loadSettings(): Promise<SettingsRow[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/site_settings?select=property_id,live_version_id,domains`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
    });
    const rows = res.ok ? ((await res.json()) as SettingsRow[]) : [];
    cache = { at: Date.now(), rows };
    return rows;
  } catch {
    return cache?.rows ?? [];
  }
}

function staticDomainMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of SITES) {
    map.set(s.domain, s.propertyId);
    map.set('www.' + s.domain, s.propertyId);
  }
  for (const pair of ((process.env.DECRA_SITE_DOMAINS ?? process.env.RAVEN_SITE_DOMAINS) ?? '').split(',')) {
    const [host, pid] = pair.split('=').map((x) => x?.trim().toLowerCase());
    if (host && pid) map.set(host, pid);
  }
  return map;
}

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];
  const { pathname } = req.nextUrl;

  // Fast path: on Decra's own domain (vercel.app / localhost / the app URL)
  // never touch the database — this must add zero latency to admin usage.
  const appHost = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_APP_URL ?? '').hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  const isOwnHost =
    host === appHost || host.endsWith('.vercel.app') || host === 'localhost' || host === '127.0.0.1';

  if (isOwnHost) {
    if (pathname.startsWith('/mirror') || pathname.startsWith('/m/')) {
      const res = NextResponse.next();
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    }
    return NextResponse.next();
  }

  // Tracked-link redirects and bio pages are real app routes on every host.
  if (pathname.startsWith('/go/') || pathname.startsWith('/l/')) return NextResponse.next();

  const settings = await loadSettings();
  let pid = settings.find((r) => r.domains?.some((d) => d.toLowerCase() === host))?.property_id;
  if (!pid) pid = staticDomainMap().get(host);

  if (!pid) {
    if (pathname.startsWith('/mirror')) {
      const res = NextResponse.next();
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    }
    return NextResponse.next();
  }

  // ── Standalone property-site domain ──
  // One canonical hostname: www permanently redirects to the bare domain.
  if (host.startsWith('www.')) {
    const bare = new URL(req.url);
    bare.host = host.slice(4);
    return NextResponse.redirect(bare, 308);
  }

  const site = SITES.find((s) => s.propertyId === pid);
  const liveV2 = settings.find((r) => r.property_id === pid)?.live_version_id ?? null;
  // Annie May's bespoke site is her live site — no builder version needed.
  const bespoke = pid === 'annie-may';
  const bespokePages = ['home', 'accommodation', 'story', 'explore', 'contact'];

  // Event pages and their index are real app routes on the property domain.
  if (pathname === '/events' || pathname.startsWith('/events/')) return NextResponse.next();

  // Admin-only paths never serve on a public property domain (the live
  // pages are rewritten to /m/live internally; direct hits go home).
  if (pathname.startsWith('/mirror-sandbox') || pathname.startsWith('/m/'))
    return NextResponse.redirect(new URL('/', req.url), 302);

  const mirrorMatch = pathname.match(/^\/mirror\/[^/]+\/([^/]+)\.html$/);
  if (mirrorMatch) {
    const slug = mirrorMatch[1];
    return NextResponse.redirect(new URL(slug === 'home' ? '/' : `/${slug}`, req.url), 301);
  }

  if (pathname === '/robots.txt')
    return NextResponse.rewrite(new URL('/api/standalone/robots', req.url));
  if (pathname === '/sitemap.xml')
    return NextResponse.rewrite(new URL('/api/standalone/sitemap', req.url));

  let slug = pathname === '/' || pathname === '' ? 'home' : pathname.replace(/^\/+|\/+$/g, '');

  // 301s from the old WordPress URLs so existing rankings carry over.
  if (bespoke) {
    const legacy: Record<string, string> = { 'annie-mays-story': 'story', 'contact-us': 'contact' };
    if (legacy[slug]) return NextResponse.redirect(new URL(`/${legacy[slug]}`, req.url), 301);
  }

  // Unknown slugs fall through to the app's 404 rather than soft-200ing home.
  const validSlug = bespoke ? bespokePages.includes(slug || 'home') : /^[a-z0-9-]*$/.test(slug);
  if ((liveV2 || bespoke) && validSlug) {
    // published v2 site takes over the domain
    const dest = new URL(`/site/${pid}`, req.url);
    dest.searchParams.set('page', slug || 'home');
    dest.searchParams.set('standalone', '1');
    return NextResponse.rewrite(dest);
  }

  if (slug === 'home') return NextResponse.rewrite(new URL(`/m/live/${pid}/home.html`, req.url));
  if (site?.pages.includes(slug))
    return NextResponse.rewrite(new URL(`/m/live/${pid}/${slug}.html`, req.url));

  // assets, /events/*, /api/* etc. pass through
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|mirror-assets/).*)'],
};
