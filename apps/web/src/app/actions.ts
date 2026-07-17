'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';

const VALID = new Set(['approved', 'modified', 'dismissed', 'new', 'done']);

export async function setOpportunityStatus(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !VALID.has(status)) return;
  const supabase = supabaseAdmin();
  if (!supabase) return;
  await supabase
    .from('opportunities')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  // Approving an opportunity opens a campaign (the 9-step pipeline):
  // discover → availability → property → page → reel/posts/email/outreach →
  // owner approval → publish → bookings → stop & record revenue.
  if (status === 'approved') {
    const { data: opp } = await supabase
      .from('opportunities')
      .select('id, event_id, recommended_property_id')
      .eq('id', id)
      .maybeSingle();
    if (opp) {
      const { count } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('opportunity_id', id);
      if ((count ?? 0) === 0) {
        await supabase.from('campaigns').insert({
          opportunity_id: opp.id,
          event_id: opp.event_id,
          property_id: opp.recommended_property_id,
          status: 'preparing',
        });
      }
    }
  }

  revalidatePath('/');
  revalidatePath('/campaigns');
}
