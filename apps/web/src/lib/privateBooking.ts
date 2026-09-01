import { supabaseAdmin } from '@/lib/supabase';
import { getAvailability, listProperties } from '@/lib/lodgify';

/**
 * Private no-payment booking links.
 *
 * A trusted guest gets a tokenized URL (/book/<token>) showing live
 * availability; submitting creates the booking directly in Lodgify with
 * status "Booked" and no payment — the stay is invoiced outside Lodgify.
 * Links can require approval instead (Settings), holding requests as
 * 'pending' until approved from Decra.
 */

export interface BookingLink {
  id: string;
  token: string;
  property_id: string;
  label: string;
  require_approval: boolean;
  active: boolean;
}

export async function getBookingLink(token: string): Promise<BookingLink | null> {
  if (!/^[a-z0-9-]{8,64}$/.test(token)) return null;
  const supabase = supabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from('booking_links').select('*').eq('token', token).eq('active', true).maybeSingle();
  return (data as BookingLink) ?? null;
}

export interface LinkedProperty {
  propertyId: string;
  name: string;
  lodgifyId: number;
  roomTypeId: number;
  imageUrl: string | null;
}

/** Resolve the link's property to its Lodgify ids (room type from the live account). */
export async function resolveLinkedProperty(propertyId: string): Promise<LinkedProperty | null> {
  const supabase = supabaseAdmin();
  if (!supabase) return null;
  const { data: prop } = await supabase
    .from('properties')
    .select('id, name, lodgify_property_id')
    .eq('id', propertyId)
    .maybeSingle();
  if (!prop?.lodgify_property_id) return null;
  const lodgifyId = Number(prop.lodgify_property_id);
  let roomTypeId = 0;
  let imageUrl: string | null = null;
  try {
    const live = (await listProperties()).find((p) => p.id === lodgifyId);
    roomTypeId = live?.rooms[0]?.id ?? 0;
    imageUrl = live?.imageUrl ?? null;
  } catch {
    /* PMS briefly unreachable — page still renders, booking will retry */
  }
  return { propertyId, name: String(prop.name), lodgifyId, roomTypeId, imageUrl };
}

/**
 * Expand Lodgify availability periods into the set of blocked check-in
 * dates over [from, to). A date is blocked when any room-type period
 * covering it is unavailable (whole-house properties have one room type).
 */
export async function blockedDates(lodgifyId: number, from: string, to: string): Promise<string[]> {
  const periods = await getAvailability(lodgifyId, from, to);
  const blocked = new Set<string>();
  for (const p of periods) {
    if (p.available) continue;
    const d = new Date(`${p.start}T00:00:00Z`);
    const end = new Date(`${p.end}T00:00:00Z`);
    // Lodgify period ends are inclusive dates; guard against runaway loops.
    for (let i = 0; d <= end && i < 800; i++) {
      blocked.add(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }
  return [...blocked].sort();
}
