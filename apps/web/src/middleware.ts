import { NextRequest, NextResponse } from 'next/server';
import { SITES } from '@/lib/sites';

/**
 * Custom-domain serving for the property websites.
 *
 * Domain → property comes from three layers (first match wins):
 *   1. site_settings.domains in the database (editable from the Sites tab)
 *   2. the built-in domains in lib/sites.ts
 *   3. the RAVEN_SITE_DOMAINS env var ("host=property-id,…")
 *
 * What gets served on a mapped domain:
 *   - if the property has a published v2 site (site_settings.live_version_id),
 *     the section-based site renders at clean URLs
 *   - otherwise the WordPress mirror serves as before
 * Raven's own domain keeps /mirror/* editor-only (noindex).
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
  for (const pair of (process.env.RAVEN_SITE_DOMAINS ?? '').split(',')) {
    const [host, pid] = pair.split('=').map((x) => x?.trim().toLowerCase());
    if (host && pid) map.set(host, pid);
  }
  return map;
}

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];
  const { pathname } = req.nextUrl;

  // Fast path: on Raven's own domain (vercel.app / localhost / the app URL)
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
    if (pathname.startsWith('/mirror')) {
      const res = NextResponse.next();
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    }
    return NextResponse.next();
  }

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
  const site = SITES.find((s) => s.propertyId === pid);
  const liveV2 = settings.find((r) => r.property_id === pid)?.live_version_id ?? null;

  const mirrorMatch = pathname.match(/^\/mirror\/[^/]+\/([^/]+)\.html$/);
  if (mirrorMatch) {
    const slug = mirrorMatch[1];
    return NextResponse.redirect(new URL(slug === 'home' ? '/' : `/${slug}`, req.url), 301);
  }

  if (pathname === '/robots.txt')
    return NextResponse.rewrite(new URL('/api/standalone/robots', req.url));
  if (pathname === '/sitemap.xml')
    return NextResponse.rewrite(new URL('/api/standalone/sitemap', req.url));

  const slug = pathname === '/' || pathname === '' ? 'home' : pathname.replace(/^\/+|\/+$/g, '');

  if (liveV2 && /^[a-z0-9-]*$/.test(slug)) {
    // published v2 site takes over the domain
    const dest = new URL(`/site/${pid}`, req.url);
    dest.searchParams.set('page', slug || 'home');
    dest.searchParams.set('standalone', '1');
    return NextResponse.rewrite(dest);
  }

  if (slug === 'home') return NextResponse.rewrite(new URL(`/mirror/${pid}/home.html`, req.url));
  if (site?.pages.includes(slug))
    return NextResponse.rewrite(new URL(`/mirror/${pid}/${slug}.html`, req.url));

  // assets, /events/*, /api/* etc. pass through
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|mirror-assets/).*)'],
};
