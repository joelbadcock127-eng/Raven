/**
 * Booking/promo codes for the Lodgify-managed properties.
 *
 * Lodgify has no promotion API — verified against the live account, where
 * every /promotions, /discounts, /coupons and /vouchers path (v1 and v2)
 * returns 404, and the quote endpoint silently ignores every promo-code
 * parameter name (a deliberately fake code produced an identical total).
 * So the code itself is always created in the Lodgify web app; Decra owns
 * the surrounding workflow and the shareable, attributed checkout link.
 */

/** Lodgify hosted-checkout account slug (from the sites' own booking widgets). */
export const LODGIFY_CHECKOUT_SLUG = 'deb-badcock';

export interface PromoCode {
  id: string;
  property_id: string;
  code: string;
  label: string;
  terms: string;
  kind: 'percent' | 'fixed' | 'free-night' | 'other';
  value: number | null;
  currency: string;
  min_nights: number | null;
  book_by: string | null;
  stay_from: string | null;
  stay_to: string | null;
  default_adults: number;
  status: 'draft' | 'active' | 'paused' | 'expired';
  tracked_link_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

/**
 * The guest-facing Lodgify checkout URL with the code pre-applied.
 *
 * Only parameters observed working on a real Lodgify checkout link are
 * used (currency, ref, adults, promotion) — nothing invented. utm_* is
 * included so the tracked-link redirect passes it through untouched and
 * the campaign is identifiable in any downstream analytics.
 */
export function checkoutUrl(opts: {
  lodgifyPropertyId: string | number;
  code: string;
  adults?: number;
  currency?: string;
  ref?: string;
}): string {
  const params = new URLSearchParams({
    currency: opts.currency ?? 'AUD',
    ref: opts.ref ?? 'decra',
    adults: String(opts.adults ?? 2),
    promotion: opts.code,
    utm_source: 'decra',
    utm_medium: 'promo-code',
    utm_campaign: `promo-${opts.code.toLowerCase()}`,
  });
  return `https://checkout.lodgify.com/${LODGIFY_CHECKOUT_SLUG}/${opts.lodgifyPropertyId}/reservation?${params}`;
}

/** Human summary of the discount, for list rows and copy blocks. */
export function describeValue(p: Pick<PromoCode, 'kind' | 'value' | 'currency'>): string {
  if (p.kind === 'percent' && p.value != null) return `${p.value}% off`;
  if (p.kind === 'fixed' && p.value != null) return `${p.currency} ${p.value} off`;
  if (p.kind === 'free-night') return p.value ? `${p.value} free night${p.value > 1 ? 's' : ''}` : 'Free night';
  return 'Custom offer';
}

/** Status a code should have today, given its booking deadline. */
export function effectiveStatus(p: Pick<PromoCode, 'status' | 'book_by'>, today: string): PromoCode['status'] {
  if (p.status === 'active' && p.book_by && p.book_by < today) return 'expired';
  return p.status;
}
