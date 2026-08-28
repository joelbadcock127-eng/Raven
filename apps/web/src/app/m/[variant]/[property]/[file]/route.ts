import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { appUrl } from '@/lib/links';
import { SITES } from '@/lib/sites';

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

function transform(html: string, pid: string, slug: string, variant: 'live' | 'sandbox'): string {
  // normalise any historical link style to this variant's URL space
  html = html
    .replaceAll(`/mirror-sandbox/${pid}/`, `/m/${variant}/${pid}/`)
    .replaceAll(`/mirror/${pid}/`, `/m/${variant}/${pid}/`)
    .replaceAll(`/m/live/${pid}/`, `/m/${variant}/${pid}/`)
    .replaceAll(`/m/sandbox/${pid}/`, `/m/${variant}/${pid}/`);
  // editor-bridge slug: sandbox edits must save under sandbox-- keys
  const liveMeta = `content="${pid}|${slug}"`;
  const sandboxMeta = `content="${pid}|sandbox--${slug}"`;
  html = variant === 'sandbox' ? html.replaceAll(liveMeta, sandboxMeta) : html.replaceAll(sandboxMeta, liveMeta);
  return html;
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

  if (html === null) {
    // fall back to the static file baked into the deploy
    try {
      const res = await fetch(`${appUrl()}/mirror/${property}/${slug}.html`, { cache: 'no-store' });
      if (res.ok) html = await res.text();
    } catch {
      /* fall through */
    }
  }
  if (html === null) return new NextResponse('Not found', { status: 404 });

  return new NextResponse(transform(html, property, slug, variant as 'live' | 'sandbox'), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
