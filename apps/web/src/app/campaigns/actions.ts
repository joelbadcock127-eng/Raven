'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';

export interface ActionResult {
  ok: boolean;
  message: string;
}

const STATUSES = new Set(['preparing', 'ready_for_approval', 'approved', 'live', 'stopped', 'completed']);

export async function setCampaignStatus(id: string, status: string): Promise<ActionResult> {
  if (!STATUSES.has(status)) return { ok: false, message: 'Invalid status' };
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'live') patch.started_at = new Date().toISOString();
  if (status === 'stopped' || status === 'completed') patch.stopped_at = new Date().toISOString();

  const { error } = await supabase.from('campaigns').update(patch).eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/campaigns');
  return { ok: true, message: 'Updated' };
}

export async function recordRevenue(id: string, revenue: number, bookings: number): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase
    .from('campaigns')
    .update({ revenue, bookings, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/campaigns');
  return { ok: true, message: 'Recorded' };
}
