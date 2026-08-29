import { supabaseAdmin } from '@/lib/supabase';
import { lodgifyConfigured, listBookings, getRatePromotions, type LodgifyPromotion } from '@/lib/lodgify';
import PromoCodes, { type PromoProperty } from '@/components/PromoCodes';
import type { PromoCode } from '@/lib/promo';

export const revalidate = 0;

/**
 * Booking codes for the Lodgify-managed properties.
 *
 * Lodgify publishes no promotion API — every promotions/discounts/coupons
 * path 404s on the live account and the quote endpoint ignores promo-code
 * parameters entirely — so codes are created once in the Lodgify web app.
 * Decra records them, generates the shareable checkout link with the code
 * pre-applied, and counts every click through the tracked-link system.
 */
export default async function PromoCodesPage() {
  const supabase = supabaseAdmin();
  let properties: PromoProperty[] = [];
  let codes: PromoCode[] = [];
  const clicksByLink: Record<string, number> = {};
  let migrated = true;

  if (supabase) {
    const { data: props } = await supabase
      .from('properties')
      .select('id, name, booking_source, lodgify_property_id')
      .eq('booking_source', 'lodgify')
      .order('name');
    properties = (props ?? [])
      .filter((p) => p.lodgify_property_id)
      .map((p) => ({
        id: p.id as string,
        name: p.name as string,
        lodgifyPropertyId: String(p.lodgify_property_id),
      }));

    const { data: rows, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) migrated = false;
    codes = (rows as PromoCode[]) ?? [];

    const linkIds = codes.map((c) => c.tracked_link_id).filter(Boolean) as string[];
    if (linkIds.length > 0) {
      const { data: links } = await supabase.from('tracked_links').select('id, clicks').in('id', linkIds);
      for (const l of links ?? []) clicksByLink[l.id as string] = Number(l.clicks ?? 0);
    }
  }

  // Reconciliation: read the promotions Lodgify actually has, so stored
  // codes can be verified rather than trusted. Catches typos, codes
  // deleted or deactivated in Lodgify, and terms that have drifted apart.
  const lodgifyPromos: Record<string, LodgifyPromotion[] | null> = {};
  if (lodgifyConfigured()) {
    for (const p of properties) {
      try {
        lodgifyPromos[p.id] = await getRatePromotions(p.lodgifyPropertyId);
      } catch {
        lodgifyPromos[p.id] = null;
      }
    }
  }

  // Redemptions: Lodgify records a promotion's VALUE on a booking
  // (subtotals.promotions) but never which code produced it, so this counts
  // discounted bookings per property rather than per code.
  const redemptions: Record<string, { count: number; amount: number; currency: string }> = {};
  if (lodgifyConfigured()) {
    try {
      const bookings = await listBookings({ max: 200 });
      for (const b of bookings) {
        if (!b.promotionAmount || b.promotionAmount === 0) continue;
        if (b.status && /cancel|declin/i.test(b.status)) continue;
        const pid = properties.find((p) => Number(p.lodgifyPropertyId) === b.propertyId)?.id;
        if (!pid) continue;
        const agg = redemptions[pid] ?? { count: 0, amount: 0, currency: b.currency ?? 'AUD' };
        agg.count += 1;
        agg.amount += b.promotionAmount;
        redemptions[pid] = agg;
      }
    } catch {
      /* PMS unreachable — the page still shows codes and clicks */
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <h1 className="display-lg" style={{ marginBottom: 8 }}>Booking codes</h1>
        <p className="caption" style={{ maxWidth: 660, color: 'var(--ink-mute)' }}>
          Promo codes for the two Lodgify properties. Lodgify has no API for creating promotions, so
          each code is made once in Lodgify itself — Decra then holds its terms and dates, builds the
          booking link with the code already applied, and counts every click against it.
          Annie May books through Preno and so takes no Lodgify codes.
        </p>
      </header>

      {!migrated && (
        <div className="card" style={{ padding: 18, marginBottom: 18 }}>
          <p className="caption">The promo_codes table is missing — run the 0020 migration.</p>
        </div>
      )}

      <PromoCodes
        properties={properties}
        codes={codes}
        clicksByLink={clicksByLink}
        redemptions={redemptions}
        lodgifyPromos={lodgifyPromos}
        today={today}
      />

      <section className="card" style={{ padding: 22, marginTop: 18 }}>
        <h2 className="heading-md" style={{ marginBottom: 6 }}>Creating a code in Lodgify</h2>
        <ol className="caption" style={{ margin: '0 0 0 18px', display: 'grid', gap: 6, color: 'var(--ink-mute)' }}>
          <li>In Lodgify, open <strong>Settings → Promotions</strong> (or Rates → Promotions) and add the promotion.</li>
          <li>Set its discount, the booking window, the stay window and any minimum nights.</li>
          <li>Give it a code guests can type — short, uppercase, memorable.</li>
          <li>Record that exact code here so Decra can build and track its booking link.</li>
        </ol>
      </section>

      <footer className="caption" style={{ paddingTop: 64 }}>
        Decra · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
      </footer>
    </>
  );
}
