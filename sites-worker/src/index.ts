/**
 * The three property websites on one Cloudflare worker (free plan).
 *
 * Images, fonts, CSS and scripts are static assets Cloudflare serves
 * without running this code (see run_worker_first in wrangler.jsonc).
 * Everything else lands here:
 *   - www.<domain> redirects to the bare domain
 *   - old WordPress media URLs (/wp-content/...) serve the local copy
 *   - every other request is forwarded to Decra (on Vercel) with the site
 *     named in `x-decra-host`; Decra's middleware then serves exactly what
 *     it serves for that domain (pages with admin edits, events, private
 *     booking links, sitemap, robots, 404s)
 *   - if Decra doesn't answer, pages are served from this worker's own
 *     copy so the sites stay up
 *
 * Before DNS points here, preview a site on the workers.dev URL with
 * ?site=<domain> (remembered in a cookie, never indexed).
 */

interface Env {
  ASSETS: { fetch(input: Request | string | URL): Promise<Response> };
  /** Decra's URL, e.g. https://decra-stays.vercel.app */
  DECRA_ORIGIN: string;
  /** Optional, same value as in Vercel: "annie-may=<key>,..." (for fallback pages) */
  WEB3FORMS_KEYS?: string;
}

const SITES: Record<string, string> = {
  'tenfiftybakers.com.au': 'ten-fifty-bakers',
  'theprescriptionpad.com.au': 'prescription-pad',
  'anniemay.com.au': 'annie-may',
};

const UPSTREAM_TIMEOUT_MS = 10_000;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const hostname = url.hostname.toLowerCase();

    if (hostname.startsWith('www.') && SITES[hostname.slice(4)]) {
      url.hostname = hostname.slice(4);
      return Response.redirect(url.toString(), 308);
    }

    // Which site: the domain itself, or a preview on another host
    let host = SITES[hostname] ? hostname : '';
    let preview = false;
    if (!host) {
      const asked = url.searchParams.get('site') ?? cookie(req, 'decra-site') ?? '';
      if (!SITES[asked]) {
        return new Response('Add ?site=anniemay.com.au (or another property domain) to preview.', { status: 404 });
      }
      host = asked;
      preview = true;
    }
    const pid = SITES[host];

    let res: Response;
    if (url.pathname.startsWith('/wp-content/')) {
      res = await oldMediaUrl(url, host, env);
    } else {
      res = await forward(req, url, host, env).catch(() => null as unknown as Response);
      if (!res || res.status >= 500) {
        const copy = req.method === 'GET' ? await fallbackPage(url, pid, env) : null;
        if (copy) res = copy;
        else if (!res) res = new Response('The site is briefly unavailable. Please try again shortly.', { status: 503 });
      }
    }

    if (preview) {
      res = new Response(res.body, res);
      res.headers.set('x-robots-tag', 'noindex, nofollow');
      if (url.searchParams.has('site'))
        res.headers.append('set-cookie', `decra-site=${host}; Path=/; HttpOnly; Secure; SameSite=Lax`);
    }
    return res;
  },
};

/** Forward to Decra as if the request had arrived on the property domain. */
async function forward(req: Request, url: URL, host: string, env: Env): Promise<Response> {
  const origin = new URL(env.DECRA_ORIGIN);
  const target = new URL(url.pathname + url.search, origin);
  target.searchParams.delete('site');

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('cookie'); // the public sites use none; never pass the preview cookie on
  headers.set('x-decra-host', host);
  headers.set('x-forwarded-host', host);

  const upstream = await fetch(target.toString(), {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
    redirect: 'manual',
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  const out = new Response(upstream.body, upstream);
  // Redirects Decra builds point at its own URL; send visitors to the domain.
  const location = out.headers.get('location');
  if (location) {
    const loc = new URL(location, origin);
    if (loc.host === origin.host) {
      loc.protocol = url.protocol;
      loc.hostname = url.hostname;
      loc.port = url.port;
      out.headers.set('location', loc.toString());
    }
  }
  for (const h of ['x-vercel-id', 'x-vercel-cache', 'x-matched-path', 'server', 'set-cookie'])
    out.headers.delete(h);
  return out;
}

/**
 * /wp-content/... → the localized copy in /mirror-assets/, named by the
 * same hash scripts/localize-mirror-assets.mjs gave the original URL.
 */
async function oldMediaUrl(url: URL, host: string, env: Env): Promise<Response> {
  const original = `https://${host}${url.pathname}${url.search}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(original));
  const hash = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 10);
  const base = (url.pathname.split('/').pop() || 'asset').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80);
  const res = await env.ASSETS.fetch(new URL(`/mirror-assets/${hash}-${base}`, url));
  return res.ok ? res : new Response('Not found', { status: 404 });
}

/** This worker's own copy of a page, used only when Decra doesn't answer. */
async function fallbackPage(url: URL, pid: string, env: Env): Promise<Response | null> {
  const slug = url.pathname === '/' ? 'home' : url.pathname.replace(/^\/+|\/+$/g, '');
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const res = await env.ASSETS.fetch(new URL(`/mirror/${pid}/${slug}.html`, url));
  if (!res.ok) return null;
  let html = await res.text();
  // same public link form Decra's mirror route produces
  html = html
    .replaceAll(`/m/live/${pid}/`, `/mirror/${pid}/`)
    .replaceAll(`/mirror/${pid}/home.html`, '/')
    .replace(new RegExp(`/mirror/${pid}/([a-z0-9-]+)\\.html`, 'g'), '/$1/');
  const key = formKey(env, pid);
  if (key && html.includes('forminator-custom-form') && !html.includes('decra-form-key'))
    html = html.replace('<head>', `<head><meta name="decra-form-key" content="${key}">`);
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function formKey(env: Env, pid: string): string | null {
  for (const pair of (env.WEB3FORMS_KEYS ?? '').split(',')) {
    const [id, key] = pair.split('=').map((x) => x?.trim());
    if (id === pid && key && /^[a-zA-Z0-9-]+$/.test(key)) return key;
  }
  return null;
}

function cookie(req: Request, name: string): string | null {
  const m = (req.headers.get('cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
