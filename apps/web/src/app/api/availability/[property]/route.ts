import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { blockedDates } from '@/lib/privateBooking';
import { lodgifyConfigured } from '@/lib/lodgify';
import { SITES } from '@/lib/sites';

export const dynamic = 'force-dynamic';

/**
 * Public live availability for a property website — the same Lodgify
 * source the private booking pages use, minus the token, history and
 * booking writes. Feeds the mirror sites' quick book calendar; needs no
 * auth because blocked nights are already visible to guests through the
 * sites' own Lodgify widgets.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ property: string }> },
) {
  const { property } = await ctx.params;
  if (!SITES.some((s) => s.propertyId === property))
    return NextResponse.json({ error: 'Unknown property' }, { status: 404 });
  if (!lodgifyConfigured())
    return NextResponse.json({ error: 'PMS not connected' }, { status: 503 });

  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const { data: prop } = await supabase
    .from('properties')
    .select('lodgify_property_id')
    .eq('id', property)
    .maybeSingle();
  if (!prop?.lodgify_property_id)
    return NextResponse.json({ error: 'Property not linked' }, { status: 404 });

  const from = new Date();
  const to = new Date();
  to.setMonth(to.getMonth() + 15);
  const fromS = from.toISOString().slice(0, 10);
  const toS = to.toISOString().slice(0, 10);
  try {
    const blocked = await blockedDates(Number(prop.lodgify_property_id), fromS, toS);
    return NextResponse.json(
      { from: fromS, to: toS, blocked },
      { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 502 });
  }
}
