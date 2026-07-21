import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Tracked links: a short /go/<code> URL that records a click then redirects
 * to the real target with UTM tags, so social and bio-link traffic can be
 * attributed to a property or campaign.
 */

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no ambiguous chars

function randomCode(len = 6): string {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://raven5.vercel.app').replace(/\/$/, '');
}

/** Append UTM params, correctly handling URLs that carry a #hash (Lodgify). */
export function appendUtm(url: string, utm: { source?: string; medium?: string; campaign?: string }): string {
  const [base, hash] = url.split('#');
  const [path, query] = base.split('?');
  const params = new URLSearchParams(query);
  if (utm.source) params.set('utm_source', utm.source);
  if (utm.medium) params.set('utm_medium', utm.medium);
  if (utm.campaign) params.set('utm_campaign', utm.campaign);
  const q = params.toString();
  return `${path}${q ? `?${q}` : ''}${hash ? `#${hash}` : ''}`;
}

export interface TrackedLink {
  id: string;
  code: string;
  target_url: string;
  goUrl: string; // absolute /go URL
  relUrl: string; // relative /go URL for same-origin use
}

/**
 * Find or create a tracked link for a target. Deduped by (property, campaign,
 * target) so repeated calls (e.g. rendering the bio page) don't pile up rows.
 * Returns null on any failure (e.g. the table isn't migrated yet) so callers
 * can fall back to the untracked URL.
 */
export async function getOrCreateTrackedLink(
  supabase: SupabaseClient,
  input: { propertyId: string | null; campaignId?: string | null; label: string; targetUrl: string; kind?: string },
): Promise<TrackedLink | null> {
  try {
    let find = supabase.from('tracked_links').select('id, code, target_url').eq('target_url', input.targetUrl);
    find = input.propertyId ? find.eq('property_id', input.propertyId) : find.is('property_id', null);
    find = input.campaignId ? find.eq('campaign_id', input.campaignId) : find.is('campaign_id', null);
    const { data: existing } = await find.maybeSingle();
    if (existing) return toLink(existing);

    for (let attempt = 0; attempt < 4; attempt++) {
      const code = randomCode();
      const { data, error } = await supabase
        .from('tracked_links')
        .insert({
          code,
          property_id: input.propertyId,
          campaign_id: input.campaignId ?? null,
          label: input.label,
          target_url: input.targetUrl,
          kind: input.kind ?? 'custom',
        })
        .select('id, code, target_url')
        .single();
      if (!error && data) return toLink(data);
      // 23505 = unique violation on code; retry with a fresh code
      if (error && error.code !== '23505') return null;
    }
    return null;
  } catch {
    return null;
  }
}

function toLink(row: { id: string; code: string; target_url: string }): TrackedLink {
  return { id: row.id, code: row.code, target_url: row.target_url, goUrl: `${appUrl()}/go/${row.code}`, relUrl: `/go/${row.code}` };
}
