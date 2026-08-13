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
  host: `${A}/am-hd-Deb-Badcock.jpg`,
  // Stock: Mersey Bluff Lighthouse — photo by Synyan, Wikimedia Commons, CC BY 3.0
  merseyBluff: `${A}/am-stock-mersey-bluff-lighthouse.jpg`,
  // Stock: Spirit of Tasmania I passing Mersey Bluff — photo by Cody Williams, Wikimedia Commons, CC BY-SA 2.0
  spirit: `${A}/am-stock-spirit-of-tasmania.jpg`,
  // Stock: wine toast — Pixabay licence, no attribution required
  wineToast: `${A}/am-stock-wine-toast.jpg`,
} as const;

export interface Room {
  numeral: string;
  rooms: string;
  name: string;
  terms: string;
  body: string;
  details: string[];
  image: string;
  detailImage: string;
}

/** The three room types, described as on anniemay.com.au/accommodation. No pricing on-site by owner's direction. */
export const ROOMS: Room[] = [
  {
    numeral: 'I',
    rooms: 'Rooms 1 & 2',
    name: 'King Superior with Bath',
    terms: 'Sleeps two · breakfast included',
    body:
      'King bed for real rest, a proper desk when work calls, and a large TV for easy evenings. A full length mirror and considered lighting keep things practical without fuss. The ensuite is a little retreat of its own, with a walk in shower and a separate bath for an unhurried soak.',
    details: ['King bed', 'Walk in shower and freestanding bath', 'Proper desk', 'Large TV', 'Full length mirror', 'Private ensuite'],
    image: IMG.kingBath,
    detailImage: IMG.basin,
  },
  {
    numeral: 'II',
    rooms: 'Rooms 3 to 6',
    name: 'King Superior',
    terms: 'Sleeps two · breakfast included',
    body:
      'Filled with light and quietly elegant. Generous space, a proper desk when you need it, a large TV for easy evenings and a full length mirror to keep things practical. The ensuite keeps it modern and simple with a walk in shower for an unhurried start or end to the day.',
    details: ['King bed', 'Walk in shower', 'Proper desk', 'Large TV', 'Full length mirror', 'Private ensuite'],
    image: IMG.kingCaramel,
    detailImage: IMG.bedDetail,
  },
  {
    numeral: 'III',
    rooms: 'Room 7',
    name: 'Loft Room',
    terms: 'Sleeps two · breakfast included',
    body:
      'Intimate and calm on the second level. A king bed for real rest, two armchairs for quiet moments, a desk when work calls and a large TV for easy evenings. A full length mirror keeps things practical. The ensuite bathroom adds comfort with a walk in shower and underfloor heating.',
    details: ['King bed', 'The whole second level', 'Two armchairs', 'Walk in shower with underfloor heating', 'Desk and large TV', 'Private ensuite'],
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
  image: string;
}

/** Explore highlights, as on the live explore page. */
export const HIGHLIGHTS: Highlight[] = [
  {
    name: 'Ghost Rock Vineyard',
    body: 'Coastal cool climate wines and a relaxed cellar door restaurant.',
    image: `${A}/e2a227f0e6-Annie-May-Ghost-Rock-Vineyard.jpg`,
  },
  {
    name: 'The Tasmanian Arboretum',
    body: 'A peaceful sanctuary of trees, lakes and quiet paths, perfect for a slow afternoon and the chance to spot a platypus.',
    image: `${A}/am-hd-Tasmanian-Arboretum.jpg`,
  },
  {
    name: 'Ashgrove Cheese',
    body: 'Award winning artisan dairy, crafted at Elizabeth Town.',
    image: `${A}/8998d1fa26-Annie-May-Ashgrove-Cheese-.jpg`,
  },
  {
    name: 'Bakers Walking Co',
    body: 'Guided day walks exploring private tracks, bushland rich with wildlife and coastal views beside Narawntapu National Park, with a gourmet Tasmanian lunch included.',
    image: `${A}/6413f3ac99-Bakers-Walking-Co.jpg`,
  },
  {
    name: 'From Sky to Sea light show',
    body: 'A captivating Devonport light show that illuminates the city’s stories with colour, sound and movement.',
    image: `${A}/f96b970ae1-Annie-May-From-Sky-to-Sky.jpg`,
  },
  {
    name: 'Southern Wild Distillery',
    body: 'Award winning spirits made in Devonport, blending wild Tasmanian botanicals with precision and passion.',
    image: `${A}/e77e24bcb7-Annie-May-Southern-Wild-Distillery.jpg`,
  },
];

/**
 * The living mosaic: 16 images across 8 tiles. Tile i cycles between
 * GALLERY[i] and GALLERY[i + 8], so pair positions deliberately
 * (0↔8, 1↔9, …) to keep each crossfade varied but tonally matched.
 */
export const GALLERY: Array<{ src: string; alt: string }> = [
  { src: IMG.facade, alt: 'Annie May at dusk, Formby Road' },
  { src: IMG.tealBed, alt: 'King Superior under the chandelier' },
  { src: IMG.kingBath, alt: 'King Superior with Bath' },
  { src: IMG.stairs, alt: 'The spiral stair to the Loft' },
  { src: IMG.lounge, alt: 'The breakfast room' },
  { src: IMG.chandelier, alt: 'Chandelier detail' },
  { src: IMG.kingCaramel, alt: 'King Superior' },
  { src: IMG.curtains, alt: 'Morning light through sheers' },
  { src: IMG.windowSeat, alt: 'The window seat' },
  { src: IMG.greenRoom, alt: 'The green room' },
  { src: IMG.basin, alt: 'Ensuite detail' },
  { src: IMG.doorSign, alt: 'Room 1, at her door' },
  { src: IMG.breakfast, alt: 'Breakfast, served' },
  { src: IMG.loungeDetail, alt: 'A quiet corner of the lounge' },
  { src: IMG.kingDesk, alt: 'A proper desk when work calls' },
  { src: IMG.loftBath, alt: 'The Loft ensuite' },
];

/**
 * Reviews — illustrative guest voices per the owner's direction (a bridal
 * party, a touring retired couple, a corporate regular). Swap the quotes
 * for real guest words as they come in; set `image` to show a photo in
 * the avatar circle instead of initials.
 */
export const REVIEWS: Array<{
  quote: string;
  name: string;
  detail: string;
  initials: string;
  image?: string;
}> = [
  {
    quote:
      'We took over three of her rooms for a bridesmaids weekend and she didn’t miss a beat. Breakfast for the whole table, bubbles in the evening, and not one detail out of place. The bride hasn’t stopped talking about it.',
    name: 'Sophie & the girls',
    detail: 'Bridesmaids weekend',
    initials: 'S',
    image: '/mirror-assets/am-review-sophie.jpg',
  },
  {
    quote:
      'Rolled off the Spirit and ten minutes later we were checked in with coffee in hand. She was the perfect first and last night of our lap of Tasmania — we’ve already booked her again.',
    name: 'Jan & Peter',
    detail: 'Touring Tasmania',
    initials: 'J',
    image: '/mirror-assets/am-review-jan-peter.jpg',
  },
  {
    quote:
      'The quietest sleep I get anywhere in town. A proper desk, a proper shower, and breakfast done before the first meeting. I’ve stopped trying anywhere else.',
    name: 'Michael',
    detail: 'In town for work',
    initials: 'M',
    image: '/mirror-assets/am-review-michael.jpg',
  },
];

/**
 * FAQ — the practical answers guests need before booking.
 * VERIFY WITH DEB before publishing: check-in/out times, parking
 * arrangement and the cancellation terms are drafted, not confirmed.
 */
export const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'When can I check in and out?',
    a: 'Check-in is from 2pm and check-out is by 10am. Arriving on a late ferry or flight? Let her know and we will arrange it.',
  },
  {
    q: 'Is there parking?',
    a: 'Yes. Parking is available at the house, with easy street parking on Formby Road as well.',
  },
  {
    q: 'What is the cancellation policy?',
    a: 'Book direct and plans can change: cancel up to 48 hours before arrival for a full refund. Inside 48 hours the first night is charged.',
  },
  {
    q: 'Can we bring the children?',
    a: 'Annie May is adults only, guests 18 and over. It is what keeps the house genuinely quiet, for you and everyone else staying.',
  },
  {
    q: 'Can we bring a pet?',
    a: 'Pets cannot join you at the house, with apologies to good dogs everywhere.',
  },
  {
    q: 'How do we get there?',
    a: 'Two kilometres from the Spirit of Tasmania terminal and about twenty minutes from Devonport Airport. A lift serves every floor, so arrivals are effortless.',
  },
];

/**
 * On foot from the front door. Walk times are door-to-door estimates from
 * 16 Formby Road — sanity-check before publishing.
 */
export const WALKABLE: Array<{ name: string; time: string; note: string }> = [
  {
    name: 'The Mersey riverfront',
    time: 'At the door',
    note: 'Formby Road runs along the river. Cross the road and you are on the water.',
  },
  {
    name: 'City centre dining & cafes',
    time: '5 minutes',
    note: 'Rooke Street Mall, restaurants and good coffee, a few blocks back from the river.',
  },
  {
    name: 'paranaple arts centre & Devonport Regional Gallery',
    time: '5 minutes',
    note: 'Galleries, theatre and events in the heart of town.',
  },
  {
    name: 'Providore Place market hall',
    time: '10 minutes',
    note: 'Tasmanian producers, food and drink under one roof.',
  },
  {
    name: 'Bass Strait Maritime Centre',
    time: '15 minutes',
    note: 'The city’s seafaring story, an easy stroll north along the river.',
  },
  {
    name: 'Mersey Bluff Lighthouse',
    time: '40 minutes',
    note: 'Follow the foreshore path the whole way, or drive it in five.',
  },
];

export const NAV_PAGES = [
  { slug: 'accommodation', label: 'Accommodation' },
  { slug: 'story', label: 'Her Story' },
  { slug: 'explore', label: 'Explore' },
  { slug: 'contact', label: 'Contact' },
] as const;
