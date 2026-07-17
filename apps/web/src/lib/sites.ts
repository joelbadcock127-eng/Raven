export interface SiteDef {
  propertyId: string;
  name: string;
  domain: string;
  /** Page slugs available under /mirror/<propertyId>/ */
  pages: string[];
}

/** The three property websites mirrored under apps/web/public/mirror. */
export const SITES: SiteDef[] = [
  {
    propertyId: 'ten-fifty-bakers',
    name: 'Ten Fifty Bakers',
    domain: 'tenfiftybakers.com.au',
    pages: ['home', 'our-accommodation', 'our-story', 'explore', 'contact-us', 'book-now'],
  },
  {
    propertyId: 'prescription-pad',
    name: 'The Prescription Pad',
    domain: 'theprescriptionpad.com.au',
    pages: ['home', 'about', 'accommodation', 'explore', 'contact-us', 'bookings'],
  },
  {
    propertyId: 'annie-may',
    name: 'Annie May',
    domain: 'anniemay.com.au',
    pages: ['home', 'accommodation', 'annie-mays-story', 'explore', 'contact-us'],
  },
];
