'use server';

import { supabaseAdmin } from '@/lib/supabase';

export interface SaveResult {
  ok: boolean;
  message: string;
}

export interface MirrorOverride {
  sel: string;
  prop: 'text' | 'src';
  value: string;
}

/**
 * Persist the edit overrides for one mirrored site page.
 * Stored in site_pages.blocks as a JSON array of {sel, prop, value}.
 */
export async function saveSiteOverrides(
  propertyId: string,
  slug: string,
  overrides: MirrorOverride[],
): Promise<SaveResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const { error } = await supabase.from('site_pages').upsert({
    property_id: propertyId,
    slug,
    nav_label: slug,
    title: slug,
    blocks: overrides,
    updated_at: new Date().toISOString(),
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Saved' };
}

export async function resetSitePage(propertyId: string, slug: string): Promise<SaveResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase
    .from('site_pages')
    .delete()
    .eq('property_id', propertyId)
    .eq('slug', slug);
  if (error) return { ok: false, message: error.message };
  // reverting a sandbox page also discards its staged page HTML
  if (slug.startsWith('sandbox--')) {
    await supabase
      .from('mirror_pages')
      .delete()
      .eq('property_id', propertyId)
      .eq('slug', slug.slice('sandbox--'.length))
      .eq('variant', 'sandbox');
  }
  return { ok: true, message: 'Reverted to the live original' };
}

/** Sandbox → live: copy a sandbox page's overrides onto the live page.
 *  If the sandbox has no saved row yet, its effective state is the live
 *  overrides minus dead wp-content image URLs (same rule as the
 *  /api/site-overrides fallback), so publishing applies that cleanup. */
export async function publishSandboxPage(propertyId: string, liveSlug: string): Promise<SaveResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const read = async (slug: string) => {
    const { data } = await supabase
      .from('site_pages')
      .select('blocks')
      .eq('property_id', propertyId)
      .eq('slug', slug)
      .maybeSingle();
    return (data?.blocks as MirrorOverride[] | undefined) ?? null;
  };

  let blocks = await read(`sandbox--${liveSlug}`);
  if (blocks === null) {
    const live = (await read(liveSlug)) ?? [];
    blocks = live.filter(
      (o) => !(o.prop === 'src' && /^https?:\/\/(www\.)?[^/]+\/wp-content\//i.test(o.value)),
    );
  }

  const { error } = await supabase.from('site_pages').upsert({
    property_id: propertyId,
    slug: liveSlug,
    nav_label: liveSlug,
    title: liveSlug,
    blocks,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: error.message };

  // staged page HTML (code-level changes) promotes too, retargeted to the
  // live variant's URL space and editor slug
  const { data: staged } = await supabase
    .from('mirror_pages')
    .select('html')
    .eq('property_id', propertyId)
    .eq('slug', liveSlug)
    .eq('variant', 'sandbox')
    .maybeSingle();
  if (staged?.html) {
    const liveHtml = (staged.html as string)
      .replaceAll(`/m/sandbox/${propertyId}/`, `/m/live/${propertyId}/`)
      .replaceAll(`content="${propertyId}|sandbox--${liveSlug}"`, `content="${propertyId}|${liveSlug}"`);
    const { error: htmlErr } = await supabase.from('mirror_pages').upsert({
      property_id: propertyId,
      slug: liveSlug,
      variant: 'live',
      html: liveHtml,
      updated_at: new Date().toISOString(),
    });
    if (htmlErr) return { ok: false, message: `Edits published; page HTML failed: ${htmlErr.message}` };
    return { ok: true, message: 'Published to live (edits + page changes)' };
  }
  return { ok: true, message: 'Published to live' };
}

/** Discard sandbox edits for a page — it re-inherits the live overrides. */
export async function resetSandboxPage(propertyId: string, liveSlug: string): Promise<SaveResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase
    .from('site_pages')
    .delete()
    .eq('property_id', propertyId)
    .eq('slug', `sandbox--${liveSlug}`);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Sandbox reset to live state' };
}
