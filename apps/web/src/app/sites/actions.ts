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
  return { ok: true, message: 'Reverted to the live original' };
}
