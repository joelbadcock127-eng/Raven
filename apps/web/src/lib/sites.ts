export interface SiteDef {
  propertyId: string;
  name: string;
  domain: string;
  /** Page slugs available under /mirror/<propertyId>/ */
  pages: string[];
  /**
   * Serve the bespoke app site (/site/<id>) on the domain instead of the
   * WordPress mirror. Off while the domains serve exact clones of the
   * current sites; flip it on to launch Annie May's new site.
   */
  bespoke?: boolean;
}

/** The three property websites mirrored under apps/web/public/mirror. */
export const SITES: SiteDef[] = [
  {
    propertyId: 'ten-fifty-bakers',
    name: 'Ten Fifty Bakers',
    domain: 'tenfiftybakers.com.au',
    pages: ['home', 'our-accommodation', 'our-story', 'explore', 'contact-us', 'book-now', 'privacy-policy', 'terms-of-service'],
  },
  {
    propertyId: 'prescription-pad',
    name: 'The Prescription Pad',
    domain: 'theprescriptionpad.com.au',
    pages: ['home', 'about', 'accommodation', 'explore', 'contact-us', 'bookings', 'privacy-policy',
      'terms-of-service', 'disclaimer', 'competition', 'competition-terms-conditions'],
  },
  {
    propertyId: 'annie-may',
    name: 'Annie May',
    domain: 'anniemay.com.au',
    // WordPress slugs, served from the mirror. With bespoke on, the V2 site
    // uses its own slugs (story, contact) and these 301 to them.
    pages: ['home', 'accommodation', 'annie-mays-story', 'explore', 'contact-us', 'book-now', 'privacy-policy',
      'terms-of-service', 'disclaimer', 'competition', 'competition-terms-conditions'],
    bespoke: false,
  },
];

/**
 * The hostname a request is for. The property sites are served by the
 * Cloudflare worker (sites-worker/), which forwards to Decra and names the
 * site in `x-decra-host`; only a known property domain is accepted there.
 * Anything else is the plain Host header.
 */
export function publicHost(headers: { get(name: string): string | null }): string {
  const forwarded = (headers.get('x-decra-host') ?? '').toLowerCase().trim();
  if (forwarded && SITES.some((s) => s.domain === forwarded)) return forwarded;
  return (headers.get('host') ?? '').toLowerCase().split(':')[0];
}
