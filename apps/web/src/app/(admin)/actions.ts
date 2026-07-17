'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';

const VALID = new Set(['approved', 'modified', 'dismissed', 'new', 'done']);

export interface OpportunityActionResult {
  ok: boolean;
  message: string;
  campaignCreated?: boolean;
}

export async function setOpportunityStatus(
  id: string,
  status: string,
): Promise<OpportunityActionResult> {
  if (!id || !VALID.has(status)) return { ok: false, message: 'Invalid request' };
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured on the server.' };

  const { data: updated, error } = await supabase
    .from('opportunities')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, event_id, recommended_property_id');

  if (error) return { ok: false, message: `Update failed: ${error.message}` };
  if (!updated || updated.length === 0)
    return { ok: false, message: 'Opportunity not found — refresh the page.' };

  // Approving an opportunity opens a campaign (the 9-step pipeline).
  let campaignCreated = false;
  if (status === 'approved') {
    const opp = updated[0];
    const { count } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('opportunity_id', id);
    if ((count ?? 0) === 0) {
      const { error: campErr } = await supabase.from('campaigns').insert({
        opportunity_id: opp.id,
        event_id: opp.event_id,
        property_id: opp.recommended_property_id,
        status: 'preparing',
      });
      if (campErr) return { ok: false, message: `Approved, but campaign failed: ${campErr.message}` };
      campaignCreated = true;
    }
  }

  revalidatePath('/');
  revalidatePath('/campaigns');
  return {
    ok: true,
    message:
      status === 'approved'
        ? campaignCreated
          ? 'Approved — campaign opened'
          : 'Approved'
        : status === 'dismissed'
          ? 'Dismissed'
          : 'Updated',
    campaignCreated,
  };
}
