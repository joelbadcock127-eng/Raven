'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import type { SiteBlock } from '@/lib/sites';

export interface SaveResult {
  ok: boolean;
  message: string;
}

export async function saveSitePage(
  propertyId: string,
  slug: string,
  navLabel: string,
  title: string,
  blocks: SiteBlock[],
): Promise<SaveResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const { error } = await supabase.from('site_pages').upsert({
    property_id: propertyId,
    slug,
    nav_label: navLabel,
    title,
    blocks,
    updated_at: new Date().toISOString(),
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath('/sites');
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
  revalidatePath('/sites');
  return { ok: true, message: 'Reverted to original scrape' };
}
