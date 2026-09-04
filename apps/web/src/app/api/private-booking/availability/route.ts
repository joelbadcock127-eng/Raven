import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getBookingLink, resolveLinkedProperty, blockedDates } from '@/lib/privateBooking';
import { lodgifyConfigured, raw } from '@/lib/lodgify';

export const dynamic = 'force-dynamic';

/**
 * Live availability for a private booking link (blocked nights over ~15
 * months), plus the link's own booking history so the guest can see every
 * stay they've already secured through this page.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const link = await getBookingLink(token);
  if (!link) return NextResponse.json({ error: 'Unknown link' }, { status: 404 });
  if (!lodgifyConfigured()) return NextResponse.json({ error: 'PMS not connected' }, { status: 503 });

  const prop = await resolveLinkedProperty(link.property_id);
  if (!prop) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  // booking history for this link — confirmed and awaiting only
  let history: Array<{ arrival: string; departure: string; adults: number; children: number; status: string; roomConfig: string | null }> = [];
  const supabase = supabaseAdmin();
  if (supabase) {
    const { data: rows } = await supabase
      .from('booking_requests')
      .select('id, arrival, departure, adults, children, status, notes, lodgify_booking_id')
      .eq('link_id', link.id)
      .in('status', ['booked', 'pending'])
      .order('arrival', { ascending: true })
      .limit(100);
    let data = rows ?? [];

    // Reconcile upcoming 'booked' rows against Lodgify so stays cancelled
    // there drop out of the history instead of showing as still booked.
    const today = new Date().toISOString().slice(0, 10);
    const toCheck = data.filter((r) => r.status === 'booked' && r.lodgify_booking_id && r.departure >= today).slice(0, 15);
    for (const r of toCheck) {
      try {
        const b = (await raw(`/v2/reservations/bookings/${r.lodgify_booking_id}`)) as { is_deleted?: boolean; status?: string };
        if (b?.is_deleted || /declin|cancel/i.test(String(b?.status ?? ''))) {
          await supabase.from('booking_requests').update({ status: 'declined', error: 'cancelled in Lodgify' }).eq('id', r.id);
          data = data.filter((x) => x.id !== r.id);
        }
      } catch {
        /* unreachable booking — leave the row as-is */
      }
    }

    history = data.map((r) => ({
      arrival: r.arrival as string,
      departure: r.departure as string,
      adults: Number(r.adults ?? 0),
      children: Number(r.children ?? 0),
      status: r.status as string,
      roomConfig: /DIFFERS|differs/.test(String(r.notes ?? '')) ? String(r.notes).replace(/^Room setup[^:]*:\s*/, '').split('.')[0] : null,
    }));
  }

  const from = new Date();
  const to = new Date();
  to.setMonth(to.getMonth() + 15);
  const fromS = from.toISOString().slice(0, 10);
  const toS = to.toISOString().slice(0, 10);
  try {
    const blocked = await blockedDates(prop.lodgifyId, fromS, toS);
    return NextResponse.json({ from: fromS, to: toS, blocked, history });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 502 });
  }
}
