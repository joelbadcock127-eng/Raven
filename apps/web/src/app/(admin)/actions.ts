'use server';

import { randomUUID } from 'node:crypto';
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

/**
 * Log a local demand signal by hand — a wedding you heard about, a crew in
 * town for a construction job, a funeral, a sports carnival. Scrapers can't
 * see most of these; you can. The signal becomes a normal opportunity.
 */
const SIGNAL_KINDS: Record<string, { tags: string[]; demand: number }> = {
  wedding: { tags: ['wedding-milestone', 'family'], demand: 75 },
  funeral: { tags: ['funeral', 'family'], demand: 65 },
  corporate: { tags: ['business', 'conference'], demand: 60 },
  construction: { tags: ['business'], demand: 60 },
  sports: { tags: ['sports', 'community'], demand: 60 },
  other: { tags: ['community'], demand: 50 },
};

export async function logSignal(input: {
  kind: string;
  title: string;
  start: string;
  end?: string;
  venue?: string;
  propertyId?: string;
  notes?: string;
}): Promise<OpportunityActionResult> {
  const kind = SIGNAL_KINDS[input.kind] ?? SIGNAL_KINDS.other;
  if (!input.title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.start))
    return { ok: false, message: 'Give it a name and a date' };
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured on the server.' };

  const id = `manual-${randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();
  const end = input.end && /^\d{4}-\d{2}-\d{2}$/.test(input.end) ? input.end : input.start;

  const { error } = await supabase.from('events').insert({
    id,
    source: 'manual',
    source_url: '',
    title: input.title.trim(),
    description: input.notes?.trim() || null,
    start_date: input.start,
    end_date: end,
    venue_name: input.venue?.trim() || null,
    locality: input.venue?.trim() || null,
    tags: kind.tags,
    ai_demand: kind.demand,
    ai_summary: `Logged by the owner${input.venue ? ` — ${input.venue}` : ''}. ${input.notes?.trim() ?? ''}`.trim(),
    ai_enriched_at: now,
    last_seen_at: now,
    last_checked_at: now,
  });
  if (error) return { ok: false, message: `Could not log signal: ${error.message}` };

  const { data: props } = await supabase.from('properties').select('id');
  const propertyIds = (props ?? []).map((p) => p.id as string);
  if (propertyIds.length) {
    await supabase.from('event_scores').insert(
      propertyIds.map((pid) => ({
        event_id: id,
        property_id: pid,
        total: input.propertyId ? (pid === input.propertyId ? 85 : 40) : 60,
        demand: Math.round(kind.demand / 4),
        location: 15,
        guest_fit: 15,
        inventory: 12,
        stay_fit: 8,
        rationale: ['Owner-logged signal'],
        scored_at: now,
      })),
    );
  }
  await supabase.from('opportunities').insert({
    event_id: id,
    recommended_property_id: input.propertyId || propertyIds[0] || null,
    priority: kind.demand >= 65 ? 'high' : 'medium',
    status: 'new',
  });

  revalidatePath('/');
  return { ok: true, message: 'Signal logged — it’s in the feed' };
}
