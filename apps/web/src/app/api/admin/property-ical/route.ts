import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Set a property's booking calendar feeds (room-level iCal). Token-guarded.
 *   POST /api/admin/property-ical
 *   { token, propertyId, icalUrls: { unitId: url, … }, inventory? }
 * Feed URLs are stored in the database only, never committed to source.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    token?: string;
    propertyId?: string;
    icalUrls?: Record<string, string>;
    inventory?: 'whole-property' | 'room-level';
  };
  if (!process.env.RAVEN_UPLOAD_TOKEN || body.token !== process.env.RAVEN_UPLOAD_TOKEN)
    return NextResponse.json({ ok: false, message: 'Bad token' }, { status: 401 });
  if (!body.propertyId || !body.icalUrls || Object.keys(body.icalUrls).length === 0)
    return NextResponse.json({ ok: false, message: 'propertyId and icalUrls required' }, { status: 400 });

  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false, message: 'Supabase not configured' }, { status: 500 });

  const { error } = await supabase
    .from('properties')
    .update({
      booking_source: 'ical',
      ical_urls: body.icalUrls,
      inventory: body.inventory ?? 'room-level',
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.propertyId);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, message: 'Saved', units: Object.keys(body.icalUrls) });
}
