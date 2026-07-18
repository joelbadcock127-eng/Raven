'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';

export interface OutreachResult {
  ok: boolean;
  message: string;
}

export interface ContactInput {
  organisation: string;
  category: string;
  contact_name?: string;
  contact_role?: string;
  email?: string;
  phone?: string;
  demand_trigger?: string;
  booking_type?: string;
  property_fit?: string[];
  next_follow_up?: string | null;
  active_dates?: string;
  negotiated_rate?: string;
  notes?: string;
}

function clean(input: ContactInput): Record<string, unknown> {
  return {
    organisation: input.organisation.trim(),
    category: input.category || 'other',
    contact_name: input.contact_name?.trim() || null,
    contact_role: input.contact_role?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    demand_trigger: input.demand_trigger?.trim() || null,
    booking_type: input.booking_type?.trim() || null,
    property_fit: input.property_fit ?? [],
    next_follow_up: input.next_follow_up && /^\d{4}-\d{2}-\d{2}$/.test(input.next_follow_up) ? input.next_follow_up : null,
    active_dates: input.active_dates?.trim() || null,
    negotiated_rate: input.negotiated_rate?.trim() || null,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

export async function saveContact(id: string | null, input: ContactInput): Promise<OutreachResult> {
  if (!input.organisation?.trim()) return { ok: false, message: 'Organisation name is required' };
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };

  const row = clean(input);
  const { error } = id
    ? await supabase.from('outreach_contacts').update(row).eq('id', id)
    : await supabase.from('outreach_contacts').insert(row);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/outreach');
  return { ok: true, message: id ? 'Saved' : 'Added' };
}

/** Stamp today as the last contact and set the next follow-up. */
export async function markContacted(id: string, nextFollowUp?: string): Promise<OutreachResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };
  const { error } = await supabase
    .from('outreach_contacts')
    .update({
      last_contact: new Date().toISOString().slice(0, 10),
      next_follow_up: nextFollowUp && /^\d{4}-\d{2}-\d{2}$/.test(nextFollowUp) ? nextFollowUp : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/outreach');
  return { ok: true, message: 'Logged' };
}

export async function recordContactRevenue(id: string, revenue: number): Promise<OutreachResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };
  const { error } = await supabase
    .from('outreach_contacts')
    .update({ previous_revenue: revenue, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/outreach');
  return { ok: true, message: 'Recorded' };
}

export async function deleteContact(id: string): Promise<OutreachResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };
  const { error } = await supabase.from('outreach_contacts').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/outreach');
  return { ok: true, message: 'Deleted' };
}
