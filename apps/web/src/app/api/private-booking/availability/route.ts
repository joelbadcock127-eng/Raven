import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getBookingLink, resolveLinkedProperty, blockedDates } from '@/lib/privateBooking';
import { lodgifyConfigured } from '@/lib/lodgify';

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
    const { data } = await supabase
      .from('booking_requests')
      .select('arrival, departure, adults, children, status, notes')
      .eq('link_id', link.id)
      .in('status', ['booked', 'pending'])
      .order('arrival', { ascending: true })
      .limit(100);
    history = (data ?? []).map((r) => ({
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
