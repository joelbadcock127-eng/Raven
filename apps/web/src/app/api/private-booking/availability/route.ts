import { NextRequest, NextResponse } from 'next/server';
import { getBookingLink, resolveLinkedProperty, blockedDates } from '@/lib/privateBooking';
import { lodgifyConfigured } from '@/lib/lodgify';

export const dynamic = 'force-dynamic';

/** Live availability for a private booking link: blocked nights over ~15 months. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const link = await getBookingLink(token);
  if (!link) return NextResponse.json({ error: 'Unknown link' }, { status: 404 });
  if (!lodgifyConfigured()) return NextResponse.json({ error: 'PMS not connected' }, { status: 503 });

  const prop = await resolveLinkedProperty(link.property_id);
  if (!prop) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const from = new Date();
  const to = new Date();
  to.setMonth(to.getMonth() + 15);
  const fromS = from.toISOString().slice(0, 10);
  const toS = to.toISOString().slice(0, 10);
  try {
    const blocked = await blockedDates(prop.lodgifyId, fromS, toS);
    return NextResponse.json({ from: fromS, to: toS, blocked });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 502 });
  }
}
