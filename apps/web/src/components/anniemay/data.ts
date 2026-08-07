/**
 * Annie May bespoke site — every fact and photo in one place.
 * All copy sticks to what is true of the property (anniemay.com.au):
 * seven ensuite rooms, adults only, lift, breakfast included, heritage home
 * at 16 Formby Road in central Devonport. No prices anywhere by design.
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

export interface RoomType {
  numeral: string;
  rooms: string;
  name: string;
  line: string;
  body: string;
  details: string[];
  image: string;
  detailImage: string;
}

/** The three room types, exactly as sold on anniemay.com.au/accommodation. */
export const ROOM_TYPES: RoomType[] = [
  {
    numeral: 'I',
    rooms: 'Rooms 1 & 2',
    name: 'King Superior with Bath',
    line: 'The long soak.',
    body:
      'A king bed for real rest, a proper desk when work calls, and the bathroom the day deserves: a big walk in shower and a separate freestanding bath for soaking.',
    details: ['King bed', 'Freestanding bath and shower', 'Proper desk', 'Large TV', 'Full length mirror', 'Ensuite', 'Breakfast included'],
    image: IMG.kingBath,
    detailImage: IMG.basin,
  },
  {
    numeral: 'II',
    rooms: 'Rooms 3 to 6',
    name: 'King Superior',
    line: 'Full of light, quietly elegant.',
    body:
      'Generous space, considered lighting and a modern walk in shower. A room that stays out of your way and holds everything you need: desk, mirror, deep sleep.',
    details: ['King bed', 'Walk in shower', 'Proper desk', 'Large TV', 'Full length mirror', 'Ensuite', 'Breakfast included'],
    image: IMG.kingCaramel,
    detailImage: IMG.bedDetail,
  },
  {
    numeral: 'III',
    rooms: 'Room 7',
    name: 'The Loft',
    line: 'Intimate and calm, up top.',
    body:
      'The whole second level to yourself, up the spiral stair. Two armchairs under the skylight, a king bed in the eaves, and underfloor heating in the shower.',
    details: ['King bed', 'The whole second floor', 'Two armchairs', 'Underfloor heated shower', 'Desk and large TV', 'Ensuite', 'Breakfast included'],
    image: IMG.loftBed,
    detailImage: IMG.loftDesk,
  },
];

export const GALLERY: Array<{ src: string; alt: string; wide?: boolean; tall?: boolean }> = [
  { src: IMG.facade, alt: 'Annie May at dusk, Formby Road', wide: true },
  { src: IMG.tealBed, alt: 'King Superior under the chandelier' },
  { src: IMG.stairs, alt: 'The spiral stair to the Loft', tall: true },
  { src: IMG.kingBath, alt: 'King Superior with Bath' },
  { src: IMG.lounge, alt: 'The guest lounge' },
  { src: IMG.chandelier, alt: 'Chandelier detail', tall: true },
  { src: IMG.breakfast, alt: 'The breakfast room' },
  { src: IMG.kingCaramel, alt: 'King Superior' },
  { src: IMG.loftDesk, alt: 'The Loft, under the skylight' },
  { src: IMG.curtains, alt: 'Morning light through sheers' },
  { src: IMG.greenRoom, alt: 'King Superior, fireplace corner' },
  { src: IMG.basin, alt: 'Ensuite detail', wide: true },
  { src: IMG.loungeDetail, alt: 'The lounge, afternoon' },
  { src: IMG.windowSeat, alt: 'The bay window seat' },
  { src: IMG.loftBath, alt: 'Loft ensuite' },
  { src: IMG.lift, alt: 'The lift, reaching every floor' },
];

export const NAV_PAGES = [
  { slug: 'rooms', label: 'Rooms' },
  { slug: 'gallery', label: 'Gallery' },
  { slug: 'contact', label: 'Find her' },
] as const;
