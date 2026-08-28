import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface Override {
  sel: string;
  prop: 'text' | 'src';
  value: string;
}

/** Known-dead image sources: same-domain WordPress uploads no longer exist
 *  now the domains serve from Decra, so an override pointing at one would
 *  render a broken image. */
function isDeadSrc(o: Override): boolean {
  return o.prop === 'src' && /^https?:\/\/(www\.)?[^/]+\/wp-content\//i.test(o.value);
}

async function fetchOverrides(property: string, slug: string): Promise<Override[] | null> {
  const supabase = supabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from('site_pages')
    .select('blocks')
    .eq('property_id', property)
    .eq('slug', slug)
    .maybeSingle();
  return (data?.blocks as Override[] | undefined) ?? null;
}

/** Read the saved edit overrides for one mirrored site page.
 *
 *  Sandbox pages (slug "sandbox--<slug>") fork-on-write: until a sandbox
 *  save exists, they inherit the live page's overrides — minus any that
 *  are objectively broken (dead wp-content image URLs) — so the sandbox
 *  opens as a working clone of the live page. */
export async function GET(req: NextRequest) {
  const property = req.nextUrl.searchParams.get('property') ?? '';
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  if (!property || !slug) return NextResponse.json({ overrides: [] });

  let overrides = await fetchOverrides(property, slug);

  if (overrides === null && slug.startsWith('sandbox--')) {
    const live = await fetchOverrides(property, slug.slice('sandbox--'.length));
    overrides = (live ?? []).filter((o) => !isDeadSrc(o));
  }

  return NextResponse.json({ overrides: overrides ?? [] });
}
