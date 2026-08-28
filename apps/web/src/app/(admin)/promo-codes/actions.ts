'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { getOrCreateTrackedLink } from '@/lib/links';
import { checkoutUrl } from '@/lib/promo';

export interface PromoResult {
  ok: boolean;
  message: string;
}

export interface PromoInput {
  id?: string;
  property_id: string;
  code: string;
  label: string;
  terms?: string;
  kind: string;
  value?: string;
  min_nights?: string;
  book_by?: string;
  stay_from?: string;
  stay_to?: string;
  default_adults?: string;
  status?: string;
  notes?: string;
}

const KINDS = ['percent', 'fixed', 'free-night', 'other'];
const STATUSES = ['draft', 'active', 'paused', 'expired'];

const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const num = (v?: string) => {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) ? n : null;
};

/**
 * Create or update a code. The code string must already exist in Lodgify —
 * Decra cannot create it there (no API), so this records and distributes it.
 * Saving also ensures a tracked link so clicks land in Analytics.
 */
export async function savePromoCode(input: PromoInput): Promise<PromoResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, message: 'A code is required.' };
  if (!/^[A-Z0-9][A-Z0-9._-]{1,31}$/.test(code))
    return { ok: false, message: 'Use 2–32 characters: letters, numbers, dot, dash or underscore.' };

  const { data: prop } = await supabase
    .from('properties')
    .select('id, booking_source, lodgify_property_id')
    .eq('id', input.property_id)
    .maybeSingle();
  if (!prop) return { ok: false, message: 'Unknown property.' };
  if (prop.booking_source !== 'lodgify' || !prop.lodgify_property_id)
    return { ok: false, message: 'That property is not on Lodgify, so it cannot take Lodgify codes.' };

  const row = {
    property_id: input.property_id,
    code,
    label: input.label?.trim() || code,
    terms: input.terms?.trim() ?? '',
    kind: KINDS.includes(input.kind) ? input.kind : 'other',
    value: num(input.value),
    min_nights: num(input.min_nights),
    book_by: date(input.book_by),
    stay_from: date(input.stay_from),
    stay_to: date(input.stay_to),
    default_adults: num(input.default_adults) ?? 2,
    status: STATUSES.includes(input.status ?? '') ? input.status! : 'draft',
    notes: input.notes?.trim() ?? '',
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error } = input.id
    ? await supabase.from('promo_codes').update(row).eq('id', input.id).select('id').maybeSingle()
    : await supabase.from('promo_codes').insert(row).select('id').maybeSingle();

  if (error)
    return {
      ok: false,
      message: error.code === '23505' ? 'That code already exists for this property.' : error.message,
    };

  // tracked link so every share of this code is counted in Analytics
  if (saved?.id) {
    const link = await getOrCreateTrackedLink(supabase, {
      propertyId: input.property_id,
      label: `promo:${code}`,
      kind: 'promo',
      targetUrl: checkoutUrl({
        lodgifyPropertyId: prop.lodgify_property_id,
        code,
        adults: row.default_adults,
      }),
    });
    if (link) await supabase.from('promo_codes').update({ tracked_link_id: link.id }).eq('id', saved.id);
  }

  revalidatePath('/promo-codes');
  return { ok: true, message: input.id ? 'Code updated' : 'Code added' };
}

export async function setPromoStatus(id: string, status: string): Promise<PromoResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  if (!STATUSES.includes(status)) return { ok: false, message: 'Unknown status.' };
  const { error } = await supabase
    .from('promo_codes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/promo-codes');
  return { ok: true, message: `Marked ${status}` };
}

export async function deletePromoCode(id: string): Promise<PromoResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase.from('promo_codes').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/promo-codes');
  return { ok: true, message: 'Code removed from Decra (it still exists in Lodgify)' };
}
