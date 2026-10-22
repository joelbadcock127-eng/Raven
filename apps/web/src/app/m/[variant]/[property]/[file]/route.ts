import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { appUrl } from '@/lib/links';
import { SITES } from '@/lib/sites';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const dynamic = 'force-dynamic';

/**
 * Mirror page serving with a publishable database layer.
 *
 * /m/<live|sandbox>/<property>/<slug>.html serves, in order:
 *   1. the mirror_pages row for that variant (a published/staged change),
 *   2. for sandbox: the live row (fork-on-read),
 *   3. the static file baked into the deploy (public/mirror/...).
 *
 * The admin workspace frames these URLs; property domains rewrite here.
 * Sandbox HTML gets its editor-bridge slug prefixed 'sandbox--' so click
 * edits save separately, and internal links are kept inside the variant.
 * A published row SHADOWS the repo file until the row is deleted.
 */

function transform(
  html: string,
  pid: string,
  slug: string,
  variant: 'live' | 'sandbox',
  publicSite: boolean,
): string {
  // normalise any historical link style to one base form first
  html = html
    .replaceAll(`/mirror-sandbox/${pid}/`, `/mirror/${pid}/`)
    .replaceAll(`/m/live/${pid}/`, `/mirror/${pid}/`)
    .replaceAll(`/m/sandbox/${pid}/`, `/mirror/${pid}/`);

  if (publicSite) {
    // On the property's own domain, internal links must be the clean public
    // URLs — /m/* is admin-only there and the middleware bounces it home.
    html = html.replaceAll(`/mirror/${pid}/home.html`, '/');
    // WordPress permalink form, matching the canonical tags.
    html = html.replace(new RegExp(`/mirror/${pid}/([a-z0-9-]+)\\.html`, 'g'), '/$1/');
  } else {
    // Inside the admin workspace, links stay within the served variant so
    // the sandbox never leaks into live pages mid-browse.
    html = html.replaceAll(`/mirror/${pid}/`, `/m/${variant}/${pid}/`);
  }

  // WordPress contact forms post through /mirror-enquiry.js (done here as
  // well as in the mirror script so published DB copies get it too)
  if (html.includes('forminator-custom-form')) {
    if (!html.includes('data-decra-enquiry='))
      html = html.replace(/<form\b(?=[^>]*\bforminator-custom-form\b)/g, `<form data-decra-enquiry="${pid}"`);
    if (!html.includes('/mirror-enquiry.js'))
      html = html.replace('</body>', '<script src="/mirror-enquiry.js" defer></script></body>');
    const key = formKey(pid);
    if (key) html = html.replace('<head>', `<head><meta name="decra-form-key" content="${key}">`);
  }

  // editor-bridge slug: sandbox edits must save under sandbox-- keys
  const liveMeta = `content="${pid}|${slug}"`;
  const sandboxMeta = `content="${pid}|sandbox--${slug}"`;
  html = variant === 'sandbox' ? html.replaceAll(liveMeta, sandboxMeta) : html.replaceAll(sandboxMeta, liveMeta);
  return html;
}

/**
 * Web3Forms public access key for a property, from WEB3FORMS_KEYS
 * ("annie-may=<key>,prescription-pad=<key>,ten-fifty-bakers=<key>").
 * Each key is created at web3forms.com for the inbox that should get
 * that property's enquiries. Public by design: it only allows sending.
 */
function formKey(pid: string): string | null {
  for (const pair of (process.env.WEB3FORMS_KEYS ?? '').split(',')) {
    const [id, key] = pair.split('=').map((x) => x?.trim());
    if (id === pid && key && /^[a-zA-Z0-9-]+$/.test(key)) return key;
  }
  return null;
}

/**
 * The static file baked into the deploy. On Cloudflare it comes straight
 * from the ASSETS binding (a Worker can't fetch its own URL); elsewhere
 * (Vercel, next dev) over HTTP from the app.
 */
async function staticMirror(req: NextRequest, property: string, slug: string): Promise<string | null> {
  const path = `/mirror/${property}/${slug}.html`;
  let assets: { fetch(input: Request | URL): Promise<Response> } | undefined;
  try {
    assets = (getCloudflareContext().env as { ASSETS?: typeof assets }).ASSETS;
  } catch {
    /* not running on Cloudflare */
  }
  try {
    const res = assets ? await assets.fetch(new URL(path, req.url)) : await fetch(`${appUrl()}${path}`, { cache: 'no-store' });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** Same own-host test as the middleware: anything else is a property domain. */
function isOwnHost(host: string): boolean {
  let appHost = '';
  try {
    appHost = new URL(process.env.NEXT_PUBLIC_APP_URL ?? '').hostname.toLowerCase();
  } catch {
    /* unset */
  }
  return host === appHost || host.endsWith('.vercel.app') || host.endsWith('.workers.dev') || host === 'localhost' || host === '127.0.0.1';
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ variant: string; property: string; file: string }> },
) {
  const { variant, property, file } = await ctx.params;
  if (variant !== 'live' && variant !== 'sandbox') return new NextResponse('Not found', { status: 404 });
  if (!SITES.some((s) => s.propertyId === property)) return new NextResponse('Not found', { status: 404 });
  const m = file.match(/^([a-z0-9-]+)\.html$/);
  if (!m) return new NextResponse('Not found', { status: 404 });
  const slug = m[1];

  let html: string | null = null;
  const supabase = supabaseAdmin();
  if (supabase) {
    const variants = variant === 'sandbox' ? ['sandbox', 'live'] : ['live'];
    for (const v of variants) {
      const { data } = await supabase
        .from('mirror_pages')
        .select('html')
        .eq('property_id', property)
        .eq('slug', slug)
        .eq('variant', v)
        .maybeSingle();
      if (data?.html) {
        html = data.html;
        break;
      }
    }
  }

  if (html === null) html = await staticMirror(req, property, slug);
  if (html === null) return new NextResponse('Not found', { status: 404 });

  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];
  const publicSite = !isOwnHost(host);
  return new NextResponse(transform(html, property, slug, variant as 'live' | 'sandbox', publicSite), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
