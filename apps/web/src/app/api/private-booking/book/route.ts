import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getBookingLink, resolveLinkedProperty, blockedDates } from '@/lib/privateBooking';
import { createBooking, lodgifyConfigured } from '@/lib/lodgify';

export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Submit a private-link booking. Straight-through links create the Lodgify
 * booking immediately (status Booked — dates blocked everywhere, nothing
 * charged); approval links hold the request as 'pending' for Decra.
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

  const arrival = String(body.arrival ?? '');
  const departure = String(body.departure ?? '');
  const adults = Math.min(Math.max(Number(body.adults) || 1, 1), 12);
  const children = Math.min(Math.max(Number(body.children) || 0, 0), 12);
  const infants = Math.min(Math.max(Number(body.infants) || 0, 0), 6);
  const guestName = String(body.name ?? '').trim().slice(0, 120);
  const guestEmail = String(body.email ?? '').trim().slice(0, 200);
  const guestPhone = String(body.phone ?? '').trim().slice(0, 40) || undefined;
  const notes = String(body.notes ?? '').trim().slice(0, 1000) || null;

  if (!DATE.test(arrival) || !DATE.test(departure) || arrival >= departure)
    return NextResponse.json({ error: 'Choose a valid date range' }, { status: 400 });
  const nights = Math.round((Date.parse(departure) - Date.parse(arrival)) / 86_400_000);
  if (nights < 1 || nights > 30) return NextResponse.json({ error: 'Stay must be 1–30 nights' }, { status: 400 });
  if (arrival <= new Date().toISOString().slice(0, 10))
    return NextResponse.json({ error: 'Arrival must be a future date' }, { status: 400 });
  if (!guestName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail))
    return NextResponse.json({ error: 'Name and a valid email are required' }, { status: 400 });

  const prop = await resolveLinkedProperty(link.property_id);
  if (!prop || !prop.roomTypeId)
    return NextResponse.json({ error: 'Property is not bookable right now' }, { status: 503 });

  // Re-check availability at the moment of submission — the calendar the
  // guest saw may be minutes old.
  if (lodgifyConfigured()) {
    try {
      const blocked = new Set(await blockedDates(prop.lodgifyId, arrival, departure));
      const d = new Date(`${arrival}T00:00:00Z`);
      for (let i = 0; i < nights; i++) {
        if (blocked.has(d.toISOString().slice(0, 10)))
          return NextResponse.json({ error: 'Those dates were just taken — please pick again' }, { status: 409 });
        d.setUTCDate(d.getUTCDate() + 1);
      }
    } catch {
      /* availability check unreachable — Lodgify itself will still reject true overlaps */
    }
  }

  const supabase = supabaseAdmin();
  const base = {
    link_id: link.id,
    property_id: link.property_id,
    arrival,
    departure,
    adults,
    children,
    infants,
    guest_name: guestName,
    guest_email: guestEmail,
    guest_phone: guestPhone ?? null,
    notes,
  };

  if (link.require_approval) {
    if (!supabase) return NextResponse.json({ error: 'Store unavailable' }, { status: 503 });
    const { error } = await supabase.from('booking_requests').insert({ ...base, status: 'pending' });
    if (error) return NextResponse.json({ error: 'Could not save the request' }, { status: 500 });
    return NextResponse.json({ ok: true, mode: 'pending' });
  }

  try {
    const lodgifyId = await createBooking({
      propertyId: prop.lodgifyId,
      roomTypeId: prop.roomTypeId,
      arrival,
      departure,
      adults,
      children,
      infants,
      guestName,
      guestEmail,
      guestPhone,
      status: 'Booked',
      sourceText: `Decra private link — invoice directly (${link.label})`,
    });
    if (supabase) await supabase.from('booking_requests').insert({ ...base, status: 'booked', lodgify_booking_id: lodgifyId });
    return NextResponse.json({ ok: true, mode: 'booked', bookingId: lodgifyId });
  } catch (e) {
    if (supabase) await supabase.from('booking_requests').insert({ ...base, status: 'failed', error: String(e).slice(0, 500) });
    return NextResponse.json({ error: 'The booking could not be created — nothing was reserved. Please try again or contact us.' }, { status: 502 });
  }
}
