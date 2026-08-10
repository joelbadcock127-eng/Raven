/**
 * Annie May — single source of truth for the bespoke site.
 * Copy is drawn from the live anniemay.com.au pages (mirrored under
 * public/mirror/annie-may): seven ensuite king rooms, adults only,
 * breakfast included, lift access, 16 Formby Road, Devonport.
 */

export const BOOK_URL =
  'https://bookdirect.prenohq.com/inst/#home?propertyId=401IWI6YhAKH7jOAhe65kobqjUyMTg3MyI=&JDRN=Y';

export const ADDRESS = '16 Formby Road, Devonport, Tasmania 7310';
export const MAPS_URL = 'https://maps.google.com/?q=16+Formby+Road+Devonport+TAS+7310';
export const MAPS_EMBED_URL = 'https://www.google.com/maps?q=16+Formby+Road,+Devonport+TAS+7310&output=embed';
export const INSTAGRAM_URL = 'https://www.instagram.com/anniemaybnb/';
export const FACEBOOK_URL = 'https://www.facebook.com/anniemaybnb/';

const A = '/mirror-assets';

export const IMG = {
  facade: `${A}/1d534881d3-Annie-May-Boutique-Accomodation.jpg`,
  chandelier: `${A}/43923b600a-Annie-May-Chandeler.jpg`,
  kingCaramel: `${A}/3e00fdaec8-Annie-May-Hero-3.jpg.webp`,
  kingDesk: `${A}/4cf803d039-DEB_AIRBNB_-34.jpg`,
  kingBath: `${A}/7d7e7e85ed-DEB_AIRBNB_-4-1.jpg`,
  tealBed: `${A}/80a2abce87-Annie-May-Bedroom.jpg`,
  bedDetail: `${A}/556c863cd5-Annie-May-Bedroom1.jpg`,
  greenRoom: `${A}/b5db9de437-DEB_AIRBNB_-11.jpg`,
  loftDesk: `${A}/2b64a4dd73-Annie-May-Loft-Room2.jpg`,
  loftBed: `${A}/6d8c15a23a-Annie-May-Loft-Room5.jpg`,
  loftBath: `${A}/36c4f0f211-Annie-May-Loft-Room4.jpg`,
  stairs: `${A}/11d768d76c-DEB_AIRBNB_-39-1.jpg`,
  lounge: `${A}/38a160b9d2-Annie-May-Breakfast-Room.jpg`,
  breakfast: `${A}/3d8f2dbf3a-DEB_AIRBNB_-67-1.jpg`,
  loungeDetail: `${A}/599eba6f4f-DEB_AIRBNB_-113-1.jpg`,
  basin: `${A}/6cd041e835-DEB_AIRBNB_-53-1-1536x1153.jpg`,
  curtains: `${A}/7905bf70f9-DEB_AIRBNB_-98.jpg`,
  lift: `${A}/aac28457f8-DEB_AIRBNB_-106.jpg`,
  doorSign: `${A}/ba027d43ac-DEB_AIRBNB_-79-1-1024x769.jpg`,
  windowSeat: `${A}/ba7d162897-DEB_AIRBNB_-19.jpg`,
  host: `${A}/87018b3805-Annie-May-Deb-Badcock.jpg`,
} as const;

export interface Room {
  numeral: string;
  rooms: string;
  name: string;
  price: string;
  terms: string;
  body: string;
  details: string[];
  image: string;
  detailImage: string;
}

/** The three room types, priced and described as on anniemay.com.au/accommodation. */
export const ROOMS: Room[] = [
  {
    numeral: 'I',
    rooms: 'Rooms 1 & 2',
    name: 'King Superior with Bath',
    price: '$385',
    terms: 'per night · 2 adults · breakfast included',
    body:
      'King bed for real rest, a proper desk when work calls, and a large TV for easy evenings. A full-length mirror and considered lighting keep things practical without fuss. The ensuite is a little retreat of its own, with a walk-in shower and a separate bath for an unhurried soak.',
    details: ['King bed', 'Walk-in shower and freestanding bath', 'Proper desk', 'Large TV', 'Full-length mirror', 'Private ensuite'],
    image: IMG.kingBath,
    detailImage: IMG.basin,
  },
  {
    numeral: 'II',
    rooms: 'Rooms 3 – 6',
    name: 'King Superior',
    price: '$350',
    terms: 'per night · 2 adults · breakfast included',
    body:
      'Light-filled and quietly elegant. Generous space, a proper desk when you need it, a large TV for easy evenings and a full-length mirror to keep things practical. The ensuite keeps it modern and simple with a walk-in shower for an unhurried start or end to the day.',
    details: ['King bed', 'Walk-in shower', 'Proper desk', 'Large TV', 'Full-length mirror', 'Private ensuite'],
    image: IMG.kingCaramel,
    detailImage: IMG.bedDetail,
  },
  {
    numeral: 'III',
    rooms: 'Room 7',
    name: 'Loft Room',
    price: '$350',
    terms: 'per night · 2 adults · breakfast included',
    body:
      'Intimate and calm on the second level. A king bed for real rest, two armchairs for quiet moments, a desk when work calls and a large TV for easy evenings. A full-length mirror keeps things practical. The ensuite bathroom adds comfort with a walk-in shower and underfloor heating.',
    details: ['King bed', 'The whole second level', 'Two armchairs', 'Walk-in shower, underfloor heating', 'Desk and large TV', 'Private ensuite'],
    image: IMG.loftBed,
    detailImage: IMG.loftDesk,
  },
];

/** In-room comforts, as listed on the live accommodation page. */
export const COMFORTS: string[] = [
  'Ensuite bathrooms arranged for ease with quality amenities',
  'Layered light for reading, getting ready and winding down',
  'Breathable linen and properly made beds that invite real rest',
  'A seat you will actually use, with a small surface for a glass or a book',
  'Storage that keeps things tidy, so the room stays calm',
];

export interface Highlight {
  name: string;
  body: string;
  image?: string;
}

/** Explore highlights, as on the live explore page. */
export const HIGHLIGHTS: Highlight[] = [
  {
    name: 'Ghost Rock Vineyard',
    body: 'Coastal cool-climate wines and a relaxed cellar-door restaurant.',
    image: `${A}/e2a227f0e6-Annie-May-Ghost-Rock-Vineyard.jpg`,
  },
  {
    name: 'The Tasmanian Arboretum',
    body: 'A peaceful sanctuary of trees, lakes and quiet paths, perfect for a slow afternoon and the chance to spot a platypus.',
    image: `${A}/5e369d42c8-Annie-May-Tasmanian-Arboretum.jpg`,
  },
  {
    name: 'Ashgrove Cheese',
    body: 'Award-winning artisan dairy, crafted at Elizabeth Town.',
    image: `${A}/8998d1fa26-Annie-May-Ashgrove-Cheese-.jpg`,
  },
  {
    name: 'Bakers Walking Co',
    body: 'Guided day walks exploring private tracks, wildlife-rich bushland and coastal views beside Narawntapu National Park, with a gourmet Tasmanian lunch included.',
    image: `${A}/6413f3ac99-Bakers-Walking-Co.jpg`,
  },
  {
    name: 'Forth Falls walking track',
    body: 'A short, scenic walk through lush bushland, rewarded with cascading waterfalls and quiet moments in nature.',
  },
  {
    name: 'From Sky to Sea light show',
    body: 'A captivating Devonport light show that illuminates the city’s stories with colour, sound and movement.',
    image: `${A}/f96b970ae1-Annie-May-From-Sky-to-Sky.jpg`,
  },
  {
    name: 'Sheffield — the Town of Murals',
    body: 'Streets and laneways transformed into an open-air gallery celebrating Tasmania’s history and landscape.',
    image: `${A}/5bdb001499-Annie-May-Sheffield-Mural.jpg`,
  },
  {
    name: 'Southern Wild Distillery',
    body: 'Award-winning spirits made in Devonport, blending wild Tasmanian botanicals with precision and passion.',
    image: `${A}/e77e24bcb7-Annie-May-Southern-Wild-Distillery.jpg`,
  },
];

export const GALLERY: Array<{ src: string; alt: string }> = [
  { src: IMG.facade, alt: 'Annie May at dusk, Formby Road' },
  { src: IMG.tealBed, alt: 'King Superior under the chandelier' },
  { src: IMG.kingBath, alt: 'King Superior with Bath' },
  { src: IMG.stairs, alt: 'The spiral stair to the Loft' },
  { src: IMG.lounge, alt: 'The breakfast room' },
  { src: IMG.chandelier, alt: 'Chandelier detail' },
  { src: IMG.kingCaramel, alt: 'King Superior' },
  { src: IMG.curtains, alt: 'Morning light through sheers' },
];

export const NAV_PAGES = [
  { slug: 'accommodation', label: 'Accommodation' },
  { slug: 'story', label: 'Her Story' },
  { slug: 'explore', label: 'Explore' },
  { slug: 'contact', label: 'Contact' },
] as const;
