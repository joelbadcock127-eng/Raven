/**
 * Canonical property metadata, shared by the bio pages, tracked links and
 * anywhere else that needs a booking URL or domain. Single source of truth
 * so booking links never drift between features.
 */
export interface PropertyMeta {
  id: string;
  name: string;
  short: string;
  locality: string;
  domain: string;
  bookUrl: string;
  tagline: string;
}

export const PROPERTY_META: PropertyMeta[] = [
  {
    id: 'ten-fifty-bakers',
    name: 'Ten Fifty Bakers',
    short: 'Ten Fifty',
    locality: 'Bakers Beach, Tasmania',
    domain: 'tenfiftybakers.com.au',
    bookUrl: 'https://tenfiftybakers.com.au/book-now/',
    tagline: 'Off-grid wilderness retreat on the edge of Narawntapu National Park.',
  },
  {
    id: 'prescription-pad',
    name: 'The Prescription Pad',
    short: 'Rx Pad',
    locality: 'Shearwater, Tasmania',
    domain: 'theprescriptionpad.com.au',
    bookUrl: 'https://theprescriptionpad.com.au/bookings/',
    tagline: 'Room for the whole group, minutes from the beach at Port Sorell.',
  },
  {
    id: 'annie-may',
    name: 'Annie May',
    short: 'Annie May',
    locality: 'Devonport, Tasmania',
    domain: 'anniemay.com.au',
    bookUrl: 'https://anniemay.com.au/accommodation/',
    tagline: 'Adults-only heritage guesthouse in the heart of Devonport.',
  },
];

export function propertyMeta(id: string | null | undefined): PropertyMeta | undefined {
  return PROPERTY_META.find((p) => p.id === id);
}
