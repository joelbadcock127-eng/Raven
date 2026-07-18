'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { publishGbpPost } from '@/lib/gbp';
import { boostPost } from '@/lib/metaAds';

export interface ActionResult {
  ok: boolean;
  message: string;
}

/** Flip the generated landing page live (indexable + linked). */
export async function publishEventPage(campaignId: string): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { data: c } = await supabase
    .from('campaigns')
    .select('landing_page_slug, assets, distribution')
    .eq('id', campaignId)
    .maybeSingle();
  if (!c?.landing_page_slug) return { ok: false, message: 'No landing page generated yet.' };
  const { error } = await supabase
    .from('event_pages')
    .update({ published: true, updated_at: new Date().toISOString() })
    .eq('slug', c.landing_page_slug);
  if (error) return { ok: false, message: error.message };
  await supabase
    .from('campaigns')
    .update({
      assets: { ...(c.assets ?? {}), page: 'published' },
      distribution: { ...(c.distribution ?? {}), contentPage: 'done' },
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);
  revalidatePath('/campaigns');
  revalidatePath(`/events/${c.landing_page_slug}`);
  return { ok: true, message: 'Landing page is live' };
}

/** Post the kit's GBP text to the property's Google Business Profile. */
export async function publishCampaignGbp(campaignId: string): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { data: c } = await supabase
    .from('campaigns')
    .select('property_id, kit, landing_page_slug, events(title, start_date, end_date)')
    .eq('id', campaignId)
    .maybeSingle();
  const event = c?.events as unknown as { title: string; start_date: string; end_date: string } | null;
  const kit = (c?.kit ?? {}) as { gbpPost?: string };
  if (!c || !event || !kit.gbpPost) return { ok: false, message: 'No GBP post in the kit yet.' };

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://raven.vercel.app';
  const res = await publishGbpPost({
    propertyId: c.property_id ?? '',
    summary: kit.gbpPost,
    eventTitle: event.title,
    startDate: event.start_date,
    endDate: event.end_date,
    linkUrl: c.landing_page_slug ? `${base}/events/${c.landing_page_slug}` : base,
  });
  revalidatePath('/campaigns');
  return res;
}

/**
 * Boost the campaign's published Instagram post/reel as a paid geo-targeted
 * ad (created paused for review in Ads Manager).
 */
export async function boostCampaign(campaignId: string, dailyBudgetAud: number): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { data: c } = await supabase
    .from('campaigns')
    .select('property_id, events(title, start_date), properties(lat, lon)')
    .eq('id', campaignId)
    .maybeSingle();
  const event = c?.events as unknown as { title: string; start_date: string } | null;
  const prop = c?.properties as unknown as { lat: number; lon: number } | null;
  if (!c || !event) return { ok: false, message: 'Campaign not found.' };

  const { data: published } = await supabase
    .from('social_posts')
    .select('external_id')
    .eq('campaign_id', campaignId)
    .eq('status', 'published')
    .not('external_id', 'is', null)
    .limit(1);
  const igMediaId = published?.[0]?.external_id;
  if (!igMediaId)
    return { ok: false, message: 'Publish one of the campaign posts to Instagram first — the boost promotes that post.' };

  return boostPost({
    igMediaId,
    name: event.title,
    dailyBudgetAud,
    endDate: event.start_date,
    lat: prop?.lat,
    lon: prop?.lon,
    radiusKm: 80,
  });
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

/** Save the campaign's goal — the dates it exists to fill — and its offer. */
export async function saveCampaignPlan(
  id: string,
  plan: { targetStart?: string; targetEnd?: string; offerId?: string | null },
): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (plan.targetStart !== undefined)
    patch.target_start = /^\d{4}-\d{2}-\d{2}$/.test(plan.targetStart) ? plan.targetStart : null;
  if (plan.targetEnd !== undefined)
    patch.target_end = /^\d{4}-\d{2}-\d{2}$/.test(plan.targetEnd) ? plan.targetEnd : null;
  if (plan.offerId !== undefined) {
    const { OFFER_TEMPLATES } = await import('@/lib/offers');
    const offer = OFFER_TEMPLATES.find((o) => o.id === plan.offerId) ?? null;
    patch.offer = offer ? { id: offer.id, name: offer.name, pitch: offer.pitch } : null;
  }

  const { error } = await supabase.from('campaigns').update(patch).eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/campaigns');
  return { ok: true, message: 'Plan saved' };
}

/** Tick a distribution channel: todo → done → skipped → todo. */
export async function setDistributionStatus(
  id: string,
  channel: string,
  status: 'todo' | 'done' | 'skipped',
): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };

  const { data: row } = await supabase.from('campaigns').select('distribution').eq('id', id).maybeSingle();
  if (!row) return { ok: false, message: 'Campaign not found' };
  const distribution = { ...(row.distribution as Record<string, unknown>), [channel]: status };

  const { error } = await supabase
    .from('campaigns')
    .update({ distribution, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/campaigns');
  return { ok: true, message: 'Updated' };
}

type PlaybookMap = Record<string, number | { d?: number; s?: number }>;

/** Override when a distribution channel switches on, in days before the target date. */
export async function setPlaybookDays(id: string, channel: string, daysOut: number): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };
  const { data: row } = await supabase.from('campaigns').select('playbook').eq('id', id).maybeSingle();
  if (!row) return { ok: false, message: 'Campaign not found' };
  const playbook = { ...(row.playbook as PlaybookMap) };
  const prev = playbook[channel];
  playbook[channel] = {
    ...(typeof prev === 'object' ? prev : {}),
    d: Math.max(0, Math.round(daysOut)),
  };
  const { error } = await supabase
    .from('campaigns')
    .update({ playbook, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/campaigns');
  return { ok: true, message: 'Playbook updated' };
}

/** Save a full channel ordering for this campaign's playbook. */
export async function setPlaybookOrder(id: string, orderedChannelIds: string[]): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };
  const { data: row } = await supabase.from('campaigns').select('playbook').eq('id', id).maybeSingle();
  if (!row) return { ok: false, message: 'Campaign not found' };
  const playbook = { ...(row.playbook as PlaybookMap) };
  orderedChannelIds.forEach((ch, i) => {
    const prev = playbook[ch];
    playbook[ch] = { ...(typeof prev === 'object' ? prev : typeof prev === 'number' ? { d: prev } : {}), s: i };
  });
  const { error } = await supabase
    .from('campaigns')
    .update({ playbook, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/campaigns');
  return { ok: true, message: 'Order saved' };
}

/**
 * Push the kit's guest email into MailerLite as a draft campaign, ready to
 * review and send from MailerLite (needs MAILERLITE_API_KEY, and ideally
 * MAILERLITE_FROM / MAILERLITE_FROM_NAME set to a verified sender).
 */
export async function sendGuestEmail(campaignId: string): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };
  const key = process.env.MAILERLITE_API_KEY;
  if (!key)
    return { ok: false, message: 'MAILERLITE_API_KEY is not set in Vercel yet — copy the email and send it manually for now.' };

  const { data: c } = await supabase
    .from('campaigns')
    .select('kit, distribution, property_id')
    .eq('id', campaignId)
    .maybeSingle();
  const kit = (c?.kit ?? {}) as { guestEmail?: { subject: string; body: string } };
  if (!c || !kit.guestEmail) return { ok: false, message: 'No guest email in the kit yet.' };

  const html = kit.guestEmail.body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.7">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const res = await fetch('https://connect.mailerlite.com/api/campaigns', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      name: `Raven — ${kit.guestEmail.subject}`,
      type: 'regular',
      emails: [
        {
          subject: kit.guestEmail.subject,
          from_name: process.env.MAILERLITE_FROM_NAME ?? 'Raven Properties',
          from: process.env.MAILERLITE_FROM ?? 'stay@tenfiftybakers.com.au',
          content: `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#211d16">${html}</div>`,
        },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    return { ok: false, message: `MailerLite said no (${res.status}): ${detail}` };
  }

  await supabase
    .from('campaigns')
    .update({
      distribution: { ...((c.distribution as Record<string, string>) ?? {}), email: 'done' },
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);
  revalidatePath('/campaigns');
  return { ok: true, message: 'Draft created in MailerLite — review and hit send there.' };
}
