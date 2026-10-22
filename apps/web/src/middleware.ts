import { NextRequest, NextResponse } from 'next/server';
import { SITES, publicHost } from '@/lib/sites';

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
 *
 * Admin login: Decra's own host (the Vercel URL) asks for a password
 * (HTTP Basic, ADMIN_PASSWORD) on everything except PUBLIC_PATHS. A
 * property domain never serves the admin: anything that isn't website
 * content is a 404 there.
 *
 * Trailing slashes: next.config sets skipTrailingSlashRedirect, so this
 * file owns them. Mirror pages keep WordPress's `/page/` form (what their
 * canonical tags, backlinks and Google's index use); every other path
 * gets Next's default of stripping the slash.
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

/**
 * Paths anyone may open on Decra's own host: guest-facing pages, website
 * APIs, links shared publicly, static files, and routes that check their
 * own secret (scheduled jobs, uploads, render callback).
 */
const PUBLIC_PATHS = [
  '/book/', '/api/private-booking/', '/go/', '/l/', '/r/', '/stay', '/u', '/events',
  '/mirror/', '/m/',
  '/api/site-enquiry', '/api/site-overrides', '/api/site/weather', '/api/media-proxy', '/api/standalone/',
  '/api/ingest', '/api/render/complete', '/api/admin/property-ical', '/api/admin/annotate-media',
  '/api/admin/relocate-media', '/api/sync/availability', '/api/signals', '/api/enrich',
  '/api/social/draft', '/api/social/insights',
];
const isPublicPath = (p: string) =>
  PUBLIC_PATHS.some((x) => p === x.replace(/\/$/, '') || p.startsWith(x.endsWith('/') ? x : x + '/') || p === x) ||
  (!p.startsWith('/api/') && /\.[a-z0-9]+$/i.test(p)); // static files: /icon.png, /logo/*.svg, ...

/** Paths a property domain serves besides its pages (which come from SITES). */
const SITE_APP_PATHS = [
  '/events', '/book/', '/api/private-booking/', '/api/site-enquiry', '/api/site-overrides',
  '/api/site/weather', '/go/', '/l/', '/r/',
];
const isSiteAppPath = (p: string) =>
  SITE_APP_PATHS.some((x) => p === x.replace(/\/$/, '') || p.startsWith(x.endsWith('/') ? x : x + '/')) ||
  (!p.startsWith('/api/') && /\.[a-z0-9]+$/i.test(p));

function adminAuthorized(req: NextRequest): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const header = req.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return false;
  let decoded = '';
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const given = decoded.slice(decoded.indexOf(':') + 1);
  // constant-time compare
  let diff = given.length ^ password.length;
  for (let i = 0; i < Math.max(given.length, password.length); i++)
    diff |= (given.charCodeAt(i) || 0) ^ (password.charCodeAt(i) || 0);
  return diff === 0;
}

function adminChallenge(): NextResponse {
  if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV !== 'development')
    return new NextResponse('Decra admin is locked: set ADMIN_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  return new NextResponse('Password required', {
    status: 401,
    headers: { 'www-authenticate': 'Basic realm="Decra admin", charset="UTF-8"' },
  });
}

/** The app's 404 page with a real 404 status. */
const notFound = (req: NextRequest) => NextResponse.rewrite(new URL('/__not-found', req.url));

export async function middleware(req: NextRequest) {
  const host = publicHost(req.headers);
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

  const hasSlash = pathname.length > 1 && pathname.endsWith('/');
  const stripSlash = () => {
    // a plain URL: NextURL would re-apply its own trailing-slash rule
    const dest = new URL(req.url);
    dest.pathname = pathname.replace(/\/+$/, '') || '/';
    return NextResponse.redirect(dest, 308);
  };

  if (isOwnHost) {
    const devOpen = process.env.NODE_ENV === 'development' && !process.env.ADMIN_PASSWORD;
    if (!devOpen && !isPublicPath(pathname) && !adminAuthorized(req)) return adminChallenge();
    if (hasSlash) return stripSlash();
    if (pathname.startsWith('/mirror') || pathname.startsWith('/m/')) {
      const res = NextResponse.next();
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    }
    return NextResponse.next();
  }

  // Tracked-link redirects and bio pages are real app routes on every host.
  if (pathname.startsWith('/go/') || pathname.startsWith('/l/'))
    return hasSlash ? stripSlash() : NextResponse.next();

  const settings = await loadSettings();
  let pid = settings.find((r) => r.domains?.some((d) => d.toLowerCase() === host))?.property_id;
  if (!pid) pid = staticDomainMap().get(host);

  if (!pid) {
    // an unmapped host (e.g. a stray custom domain) is not a way into the admin
    if (!isPublicPath(pathname) && !adminAuthorized(req)) return adminChallenge();
    if (hasSlash) return stripSlash();
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
  // A bespoke site (Annie May's V2) needs no builder version to go live.
  const bespoke = site?.bespoke === true;
  const bespokePages = ['home', 'accommodation', 'story', 'explore', 'contact'];

  // Old WordPress media URLs (Google Images, backlinks, emails): serve the
  // localized copy. Its name is the hash the localize script gave the URL;
  // a file we never localized 404s.
  if (pathname.startsWith('/wp-content/')) {
    const url = `https://${host}${pathname}${req.nextUrl.search}`;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url));
    const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 10);
    const base = (pathname.split('/').pop() || 'asset').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80);
    return NextResponse.rewrite(new URL(`/mirror-assets/${hash}-${base}`, req.url));
  }

  // Event pages and their index are real app routes on the property domain.
  if (pathname === '/events' || pathname.startsWith('/events/'))
    return hasSlash ? stripSlash() : NextResponse.next();

  // Private no-payment booking pages (tokenized, never indexed or linked).
  if (pathname.startsWith('/book/') || pathname.startsWith('/api/private-booking/')) {
    if (hasSlash) return stripSlash();
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  // Admin-only paths never serve on a public property domain (the live
  // pages are rewritten to /m/live internally; direct hits go home).
  if (pathname.startsWith('/mirror-sandbox') || pathname.startsWith('/m/'))
    return NextResponse.redirect(new URL('/', req.url), 302);

  const mirrorMatch = pathname.match(/^\/mirror\/[^/]+\/([^/]+)\.html$/);
  if (mirrorMatch) {
    const slug = mirrorMatch[1];
    const clean = slug === 'home' ? '/' : bespoke || liveV2 ? `/${slug}` : `/${slug}/`;
    return NextResponse.redirect(new URL(clean, req.url), 301);
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

  // The V2 and bespoke sites use clean, slash-free URLs.
  if (hasSlash && (liveV2 || bespoke)) return stripSlash();

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
  if (site?.pages.includes(slug)) {
    // WordPress permalinks end in a slash; keep exactly those URLs.
    if (!hasSlash) {
      const dest = new URL(req.url);
      dest.pathname = `/${slug}/`;
      return NextResponse.redirect(dest, 308);
    }
    return NextResponse.rewrite(new URL(`/m/live/${pid}/${slug}.html`, req.url));
  }

  // website app routes and static files pass through; never the admin
  if (!isSiteAppPath(pathname)) return notFound(req);
  return hasSlash ? stripSlash() : NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|mirror-assets/).*)'],
};
