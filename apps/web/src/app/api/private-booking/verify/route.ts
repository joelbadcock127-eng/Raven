import { NextRequest, NextResponse } from 'next/server';
import { resolveLinkedProperty } from '@/lib/privateBooking';
import { createBooking, deleteBooking, getBooking, lodgifyConfigured, v1Request } from '@/lib/lodgify';

export const dynamic = 'force-dynamic';

/**
 * One-off shape verification for Lodgify booking creation. Creates a far-
 * future TENTATIVE test booking (status Open — records without blocking
 * dates), reads it back, then deletes it. Run once after deploy with
 * ?confirm=create-test; harmless to leave in place, does nothing without
 * the confirm parameter.
 */
export async function GET(req: NextRequest) {
  if (!lodgifyConfigured()) return NextResponse.json({ error: 'LODGIFY_API_KEY not set' }, { status: 503 });

  // cleanup helpers for a dry run whose delete step failed
  const checkId = Number(req.nextUrl.searchParams.get('check'));
  if (Number.isFinite(checkId) && checkId > 0) {
    try {
      const b = await getBooking(checkId);
      return NextResponse.json({ exists: true, status: b.status, guestName: b.guestName });
    } catch (e) {
      return NextResponse.json({ exists: false, detail: String(e).slice(0, 200) });
    }
  }
  const delId = Number(req.nextUrl.searchParams.get('delete'));
  if (Number.isFinite(delId) && delId > 0) {
    try {
      const b = await getBooking(delId);
      if (!/delete me|dry-run/i.test(`${b.guestName} ${b.source ?? ''}`))
        return NextResponse.json({ refused: 'not a Decra test booking', guestName: b.guestName }, { status: 403 });
      await deleteBooking(delId);
      return NextResponse.json({ deleted: delId });
    } catch (e) {
      return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 502 });
    }
  }

  // ?single=1 — probe whether a 1-night booking can get past the min-stay
  // rule for this trusted-link flow (rate settings untouched).
  if (req.nextUrl.searchParams.get('single') === '1') {
    const out: Record<string, unknown> = {};
    const prop2 = await resolveLinkedProperty('ten-fifty-bakers');
    if (!prop2?.roomTypeId) return NextResponse.json({ error: 'no property' }, { status: 500 });
    const base = new Date();
    base.setFullYear(base.getFullYear() + 1);
    base.setDate(base.getDate() + 10);
    const day = (off: number) => { const d = new Date(base); d.setDate(d.getDate() + off); return d.toISOString().slice(0, 10); };

    // attempt 1: straight 1-night create
    try {
      const id = await createBooking({ propertyId: prop2.lodgifyId, roomTypeId: prop2.roomTypeId, arrival: day(0), departure: day(1), adults: 2, guestName: 'Decra shape test — delete me', guestEmail: 'test@example.com', status: 'Open', sourceText: 'Decra dry-run (auto-deleted)' });
      out.directSingle = { ok: true, id };
      try { await deleteBooking(id); out.directSingleDeleted = true; } catch (e) { out.directSingleDeleteError = String(e).slice(0, 200); }
    } catch (e) {
      out.directSingle = { ok: false, error: String(e).slice(0, 220) };
    }

    // attempt 2: guessed override flags on the create payload
    if (!(out.directSingle as { ok?: boolean }).ok) {
      for (const flag of ['ignore_restrictions', 'ignore_policies', 'override_restrictions']) {
        try {
          const res = await v1Request('/v1/reservation/booking', 'POST', {
            guest: { name: 'Decra shape test — delete me', email: 'test@example.com' },
            property_id: prop2.lodgifyId,
            arrival: day(0),
            departure: day(1),
            status: 'Open',
            source_text: 'Decra dry-run (auto-deleted)',
            [flag]: true,
            rooms: [{ room_type_id: prop2.roomTypeId, guest_breakdown: { adults: 2, children: 0, infants: 0, pets: 0 }, people: 2 }],
          });
          const id = typeof res === 'number' ? res : Number((res as { id?: number })?.id);
          out[`flag_${flag}`] = { ok: true, id };
          if (Number.isFinite(id)) { try { await deleteBooking(id); } catch { /* noted below */ } }
          break;
        } catch (e) {
          out[`flag_${flag}`] = String(e).slice(0, 120);
        }
      }
    }

    // attempt 3: owner unavailability ("booked out") — blocks dates without
    // being a guest booking; min-stay rules shouldn't apply.
    for (const path of [`/v1/reservation/bookedout`, `/v2/reservations/bookedout`]) {
      try {
        const res = await v1Request(path, 'POST', {
          property_id: prop2.lodgifyId,
          room_type_id: prop2.roomTypeId,
          arrival: day(4),
          departure: day(5),
          source_text: 'Decra dry-run (auto-deleted)',
        });
        out[`bookedout_${path}`] = { ok: true, res };
        const id = typeof res === 'number' ? res : Number((res as { id?: number })?.id);
        if (Number.isFinite(id) && id > 0) {
          try { await v1Request(`${path}/${id}`, 'DELETE'); out[`bookedout_${path}_deleted`] = true; } catch (e) { out[`bookedout_${path}_deleteError`] = String(e).slice(0, 160); }
        }
        break;
      } catch (e) {
        out[`bookedout_${path}`] = String(e).slice(0, 140);
      }
    }

    return NextResponse.json(out);
  }

  if (req.nextUrl.searchParams.get('confirm') !== 'create-test')
    return NextResponse.json({ hint: 'add ?confirm=create-test to run the dry-run booking test' });

  const log: Record<string, unknown> = {};
  const prop = await resolveLinkedProperty('ten-fifty-bakers');
  if (!prop?.roomTypeId) return NextResponse.json({ error: 'could not resolve property/room', prop }, { status: 500 });
  log.property = { lodgifyId: prop.lodgifyId, roomTypeId: prop.roomTypeId };

  const arrival = new Date();
  arrival.setFullYear(arrival.getFullYear() + 1);
  arrival.setDate(arrival.getDate() + 3);
  const departure = new Date(arrival);
  departure.setDate(departure.getDate() + 2);
  const a = arrival.toISOString().slice(0, 10);
  const d = departure.toISOString().slice(0, 10);
  log.dates = { arrival: a, departure: d };

  let id: number;
  try {
    id = await createBooking({
      propertyId: prop.lodgifyId,
      roomTypeId: prop.roomTypeId,
      arrival: a,
      departure: d,
      adults: 2,
      guestName: 'Decra shape test — delete me',
      guestEmail: 'test@example.com',
      status: 'Open',
      sourceText: 'Decra dry-run (auto-deleted)',
    });
    log.created = id;
  } catch (e) {
    return NextResponse.json({ ...log, createError: String(e) }, { status: 502 });
  }

  try {
    const back = await getBooking(id);
    log.readBack = { status: back.status, arrival: back.arrival, departure: back.departure };
  } catch (e) {
    log.readBackError = String(e).slice(0, 300);
  }

  try {
    await deleteBooking(id);
    log.deleted = true;
  } catch (e) {
    log.deleteError = String(e).slice(0, 300) + ' — DELETE THE TEST BOOKING IN LODGIFY MANUALLY';
  }

  return NextResponse.json(log);
}
