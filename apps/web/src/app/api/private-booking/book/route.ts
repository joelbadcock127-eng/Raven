import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getBookingLink, resolveLinkedProperty, blockedDates } from '@/lib/privateBooking';
import { createBooking, lodgifyConfigured } from '@/lib/lodgify';

export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_STAYS = 12;

interface StayInput {
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  infants: number;
  roomConfig: string; // empty = default setup
}

/**
 * Submit one or more private-link stays. The link carries the guest
 * identity (tour-operator style), so no contact details are collected.
 * Straight-through links create each Lodgify booking immediately (status
 * Booked — dates blocked everywhere, nothing charged); approval links
 * hold every stay as 'pending' for Decra. Each stay succeeds or fails
 * independently and the caller gets a per-stay result list.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const token = String(body.token ?? '');
  const link = await getBookingLink(token);
  if (!link) return NextResponse.json({ error: 'Unknown link' }, { status: 404 });

  const guestName = link.guest_name ?? 'Private link guest';
  const guestEmail = link.guest_email ?? 'noreply@decra.local';
  const guestPhone = link.guest_phone ?? undefined;
  const defaultConfig = link.default_room_config ?? '3 twins, 1 king, 1 double';

  const rawStays = Array.isArray(body.stays) ? body.stays.slice(0, MAX_STAYS) : [];
  if (rawStays.length === 0) return NextResponse.json({ error: 'No stays submitted' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const stays: StayInput[] = [];
  for (const r of rawStays as Record<string, unknown>[]) {
    const arrival = String(r.arrival ?? '');
    const departure = String(r.departure ?? '');
    if (!DATE.test(arrival) || !DATE.test(departure) || arrival >= departure)
      return NextResponse.json({ error: `Invalid date range ${arrival} → ${departure}` }, { status: 400 });
    const nights = Math.round((Date.parse(departure) - Date.parse(arrival)) / 86_400_000);
    if (nights < 1 || nights > 60) return NextResponse.json({ error: 'Each stay must be 1–60 nights' }, { status: 400 });
    if (arrival <= today) return NextResponse.json({ error: 'Arrivals must be future dates' }, { status: 400 });
    stays.push({
      arrival,
      departure,
      adults: Math.min(Math.max(Number(r.adults) || 1, 1), 12),
      children: Math.min(Math.max(Number(r.children) || 0, 0), 12),
      infants: Math.min(Math.max(Number(r.infants) || 0, 0), 6),
      roomConfig: String(r.roomConfig ?? '').trim().slice(0, 300),
    });
  }
  // stays must not overlap each other
  const sorted = [...stays].sort((a, b) => a.arrival.localeCompare(b.arrival));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].arrival < sorted[i - 1].departure)
      return NextResponse.json({ error: 'Stays overlap each other' }, { status: 400 });
  }

  const prop = await resolveLinkedProperty(link.property_id);
  if (!prop || !prop.roomTypeId)
    return NextResponse.json({ error: 'Property is not bookable right now' }, { status: 503 });

  // Fresh availability across the whole span — the calendar the guest saw
  // may be minutes old.
  let blocked = new Set<string>();
  if (lodgifyConfigured()) {
    try {
      blocked = new Set(await blockedDates(prop.lodgifyId, sorted[0].arrival, sorted[sorted.length - 1].departure));
    } catch {
      /* Lodgify itself still rejects true overlaps */
    }
  }
  const stayFree = (s: StayInput) => {
    const d = new Date(`${s.arrival}T00:00:00Z`);
    const end = new Date(`${s.departure}T00:00:00Z`);
    while (d < end) {
      if (blocked.has(d.toISOString().slice(0, 10))) return false;
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return true;
  };

  const supabase = supabaseAdmin();
  const rowFor = (s: StayInput, status: string, extra?: Record<string, unknown>) => ({
    link_id: link.id,
    property_id: link.property_id,
    arrival: s.arrival,
    departure: s.departure,
    adults: s.adults,
    children: s.children,
    infants: s.infants,
    guest_name: guestName,
    guest_email: guestEmail,
    guest_phone: guestPhone ?? null,
    notes: s.roomConfig ? `Room setup (differs from default): ${s.roomConfig}` : `Room setup: default (${defaultConfig})`,
    status,
    ...extra,
  });

  if (link.require_approval) {
    if (!supabase) return NextResponse.json({ error: 'Store unavailable' }, { status: 503 });
    const { error } = await supabase.from('booking_requests').insert(stays.map((s) => rowFor(s, 'pending')));
    if (error) return NextResponse.json({ error: 'Could not save the request' }, { status: 500 });
    return NextResponse.json({ mode: 'pending', results: stays.map((s) => ({ arrival: s.arrival, departure: s.departure, ok: true })) });
  }

  const results: Array<{ arrival: string; departure: string; ok: boolean; state?: string; bookingId?: number; error?: string }> = [];
  for (const s of sorted) {
    if (!stayFree(s)) {
      results.push({ arrival: s.arrival, departure: s.departure, ok: false, error: 'Dates just taken — pick again' });
      if (supabase) await supabase.from('booking_requests').insert(rowFor(s, 'failed', { error: 'availability conflict at submit' }));
      continue;
    }
    // Lodgify's API refuses stays under the property minimum (2 nights), so
    // single nights queue for the owner to add manually in Lodgify.
    const nights = Math.round((Date.parse(s.departure) - Date.parse(s.arrival)) / 86_400_000);
    if (nights === 1) {
      if (supabase) await supabase.from('booking_requests').insert(rowFor(s, 'pending'));
      results.push({ arrival: s.arrival, departure: s.departure, ok: true, state: 'requested' });
      continue;
    }
    const notes = s.roomConfig
      ? `Room setup (DIFFERS from default ${defaultConfig}): ${s.roomConfig}. Booked via Decra private link — no payment, invoice directly.`
      : `Room setup: default (${defaultConfig}). Booked via Decra private link — no payment, invoice directly.`;
    // Lodgify's API silently drops `notes` on create AND update (verified),
    // but source_text persists and shows on the booking — so the room setup
    // rides there, and Decra Settings keeps the full record.
    const sourceText = s.roomConfig
      ? `Decra link · invoice directly · Rooms DIFFER: ${s.roomConfig.slice(0, 120)}`
      : `Decra link · invoice directly · Rooms: default (${defaultConfig})`;
    try {
      const bookingId = await createBooking({
        propertyId: prop.lodgifyId,
        roomTypeId: prop.roomTypeId,
        arrival: s.arrival,
        departure: s.departure,
        adults: s.adults,
        children: s.children,
        infants: s.infants,
        guestName,
        guestEmail,
        guestPhone,
        status: 'Booked',
        sourceText,
        notes,
      });
      results.push({ arrival: s.arrival, departure: s.departure, ok: true, state: 'booked', bookingId });
      if (supabase) await supabase.from('booking_requests').insert(rowFor(s, 'booked', { lodgify_booking_id: bookingId }));
    } catch (e) {
      const m = String(e).match(/"message":\s*"([^"]{3,140})"/);
      results.push({ arrival: s.arrival, departure: s.departure, ok: false, error: m ? m[1] : 'Booking failed — nothing reserved for these dates' });
      if (supabase) await supabase.from('booking_requests').insert(rowFor(s, 'failed', { error: String(e).slice(0, 500) }));
    }
  }

  return NextResponse.json({ mode: 'booked', results });
}
