import type { Section, SiteTheme } from './siteBuilder';

export interface StarterSitePage {
  slug: string;
  nav_label: string;
  title: string;
  sections: Section[];
  sort: number;
}

const ASSET = '/mirror-assets/';

export const ANNIE_MAY_BOOKING_URL =
  'https://bookdirect.prenohq.com/inst/#home?propertyId=401IWI6YhAKH7jOAhe65kobqjUyMTg3MyI=&JDRN=Y';

export const ANNIE_MAY_THEME: SiteTheme = {
  headingFont: "var(--font-site-serif), 'Cormorant Garamond', Georgia, serif",
  bodyFont: "var(--font-site-sans), 'Jost', system-ui, sans-serif",
  bg: '#f7f3eb',
  ink: '#292821',
  soft: '#e9e2d6',
  accent: '#66715b',
  accentInk: '#ffffff',
  radius: 0,
};

export const ANNIE_MAY_GALLERY_IMAGES = [
  { url: `${ASSET}1d534881d3-Annie-May-Boutique-Accomodation.jpg`, alt: 'Annie May heritage guesthouse at dusk' },
  { url: `${ASSET}e0f7e8d1e2-Annie-May-Hero-3.jpg`, alt: 'King Superior Room with warm ochre details' },
  { url: `${ASSET}80a2abce87-Annie-May-Bedroom.jpg`, alt: 'King Superior Room with original arched window' },
  { url: `${ASSET}38a160b9d2-Annie-May-Breakfast-Room.jpg`, alt: 'The light-filled breakfast room' },
  { url: `${ASSET}43923b600a-Annie-May-Chandeler.jpg`, alt: 'Annie May chandelier detail' },
  { url: `${ASSET}556c863cd5-Annie-May-Bedroom1.jpg`, alt: 'A quiet king bedroom at Annie May' },
  { url: `${ASSET}e74f828dfa-Annie-May-Bathroom1.jpg`, alt: 'Ensuite bathroom with original brickwork and bath' },
  { url: `${ASSET}ece3840c34-Annie-May-Loft-Room1.jpg`, alt: 'Loft Room ensuite and reading chair' },
  { url: `${ASSET}2b64a4dd73-Annie-May-Loft-Room2.jpg`, alt: 'Loft Room sitting and work area' },
  { url: `${ASSET}f45ba3c0c8-Annie-May-Loft-Room3.jpg`, alt: 'Loft Room king bed beneath the roofline' },
  { url: `${ASSET}36c4f0f211-Annie-May-Loft-Room4.jpg`, alt: 'Loft Room details' },
  { url: `${ASSET}6d8c15a23a-Annie-May-Loft-Room5.jpg`, alt: 'Loft Room bathroom' },
  { url: `${ASSET}f85263f1b4-Annie-Mays-Bedroom.jpg`, alt: 'Annie May guest room' },
  { url: `${ASSET}7240b3173e-Annie-May-Deb-Badcock2.jpg`, alt: 'Deb at Annie May' },
];

export const ANNIE_MAY_STARTER_PAGES: StarterSitePage[] = [
  {
    slug: 'home',
    nav_label: 'Home',
    title: 'Annie May | Heritage accommodation in Devonport, Tasmania',
    sort: 0,
    sections: [
      {
        id: 'am-home-hero',
        type: 'hero',
        kicker: 'Heritage guesthouse · Devonport, Tasmania',
        headline: 'She makes time feel unhurried',
        subheadline:
          'Seven elegant ensuite rooms, the ease of a beautiful hotel and the warmth of a private residence.',
        imageUrl: `${ASSET}1d534881d3-Annie-May-Boutique-Accomodation.jpg`,
        ctaText: 'Meet the rooms',
        ctaHref: '?page=rooms',
      },
      {
        id: 'am-home-moment',
        type: 'split',
        kicker: 'Refined stays, quietly done',
        heading: 'She knows how to hold a moment',
        body:
          'For marking moments with the people you love or finding your own quiet after full days. Annie May offers privacy with warmth, refinement without theatre, and a pace that feels entirely your own.',
        imageUrl: `${ASSET}e0f7e8d1e2-Annie-May-Hero-3.jpg`,
        align: 'right',
        ctaText: 'Explore accommodation',
        ctaHref: '?page=rooms',
      },
      {
        id: 'am-home-stats',
        type: 'stats',
        items: [
          { value: '7', label: 'elegant rooms' },
          { value: '7', label: 'private ensuites' },
          { value: 'Adults', label: 'only' },
          { value: 'Central', label: 'Devonport' },
        ],
      },
      {
        id: 'am-home-heritage',
        type: 'split',
        kicker: 'Character intact',
        heading: 'Heritage kept. Comforts considered.',
        body:
          'This heritage home was renovated around how you actually live while away. Seating set for conversation. Bedside switches where your hand falls. Linens that breathe. Ensuite rooms finished with considered hardware and quiet-close details. Everything simply works.',
        imageUrl: `${ASSET}43923b600a-Annie-May-Chandeler.jpg`,
        align: 'left',
      },
      {
        id: 'am-home-features',
        type: 'features',
        heading: 'She looks after the details',
        items: [
          {
            title: 'Breakfast room',
            body: 'A light-filled room for slow starts, good coffee and easy conversation.',
            imageUrl: `${ASSET}38a160b9d2-Annie-May-Breakfast-Room.jpg`,
          },
          {
            title: 'Lift access',
            body: 'A compact lift makes arrivals and departures effortless across the house.',
            imageUrl: `${ASSET}43923b600a-Annie-May-Chandeler.jpg`,
          },
          {
            title: 'Luxury amenities',
            body: 'Premium linens and towels, quality bath products and layered lighting.',
            imageUrl: `${ASSET}e74f828dfa-Annie-May-Bathroom1.jpg`,
          },
        ],
      },
      {
        id: 'am-home-gallery',
        type: 'gallery',
        heading: 'Inside Annie May',
        images: ANNIE_MAY_GALLERY_IMAGES.slice(0, 7),
      },
      {
        id: 'am-home-cta',
        type: 'cta',
        heading: 'Stay a little closer to the moment',
        body: 'Discover the room that feels right, then choose your dates when you are ready.',
        buttonText: 'Explore the rooms',
        buttonHref: '?page=rooms',
      },
    ],
  },
  {
    slug: 'rooms',
    nav_label: 'Rooms',
    title: 'Rooms at Annie May | Seven private ensuite rooms',
    sort: 1,
    sections: [
      {
        id: 'am-rooms-hero',
        type: 'hero',
        kicker: 'Seven rooms · Seven private ensuites',
        headline: 'Rooms made for switching off',
        subheadline:
          'Each room has its own character. Every one is arranged for deep rest, quiet privacy and an easy stay.',
        imageUrl: `${ASSET}80a2abce87-Annie-May-Bedroom.jpg`,
      },
      {
        id: 'am-rooms-intro',
        type: 'text',
        heading: 'How she looks after you',
        body:
          'Evenings settle easily here. Light lands softly, doors close with a polite hush, and the house holds the pace for you. King beds invite real rest, proper desks are there when work calls, and considered lighting keeps everything practical without fuss.',
      },
      {
        id: 'am-rooms-types',
        type: 'features',
        heading: 'Find your room',
        items: [
          {
            title: 'King Superior with Bath · Rooms 1 & 2',
            body:
              'Generous, light-filled rooms with a king bed, proper desk, comfortable seating and a private ensuite with a deep bath.',
            imageUrl: `${ASSET}e0f7e8d1e2-Annie-May-Hero-3.jpg`,
          },
          {
            title: 'King Superior · Rooms 3–6',
            body:
              'Quietly elegant rooms with a king bed, considered seating, a proper desk, large TV and private ensuite.',
            imageUrl: `${ASSET}80a2abce87-Annie-May-Bedroom.jpg`,
          },
          {
            title: 'Loft Room · Room 7',
            body:
              'Intimate and calm on the second level, with a king bed, two armchairs, a desk, large TV and private ensuite.',
            imageUrl: `${ASSET}f45ba3c0c8-Annie-May-Loft-Room3.jpg`,
          },
        ],
      },
      {
        id: 'am-rooms-comforts',
        type: 'features',
        heading: 'In-room comforts',
        items: [
          { title: 'Real rest', body: 'Breathable linen and properly made king beds that invite you to settle in.' },
          { title: 'Private ensuite', body: 'Every room has its own bathroom, arranged for ease with quality amenities.' },
          { title: 'Room to unwind', body: 'Comfortable seating, layered light, practical storage and space for a book or a glass.' },
          { title: 'Work when needed', body: 'A proper desk and reliable comforts for business travel and longer stays.' },
          { title: 'Quiet evenings', body: 'A large television, quiet-close details and an adults-only atmosphere.' },
          { title: 'Easy access', body: 'Lift access supports simple arrivals and departures throughout the house.' },
        ],
      },
      {
        id: 'am-rooms-gallery',
        type: 'gallery',
        heading: 'A room of your own',
        images: ANNIE_MAY_GALLERY_IMAGES.slice(1, 13),
      },
      {
        id: 'am-rooms-faq',
        type: 'faq',
        heading: 'Good to know',
        items: [
          { q: 'Is Annie May adults only?', a: 'Yes. Annie May is an adults-only guesthouse designed for quiet, unhurried stays.' },
          { q: 'Does every room have an ensuite?', a: 'Yes. All seven rooms have their own private ensuite bathroom.' },
          { q: 'Is there lift access?', a: 'Yes. A compact lift makes moving through the house and managing luggage easier.' },
          { q: 'Can I work from my room?', a: 'Yes. Each room includes a proper desk for the moments when work calls.' },
          { q: 'Where is Annie May?', a: 'Annie May is at 16 Formby Road in central Devonport, close to dining, events, the Spirit of Tasmania terminal and Devonport Airport.' },
        ],
      },
      {
        id: 'am-rooms-cta',
        type: 'cta',
        heading: 'Ready when you are',
        body: 'Choose the room that suits your stay and see which dates are waiting.',
        buttonText: 'Check availability',
        buttonHref: ANNIE_MAY_BOOKING_URL,
      },
    ],
  },
  {
    slug: 'gallery',
    nav_label: 'Gallery',
    title: 'Gallery | Annie May Devonport',
    sort: 2,
    sections: [
      {
        id: 'am-gallery-hero',
        type: 'hero',
        kicker: 'The house, the rooms, the details',
        headline: 'A closer look at Annie May',
        subheadline: 'Original character, quiet modern comforts and seven rooms that each feel considered.',
        imageUrl: `${ASSET}43923b600a-Annie-May-Chandeler.jpg`,
      },
      {
        id: 'am-gallery-all',
        type: 'gallery',
        heading: 'Take your time',
        images: ANNIE_MAY_GALLERY_IMAGES,
      },
      {
        id: 'am-gallery-cta',
        type: 'cta',
        heading: 'Seen enough to picture yourself here?',
        body: 'Meet the rooms in more detail before choosing your dates.',
        buttonText: 'Explore the rooms',
        buttonHref: '?page=rooms',
      },
    ],
  },
  {
    slug: 'story',
    nav_label: 'Her Story',
    title: 'Annie May’s story | A restored Devonport heritage house',
    sort: 3,
    sections: [
      {
        id: 'am-story-hero',
        type: 'hero',
        kicker: 'A house with a past and a new chapter',
        headline: 'The house that kept calling',
        imageUrl: `${ASSET}1d534881d3-Annie-May-Boutique-Accomodation.jpg`,
      },
      {
        id: 'am-story-deb',
        type: 'split',
        kicker: 'It began on Formby Road',
        heading: 'Deb saw what the years had hidden',
        body:
          'For years, Deb rode past the old Formby Road house and felt something stir. It was tired and a little forgotten, but there was quiet charm under the dust. In 2021 she stepped inside for the first time and began bringing the house back to life.',
        imageUrl: `${ASSET}7240b3173e-Annie-May-Deb-Badcock2.jpg`,
        align: 'right',
      },
      {
        id: 'am-story-name',
        type: 'split',
        kicker: 'The name she carries',
        heading: 'Annie May',
        body:
          'She is named for Deb’s grandmother, Annie May. The woman who never wore trousers, had her hair set every Tuesday, and kept stockings folded in neat rows. Her sense of occasion, care and quiet elegance lives on in the house that now carries her name.',
        imageUrl: `${ASSET}43923b600a-Annie-May-Chandeler.jpg`,
        align: 'left',
      },
      {
        id: 'am-story-quote',
        type: 'quote',
        text: 'Character intact. Everything made beautifully simple.',
        attribution: 'The spirit of Annie May',
      },
      {
        id: 'am-story-cta',
        type: 'cta',
        heading: 'Come and meet her',
        body: 'Step inside the rooms and find the one that feels like yours.',
        buttonText: 'Explore the rooms',
        buttonHref: '?page=rooms',
      },
    ],
  },
  {
    slug: 'explore',
    nav_label: 'Explore',
    title: 'Explore Devonport and North West Tasmania | Annie May',
    sort: 4,
    sections: [
      {
        id: 'am-explore-hero',
        type: 'hero',
        kicker: 'Devonport and the North West',
        headline: 'Her location is central',
        subheadline: 'City dining, coastal walks and North West adventures are all within easy reach.',
        imageUrl: `${ASSET}1a2f54e4c4-Annie-May-From-Sky-to-Sky-768x1024.jpg`,
      },
      {
        id: 'am-explore-intro',
        type: 'text',
        heading: 'Your gateway to Tasmania',
        body:
          'Annie May sits in the sweet spot for exploring Devonport and beyond. She is minutes from the Spirit of Tasmania terminal and Devonport Airport, an easy walk to the city for dining and events, and a refined base for coastal drives and North West adventures.',
      },
      {
        id: 'am-explore-places',
        type: 'features',
        heading: 'Places worth lingering',
        items: [
          {
            title: 'Ghost Rock Wines',
            body: 'Coastal cool-climate wines and a relaxed cellar-door restaurant.',
            imageUrl: `${ASSET}e2a227f0e6-Annie-May-Ghost-Rock-Vineyard.jpg`,
          },
          {
            title: 'Tasmanian Arboretum',
            body: 'Trees, lakes and quiet paths, with the chance to spot a platypus.',
            imageUrl: `${ASSET}5e369d42c8-Annie-May-Tasmanian-Arboretum.jpg`,
          },
          {
            title: 'Ashgrove Cheese',
            body: 'Award-winning artisan dairy, crafted at Elizabeth Town.',
            imageUrl: `${ASSET}8998d1fa26-Annie-May-Ashgrove-Cheese-.jpg`,
          },
          {
            title: 'Sheffield murals',
            body: 'A creative town transformed into an open-air gallery of Tasmanian stories.',
            imageUrl: `${ASSET}5bdb001499-Annie-May-Sheffield-Mural.jpg`,
          },
          {
            title: 'From Sky to Sea',
            body: 'Devonport stories brought to life through colour, sound and movement.',
            imageUrl: `${ASSET}f96b970ae1-Annie-May-From-Sky-to-Sky.jpg`,
          },
          {
            title: 'Southern Wild Distillery',
            body: 'Award-winning spirits made in Devonport with wild Tasmanian botanicals.',
            imageUrl: `${ASSET}e77e24bcb7-Annie-May-Southern-Wild-Distillery.jpg`,
          },
        ],
      },
      {
        id: 'am-explore-cta',
        type: 'cta',
        heading: 'A calm place to return to',
        body: 'Spend the day exploring, then come back to a room that lets the world fall quiet.',
        buttonText: 'Meet the rooms',
        buttonHref: '?page=rooms',
      },
    ],
  },
  {
    slug: 'contact',
    nav_label: 'Contact',
    title: 'Contact Annie May | 16 Formby Road, Devonport',
    sort: 5,
    sections: [
      {
        id: 'am-contact-hero',
        type: 'hero',
        kicker: '16 Formby Road · Devonport, Tasmania',
        headline: 'Come and stay awhile',
        subheadline: 'Close to the city, the ferry and the airport, with a quieter pace waiting inside.',
        imageUrl: `${ASSET}1d534881d3-Annie-May-Boutique-Accomodation.jpg`,
      },
      {
        id: 'am-contact-details',
        type: 'text',
        heading: 'Find Annie May',
        body:
          '16 Formby Road, Devonport TAS 7310\n\nMinutes from the Spirit of Tasmania terminal and Devonport Airport, and an easy walk to the city for dining and events.',
      },
      {
        id: 'am-contact-faq',
        type: 'faq',
        heading: 'Before you arrive',
        items: [
          { q: 'Who is Annie May designed for?', a: 'Annie May is an adults-only guesthouse for couples, solo travellers and business guests who value privacy, comfort and calm.' },
          { q: 'How many rooms are there?', a: 'There are seven separately bookable rooms, each with its own private ensuite.' },
          { q: 'Is the house central?', a: 'Yes. Annie May is close to central Devonport, the Spirit of Tasmania terminal and Devonport Airport.' },
        ],
      },
      {
        id: 'am-contact-cta',
        type: 'cta',
        heading: 'Ready when you are',
        body: 'Explore the rooms first, then choose the dates that suit your stay.',
        buttonText: 'Explore the rooms',
        buttonHref: '?page=rooms',
      },
    ],
  },
];

export function starterPagesFor(propertyId: string): StarterSitePage[] | null {
  if (propertyId !== 'annie-may') return null;
  return JSON.parse(JSON.stringify(ANNIE_MAY_STARTER_PAGES)) as StarterSitePage[];
}
