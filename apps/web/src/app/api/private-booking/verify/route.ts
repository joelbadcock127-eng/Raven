import { NextRequest, NextResponse } from 'next/server';
import { resolveLinkedProperty } from '@/lib/privateBooking';
import { createBooking, deleteBooking, getBooking, lodgifyConfigured } from '@/lib/lodgify';

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
