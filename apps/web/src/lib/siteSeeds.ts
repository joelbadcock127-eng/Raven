import type { Section, SiteTheme } from './siteBuilder';
import { DEFAULT_THEMES } from './siteBuilder';

/**
 * Designed site blueprints — one art-directed, image-led scrolling site per
 * property, built from the real photography in /public/mirror-assets and
 * verified against the actual images (the aerial, the cedar hot tub, the
 * loft, the lift are all real). "Build designed site" in the Sites tab turns
 * a blueprint into a normal draft version, fully editable afterwards.
 *
 * Copy follows the house style: owner's voice, Australian English, no dash
 * punctuation, no hype. Room names for Annie May rooms four to seven are
 * elegant placeholders — rename in the builder.
 */

type SeedSection = { [K in Section['type']]: Omit<Extract<Section, { type: K }>, 'id'> }[Section['type']];

export interface SiteSeed {
  label: string;
  theme: SiteTheme;
  pages: { slug: string; nav_label: string; title: string; sections: SeedSection[] }[];
}

const A = (file: string) => `/mirror-assets/${file}`;

/* ── Ten Fifty Bakers — the escape. Dark-sky cinematic, image-drenched ── */

const TFB_BOOK = 'https://tenfiftybakers.com.au/book-now/';

const tenFiftyBakers: SiteSeed = {
  label: 'Raven designed',
  theme: DEFAULT_THEMES['ten-fifty-bakers'],
  pages: [
    {
      slug: 'home',
      nav_label: 'Home',
      title: 'Ten Fifty Bakers · Off-grid escape at Bakers Beach, Tasmania',
      sections: [
        {
          type: 'hero',
          kicker: 'Bakers Beach · Narawntapu · Tasmania',
          headline: 'The middle of nowhere, made comfortable.',
          subheadline: 'A hand-built timber lodge on 1,137 private acres beside Narawntapu National Park. Half an hour from Devonport, a world away from everything.',
          imageUrl: A('tfb-73.jpg'),
          videoUrl: A('bwc-landing.mp4'),
          ctaText: 'Check availability',
          ctaHref: TFB_BOOK,
        },
        { type: 'marquee', text: 'Disappear for a few days.\nCome back different.' },
        {
          type: 'split',
          kicker: 'The house',
          heading: 'The last house before the park',
          body:
            'Ten Fifty sits where the farmland gives out and Narawntapu begins. No town, no traffic, no neighbours to speak of. Paddocks, dunes and a horizon that earns its sunsets.\n\nThe whole place runs on the sun, and you would never pick it. Proper beds, a serious kitchen, hot water for days and a wall of glass pointed at the weather.',
          imageUrl: A('c84005cce7-1050-Bakers-52-1.jpg'),
          align: 'left',
          imageAspect: 'portrait',
          ctaText: 'See the house',
          ctaHref: '?page=stay',
        },
        {
          type: 'stack',
          images: [
            { url: A('tfb-74.jpg'), alt: 'The whole escape, from above' },
            { url: A('tfb-35.jpg'), alt: 'Storm light, most evenings' },
            { url: A('tfb-46.jpg'), alt: 'The sauna and the baths' },
            { url: A('tfb-51.jpg'), alt: 'Sunrise, from the bath' },
            { url: A('tfb-8.jpg'), alt: 'The fire at the end of the path' },
            { url: A('tfb-33.jpg'), alt: 'Wine tastes better out here' },
            { url: A('tfb-94.jpg'), alt: 'Inside, the fire keeps going' },
          ],
        },
        {
          type: 'stats',
          items: [
            { value: '1,137', label: 'private acres' },
            { value: '22 km', label: 'of private tracks' },
            { value: '4', label: 'outdoor baths' },
            { value: '10', label: 'guests, at most' },
          ],
        },
        {
          type: 'mosaic',
          kicker: 'Slow rituals',
          heading: 'The sauna, the bath, the dark',
          body: 'The evening has a running order out here. The barrel sauna first, then the bath under open sky, then the firepit until the stars take over. Bring a grazing board and phones tend to stay inside.',
          word: 'escape',
          images: [
            { url: A('4261d142e9-1050-Bakers-62-1.jpg'), alt: 'The outdoor bath' },
            { url: A('e9b6acbe67-1050-Bakers-59-2.jpg'), alt: 'The bedroom' },
            { url: A('tfb-31.jpg'), alt: 'Provisions, sorted' },
          ],
        },
        {
          type: 'quote',
          text: 'If I had to say what the best thing was, it would be the sauna and baths. It was exactly what I needed to unwind.',
          attribution: 'David Bartlett · Former Premier of Tasmania',
        },
        {
          type: 'split',
          kicker: 'Bakers Walking Co',
          heading: 'Walk it with the people who know it',
          body: 'The estate is home to Bakers Walking Co, whose local guides run day walks and three day retreats across the 22 kilometres of private track, starting at the door. After dark, head out with night vision gear and count wombats, quolls and, if you are lucky, a Tasmanian devil.',
          imageUrl: A('bwc-out2.jpg'),
          align: 'left',
          imageAspect: 'landscape',
          ctaText: 'Explore the walks',
          ctaHref: 'https://bakerswalkingco.com.au',
        },
        {
          type: 'fullbleed',
          imageUrl: A('tfb-84.jpg'),
          kicker: 'Out the gate',
          headline: 'The coast is a walk, not a drive',
          body: 'Bush tracks lead from the lodge through 1,137 acres of private bush towards the dunes, the wetlands and the lookouts over Bakers Beach. You will pass more wallabies than people.',
        },
        {
          type: 'split',
          kicker: 'No schedule',
          heading: 'Built for slow mornings',
          body: 'Breakfast at the long table outside while the fog lifts off the paddocks. A walk into the park before lunch. Books, naps and nowhere anyone needs to be. The house does its best work over three or four nights.',
          imageUrl: A('tfb-60.jpg'),
          align: 'right',
          imageAspect: 'landscape',
          ctaText: 'Check availability',
          ctaHref: TFB_BOOK,
        },
        {
          type: 'gallery',
          heading: 'From the escape',
          layout: 'masonry',
          images: [
            { url: A('tfb-64.jpg'), alt: 'The baths in action' },
            { url: A('bwc-out11.jpg'), alt: 'The clearing, from the ridge' },
            { url: A('bwc-snb8.jpg'), alt: 'The sauna and the four baths' },
            { url: A('tfb-1.jpg'), alt: 'The firepit circle' },
            { url: A('tfb-39.jpg'), alt: 'Morning soak' },
            { url: A('tfb-106.jpg'), alt: 'The dining room' },
            { url: A('tfb-95.jpg'), alt: 'A bedroom' },
            { url: A('tfb-12.jpg'), alt: 'Watching the horizon' },
            { url: A('tfb-105.jpg'), alt: 'The kitchen' },
            { url: A('tfb-90.jpg'), alt: 'The lounge' },
            { url: A('tfb-87.jpg'), alt: 'The front gate' },
            { url: A('66ad25fa79-1050-Bakers-10-1-1.jpg'), alt: 'Ten Fifty Bakers' },
          ],
        },
        {
          type: 'cta',
          heading: 'Half an hour from town. A world from everything.',
          body: 'Book direct with the owners for the best rate, always.',
          buttonText: 'Book your stay',
          buttonHref: TFB_BOOK,
          imageUrl: A('tfb-16.jpg'),
        },
      ],
    },
    {
      slug: 'stay',
      nav_label: 'The house',
      title: 'The house · Ten Fifty Bakers',
      sections: [
        {
          type: 'hero',
          kicker: 'The house',
          headline: 'Hand-built, off-grid, serious comfort',
          subheadline: 'Tasmanian hardwood throughout. Sleeps ten. Runs on the sun.',
          imageUrl: A('tfb-101.jpg'),
          videoUrl: A('bwc-luxury.mp4'),
        },
        {
          type: 'text',
          heading: 'How it works out here',
          body:
            'The lodge is fully off-grid. Solar and batteries handle the lot, from the kitchen to the hot water for the four outdoor baths, with backup for the grey days. There is free WiFi throughout, and ignoring it is encouraged.\n\nBring food, bring wine, bring whoever matters. Linen, towels and the rest are ready when you arrive.',
        },
        {
          type: 'rooms',
          heading: 'Five bedrooms, ten beds',
          items: [
            { name: 'Bedroom one · split king', body: 'One king or two singles, set up before you arrive. Hardwood floors, wardrobe storage and bush out the window.', images: [{ url: A('bwc-bed2.jpg'), alt: 'Bedroom one' }] },
            { name: 'Bedroom two · split king', body: 'Same deal as the first: king or twins, proper linen, the quiet does the rest.', images: [{ url: A('bwc-bed7.jpg'), alt: 'Bedroom two' }] },
            { name: 'Bedroom three · split king', body: 'King or two singles, steps from the bathroom. The morning light lands well in here.', images: [{ url: A('bwc-bed5.jpg'), alt: 'Bedroom three' }] },
            { name: 'Bedroom four · split king', body: 'The flexible fourth. Twins for mates on a walking weekend, a king for everyone else.', images: [{ url: A('bwc-bed3.jpg'), alt: 'Bedroom four' }] },
            { name: 'Bedroom five · double', body: 'The snug one at the end. A double bed and not a single sound after dark.', images: [{ url: A('bwc-bed1.jpg'), alt: 'Bedroom five' }] },
          ],
        },
        {
          type: 'stack',
          images: [
            { url: A('tfb-105.jpg'), alt: 'A kitchen you can cook in properly' },
            { url: A('tfb-95.jpg'), alt: 'Beds worth the sleep-in' },
            { url: A('tfb-97.jpg'), alt: 'Twins, or a king, your call' },
            { url: A('tfb-90.jpg'), alt: 'Corners for reading' },
            { url: A('tfb-106.jpg'), alt: 'The long table' },
          ],
        },
        {
          type: 'features',
          heading: 'What you get',
          items: [
            { title: 'Four outdoor baths', body: 'Freestanding tubs under open sky, hot water from the sun. The most argued-over spot on the property.' },
            { title: 'The panoramic sauna', body: 'A barrel sauna pointed at the bush. Warm up properly, then walk out into a Tasmanian evening.' },
            { title: 'The firepit circle', body: 'Wood is there, matches are there, the dark does the rest.' },
            { title: 'Off-grid solar', body: 'Sun in, comfort out. You will not think about power once.' },
            { title: 'A real kitchen', body: 'Dishwasher, coffee machine and bench space to cook like you mean it.' },
            { title: 'The practical bits', body: 'Free WiFi, washing machine and dryer, streaming on the big screen, BBQ on the deck.' },
            { title: 'Single level, accessible', body: 'Ground floor throughout and wheelchair accessible, with private parking at the door.' },
            { title: 'Walks from the door', body: '22 kilometres of private track. Beach one way, national park the other.' },
          ],
        },
        {
          type: 'faq',
          heading: 'Good to know',
          items: [
            { q: 'Is off-grid rough?', a: 'Not here. Solar and batteries run the whole lodge, including hot water and heating. It is the same comfort as town, just quieter.' },
            { q: 'Is there WiFi?', a: 'Yes, free and throughout the lodge. Ignoring it is optional but recommended.' },
            { q: 'How far is it really?', a: 'About half an hour from Devonport and the Spirit of Tasmania, and around twenty minutes from Port Sorell. The last stretch is a quiet country road with the park on your left.' },
            { q: 'What should we bring?', a: 'Food, drinks and walking shoes. Linen, towels and the essentials are all sorted.' },
          ],
        },
        {
          type: 'cta',
          heading: 'Ready for the quiet?',
          body: 'Book direct for the best rate.',
          buttonText: 'Check availability',
          buttonHref: TFB_BOOK,
        },
      ],
    },
    {
      slug: 'explore',
      nav_label: 'Explore',
      title: 'Explore · Ten Fifty Bakers',
      sections: [
        {
          type: 'hero',
          kicker: 'Around Bakers Beach',
          headline: 'Empty beaches, full days',
          subheadline: 'Wild coast one way, cellar doors the other.',
          imageUrl: A('8ba8340122-Hawley-Beach-Tas.jpg'),
        },
        {
          type: 'features',
          heading: 'Worth the drive, or the walk',
          items: [
            { title: 'Narawntapu National Park', body: 'Next door. Wombats, wallabies and Archers Knob for the view back down the coast.', imageUrl: A('391a17fc28-Archers-Knob-1907-1.jpg') },
            { title: 'Horse rides on the beach', body: 'Cradle Country Adventures runs rides along Bakers Beach itself.', imageUrl: A('8b37cd9d13-Cradle-Country-Adventures-Bakers-Beach-Ride-1.jpg') },
            { title: 'Guided walks on the estate', body: 'Bakers Walking Co runs day walks and three day retreats across the 22 km of private tracks, from the door.', imageUrl: A('bwc-out10.jpg') },
            { title: 'Night vision wildlife', body: 'Out after dark with night vision gear. Wombats and quolls for certain, a Tasmanian devil if you are lucky.', imageUrl: A('bwc-out5.jpg') },
            { title: 'The lookout tracks', body: 'Boardwalks and bush tracks climb to lookouts over the wetlands and the coast, straight from the property.', imageUrl: A('tfb-80.jpg') },
            { title: 'Ghost Rock Wines', body: 'Cellar door and long lunches, twenty five minutes back along the coast.', imageUrl: A('530b402dbd-Ten-Fifty-Bakers-Ghost-Rock-Wines.jpg') },
            { title: 'Seahorse World', body: 'Working seahorse farm at Beauty Point. Better than it has any right to be.', imageUrl: A('3ce0ccf41e-Ten-Fifty-Bakers-Seahorse-World-Beauty-Point.jpg') },
            { title: 'Sheffield murals', body: 'The town that turned itself into an art gallery, under Mount Roland.', imageUrl: A('83bea6acf7-Ten-Fifty-Bakers-Sheffield-Mural.jpg') },
            { title: 'Don River Railway', body: 'Steam trains and serious enthusiasm, on the way into Devonport.', imageUrl: A('b59f744fc4-Ten-Fifty-Bakers-Don-River-Railway.jpg') },
            { title: 'Wild Mersey trails', body: 'Mountain bike trails from Railton to Sheffield for every level of bravery.', imageUrl: A('3b294aa949-Ten-Fifty-Bakers-Wild-Mersey-Mountain-Bike-Trails.jpg') },
            { title: 'Raspberry farm detour', body: 'Christmas Hills Raspberry Farm, for the pancakes mostly.', imageUrl: A('f0d2c76930-Ten-Fifty-Bakers-Christmas-Hills-Raspberry-Farm.jpg') },
          ],
        },
        {
          type: 'split',
          kicker: 'Tamar Valley',
          heading: 'Cellar doors within reach',
          body: 'Point the car east and the Tamar Valley wine route opens up. Sinapius and a string of small cellar doors that still pour their own, with Ghost Rock a far shorter hop back along the coast.',
          imageUrl: A('146c453105-Ten-Fifty-Bakers-Sinapius-Vineyard-768x1881.jpg'),
          align: 'right',
          imageAspect: 'portrait',
        },
        {
          type: 'cta',
          heading: 'Base yourself at the beach',
          body: 'Everything above is a day trip. The quiet is right here.',
          buttonText: 'Check availability',
          buttonHref: TFB_BOOK,
        },
      ],
    },
  ],
};

/* ── The Prescription Pad — big group energy, cedar hot tub, coastal modern ── */

const RX_BOOK = 'https://theprescriptionpad.com.au/bookings/';

const prescriptionPad: SiteSeed = {
  label: 'Raven designed',
  theme: DEFAULT_THEMES['prescription-pad'],
  pages: [
    {
      slug: 'home',
      nav_label: 'Home',
      title: 'The Prescription Pad · Group getaway at Shearwater, Tasmania',
      sections: [
        {
          type: 'hero',
          kicker: 'Shearwater · Port Sorell · Tasmania',
          headline: 'Bring the whole crew.',
          subheadline: 'Five king bedrooms, a cedar hot tub and the beach up the road. Built for birthdays, reunions and any excuse you can find.',
          imageUrl: A('3681c9c736-The-Prescription-Pad-Hero2.jpg'),
          ctaText: 'Check availability',
          ctaHref: RX_BOOK,
        },
        { type: 'marquee', text: 'Five king bedrooms.\nOne cedar hot tub.\nOne very long table.' },
        {
          type: 'stats',
          items: [
            { value: '5', label: 'king bedrooms' },
            { value: '10', label: 'beds, made your way' },
            { value: '1', label: 'cedar hot tub' },
            { value: '5 min', label: 'to Hawley Beach' },
          ],
        },
        {
          type: 'split',
          kicker: 'The house',
          heading: 'Room for everyone, and then some',
          body:
            'Every bedroom has a king that splits into two singles when the group calls for it. Couples, mates, kids and grandparents all sorted, and nobody draws the short straw.\n\nDownstairs is built for the pack. A kitchen that can feed the lot of you, a pool table for the tournament, more than one lounge, and a media room with recliners for the night the weather wins.',
          imageUrl: A('3149771669-The-Prescription-Pad-50.jpg'),
          align: 'left',
          imageAspect: 'landscape',
          ctaText: 'See the bedrooms',
          ctaHref: '?page=stay',
        },
        {
          type: 'split',
          kicker: 'The house icon',
          heading: 'The cedar hot tub',
          body: 'It is on the logo for a reason. Steam rising, drinks balanced on the rim, someone refusing to get out. It runs all year and it is best in winter, straight after the beach.',
          imageUrl: A('d1fdb0070d-The-Prescription-Pad-18.jpg'),
          align: 'right',
          imageAspect: 'portrait',
        },
        {
          type: 'stack',
          images: [
            { url: A('515ccda253-The-Prescrioption-Pad-Hero_7162.jpg'), alt: 'The Prescription Pad' },
            { url: A('34a0ce92f0-The-Prescription-Pad-35.jpg'), alt: 'A kitchen that feeds twelve' },
            { url: A('58e7706ae5-The-Prescription-Pad-29.jpg'), alt: 'The long table at work' },
            { url: A('4f8d430ffe-The-Prescription-Pad-41.jpg'), alt: 'Space to scatter' },
            { url: A('8ba8340122-Hawley-Beach-Tas.jpg'), alt: 'Hawley Beach, five minutes up the road' },
          ],
        },
        {
          type: 'mosaic',
          kicker: 'The good bits',
          heading: 'Where the evenings end up',
          body: 'Dinner runs long, the hot tub gets crowded and the deck takes the overflow. That is the whole idea.',
          word: 'together',
          images: [
            { url: A('8ec20ea5dd-The-Prescription-Pad3.jpg'), alt: 'The cedar hot tub' },
            { url: A('be12afdca6-The-Prescription-Pad-16.jpg'), alt: 'The kitchen' },
            { url: A('8942641108-The-Prescription-Pad-47.jpg'), alt: 'The house' },
          ],
        },
        {
          type: 'quote',
          text: 'The house handled all ten of us without blinking. The kids found the pool table before we found the kettle.',
          attribution: 'Guest review',
        },
        {
          type: 'text',
          heading: 'Where you are',
          body:
            'Shearwater, on Tasmania’s north west coast. The beach and the shops are minutes away, the Spirit of Tasmania is twenty five minutes, and Cradle Mountain is a day trip that starts after breakfast, not before dawn.',
        },
        {
          type: 'stats',
          items: [
            { value: '5 min', label: 'Hawley Beach' },
            { value: '7 min', label: 'Port Sorell' },
            { value: '25 min', label: 'Spirit of Tasmania' },
            { value: '90 min', label: 'Cradle Mountain' },
          ],
        },
        {
          type: 'gallery',
          heading: 'Around the house',
          layout: 'masonry',
          images: [
            { url: A('7d0d599bab-The-Prescription-Pad4.jpg'), alt: 'The Prescription Pad' },
            { url: A('ca00174563-The-Prescription-Pad-Hero-3.jpg'), alt: 'The house' },
            { url: A('68c26961d7-The-Prescription-Pad2.jpg'), alt: 'The butler’s pantry' },
            { url: A('e0b0a007f0-The-Prescription-Pad1.jpg'), alt: 'Living' },
            { url: A('3dd054890e-The-Prescription-Pad-47-1536x1024.jpg'), alt: 'Space for everyone' },
            { url: A('5361fb91cc-The-Prescription-Pad-35-1536x1024.jpg'), alt: 'The kitchen' },
            { url: A('6b718963fc-The-Prescription-Pad3-768x1152.jpg'), alt: 'The hot tub' },
            { url: A('ee70c4ef90-The-Prescription-Pad-29-1536x1024.jpg'), alt: 'Dining' },
          ],
        },
        {
          type: 'cta',
          heading: 'One booking, everyone sorted',
          body: 'Book direct and skip the platform fees.',
          buttonText: 'Check availability',
          buttonHref: RX_BOOK,
          imageUrl: A('ca00174563-The-Prescription-Pad-Hero-3.jpg'),
        },
      ],
    },
    {
      slug: 'stay',
      nav_label: 'The house',
      title: 'The house · The Prescription Pad',
      sections: [
        {
          type: 'hero',
          kicker: 'The house',
          headline: 'Built for groups, not squeezed for them',
          subheadline: 'Five bedrooms that actually fit everyone, and living space that fits everyone at once.',
          imageUrl: A('8942641108-The-Prescription-Pad-47.jpg'),
        },
        {
          type: 'text',
          heading: 'Beds, made your way',
          body:
            'Tell us the mix when you book. Each of the five bedrooms has a king that can be set up as one big bed or two singles, so the same house works for a couples weekend, a family reunion or the whole team.\n\nLinen and towels are included, and the beds are made before you walk in.',
        },
        {
          type: 'rooms',
          heading: 'The five bedrooms',
          items: [
            { name: 'Bedroom one', body: 'A king by default, two singles on request. Blackout curtains, proper linen and not a bunk in sight.', images: [] },
            { name: 'Bedroom two', body: 'Same king, same linen, same blackout dark. The kids will still fight over it on principle.', images: [] },
            { name: 'Bedroom three', body: 'King or twins, made up before you arrive. The grandparents tend to land here.', images: [] },
            { name: 'Bedroom four', body: 'Flexible like the rest of the house. Swap the configuration any stay, no drama.', images: [] },
            { name: 'Bedroom five', body: 'The one that settles the argument. Ten proper beds across five rooms and nobody on a couch.', images: [] },
          ],
        },
        {
          type: 'stack',
          images: [
            { url: A('34a0ce92f0-The-Prescription-Pad-35.jpg'), alt: 'The kitchen' },
            { url: A('58e7706ae5-The-Prescription-Pad-29.jpg'), alt: 'The dining table' },
            { url: A('3149771669-The-Prescription-Pad-50.jpg'), alt: 'The media room' },
            { url: A('4f8d430ffe-The-Prescription-Pad-41.jpg'), alt: 'Living space' },
          ],
        },
        {
          type: 'features',
          heading: 'What you get',
          items: [
            { title: 'The cedar hot tub', body: 'Year round, best in winter. Towels by the back door.' },
            { title: 'A kitchen for a crowd', body: 'Cook for twelve without elbowing anyone, with a butler’s pantry hiding the mess.' },
            { title: 'The pool table', body: 'The tournament starts about an hour after arrival. House rules apply.' },
            { title: 'The media room', body: 'Recliners, a big screen and a door that closes. Rainy day, solved.' },
            { title: 'Space to scatter', body: 'More than one lounge, more than one screen, so the group can split without splitting up.' },
          ],
        },
        {
          type: 'faq',
          heading: 'Good to know',
          items: [
            { q: 'How many can stay?', a: 'Ten in beds across the five bedrooms. If your group is bigger, get in touch before you book and we will see what works.' },
            { q: 'Are kids welcome?', a: 'Absolutely. The house takes family chaos in its stride, and the beach handles the rest of it.' },
            { q: 'Can we set the bed configuration?', a: 'Yes. Tell us kings or singles per room when you book and it is done before you arrive.' },
            { q: 'Where exactly is it?', a: 'Shearwater, a few minutes from Port Sorell and Hawley Beach on Tasmania’s north west coast. About twenty five minutes from the Devonport ferry.' },
          ],
        },
        {
          type: 'cta',
          heading: 'Get the group locked in',
          body: 'Direct bookings get the best rate.',
          buttonText: 'Check availability',
          buttonHref: RX_BOOK,
        },
      ],
    },
    {
      slug: 'explore',
      nav_label: 'Explore',
      title: 'Explore · The Prescription Pad',
      sections: [
        {
          type: 'hero',
          kicker: 'Port Sorell and beyond',
          headline: 'Beach days, easy day trips',
          subheadline: 'Everything the group will argue about doing, all within reach.',
          imageUrl: A('8ba8340122-Hawley-Beach-Tas.jpg'),
        },
        {
          type: 'features',
          heading: 'Pick your day',
          items: [
            { title: 'Hawley Beach', body: 'Safe swimming, long sand and rock pools at the quiet end. Minutes from the house.', imageUrl: A('777048beeb-Ten-Fifty-Bakers-Hawley-Beachjpg.jpg') },
            { title: 'Narawntapu National Park', body: 'Across the water. Wombats and wallabies at dusk, Archers Knob for the view.', imageUrl: A('391a17fc28-Archers-Knob-1907-1.jpg') },
            { title: 'Ghost Rock Wines', body: 'The local cellar door. Long lunch territory, ten minutes inland.', imageUrl: A('530b402dbd-Ten-Fifty-Bakers-Ghost-Rock-Wines.jpg') },
            { title: 'Ashgrove Cheese', body: 'Cheese tastings on the way to Deloraine. Nobody comes back empty handed.', imageUrl: A('9f767642bc-Ten-Fifty-Bakers-Ashgrove-Cheese.jpg') },
            { title: 'Sheffield murals', body: 'The mural town under Mount Roland, forty minutes of very scenic driving away.', imageUrl: A('83bea6acf7-Ten-Fifty-Bakers-Sheffield-Mural.jpg') },
            { title: 'Wild Mersey trails', body: 'Mountain biking for every level, from Railton through to Sheffield.', imageUrl: A('3b294aa949-Ten-Fifty-Bakers-Wild-Mersey-Mountain-Bike-Trails.jpg') },
            { title: 'Seahorse World', body: 'A working seahorse farm at Beauty Point. Weirdly great for all ages.', imageUrl: A('3ce0ccf41e-Ten-Fifty-Bakers-Seahorse-World-Beauty-Point.jpg') },
            { title: 'Tasmania Zoo', body: 'Devils, monkeys and a good half day out near Launceston.', imageUrl: A('41f54c44b1-Ten-Fifty-Bakers-Tasmania-Zoo.jpg') },
          ],
        },
        {
          type: 'cta',
          heading: 'The house is the easy part',
          body: 'Lock in the dates and let the group fight about the itinerary later.',
          buttonText: 'Check availability',
          buttonHref: RX_BOOK,
        },
      ],
    },
  ],
};

/* ── Annie May — adults-only heritage, every room its own story ── */

const AM_BOOK = 'https://anniemay.com.au/accommodation/';

const annieMay: SiteSeed = {
  label: 'Raven designed',
  theme: DEFAULT_THEMES['annie-may'],
  pages: [
    {
      slug: 'home',
      nav_label: 'Home',
      title: 'Annie May · Adults-only heritage guesthouse, Devonport',
      sections: [
        {
          type: 'hero',
          kicker: 'Devonport · Tasmania · Adults only',
          headline: 'An old house, kept beautifully.',
          subheadline: 'A heritage guesthouse for grown-ups. Slow breakfasts, deep sleeps and not a bouncy castle in sight.',
          imageUrl: A('e0f7e8d1e2-Annie-May-Hero-3.jpg'),
          ctaText: 'Check availability',
          ctaHref: AM_BOOK,
        },
        {
          type: 'split',
          kicker: 'The guesthouse',
          heading: 'Every room earns its keep',
          body:
            'Annie May has been looked after, not renovated to death. High ceilings, arched windows, exposed brick in the stairwell and the kind of furniture you sink into rather than photograph.\n\nEach room is made up with proper linen and curtains dark enough to sleep past nine without guilt.',
          imageUrl: A('43923b600a-Annie-May-Chandeler.jpg'),
          align: 'right',
          imageAspect: 'portrait',
          ctaText: 'See the rooms',
          ctaHref: '?page=rooms',
        },
        { type: 'marquee', text: 'Linen sheets. Long breakfasts.\nNo early alarms.' },
        {
          type: 'stack',
          images: [
            { url: A('11d768d76c-DEB_AIRBNB_-39-1.jpg'), alt: 'The spiral stair to the loft' },
            { url: A('80a2abce87-Annie-May-Bedroom.jpg'), alt: 'The bay window room' },
            { url: A('38a160b9d2-Annie-May-Breakfast-Room.jpg'), alt: 'Breakfast, unhurried' },
            { url: A('ae6c3fdedb-DEB_AIRBNB_-53-1.jpg'), alt: 'Kept, not curated' },
            { url: A('3d8f2dbf3a-DEB_AIRBNB_-67-1.jpg'), alt: 'Annie May' },
          ],
        },
        {
          type: 'features',
          heading: 'The good bits',
          items: [
            { title: 'A private lift', body: 'Heritage bones, modern comforts. Every floor is easy, luggage included.', imageUrl: A('aac28457f8-DEB_AIRBNB_-106.jpg') },
            { title: 'The guest lounge', body: 'Leather, an original fireplace and the good bookshelves. Help yourself.', imageUrl: A('599eba6f4f-DEB_AIRBNB_-113-1.jpg') },
            { title: 'Quiet corners', body: 'Sheer light, deep seats and nowhere you have to be.', imageUrl: A('7905bf70f9-DEB_AIRBNB_-98.jpg') },
          ],
        },
        {
          type: 'mosaic',
          kicker: 'Morning',
          heading: 'Breakfast is the main event',
          body: 'The breakfast room does a proper morning. Good coffee, no rush on the second pot and nowhere you have to be afterwards.',
          word: 'slow',
          images: [
            { url: A('1dad30f6bb-IMG_7865.jpg'), alt: 'The details' },
            { url: A('4cf803d039-DEB_AIRBNB_-34.jpg'), alt: 'The breakfast room' },
            { url: A('f96b970ae1-Annie-May-From-Sky-to-Sky.jpg'), alt: 'From Sky to Sky' },
          ],
        },
        {
          type: 'quote',
          text: 'It felt like staying with a friend who happens to have wonderful taste.',
          attribution: 'Guest review',
        },
        {
          type: 'gallery',
          heading: 'Around the house',
          layout: 'masonry',
          images: [
            { url: A('7d7e7e85ed-DEB_AIRBNB_-4-1.jpg'), alt: 'Annie May' },
            { url: A('b5db9de437-DEB_AIRBNB_-11.jpg'), alt: 'The house' },
            { url: A('f85263f1b4-Annie-Mays-Bedroom.jpg'), alt: 'The arch room' },
            { url: A('ba7d162897-DEB_AIRBNB_-19.jpg'), alt: 'The guesthouse' },
            { url: A('556c863cd5-Annie-May-Bedroom1.jpg'), alt: 'Made properly' },
            { url: A('dbbe321ce8-DEB_AIRBNB_-79-1.jpg'), alt: 'The rooms' },
            { url: A('1d534881d3-Annie-May-Boutique-Accomodation.jpg'), alt: 'Annie May' },
            { url: A('ece3840c34-Annie-May-Loft-Room1.jpg'), alt: 'The loft' },
          ],
        },
        {
          type: 'cta',
          heading: 'Your room is waiting',
          body: 'Book direct with Deb for the best rate.',
          buttonText: 'Check availability',
          buttonHref: AM_BOOK,
          imageUrl: A('ffe059ef45-DEB_AIRBNB_-47.jpg'),
        },
      ],
    },
    {
      slug: 'rooms',
      nav_label: 'Rooms',
      title: 'Rooms · Annie May',
      sections: [
        {
          type: 'hero',
          kicker: 'The rooms',
          headline: 'Seven rooms, no two alike',
          subheadline: 'Heritage rooms with proper linen, deep beds and doors that close on the world.',
          imageUrl: A('80a2abce87-Annie-May-Bedroom.jpg'),
        },
        {
          type: 'text',
          heading: 'The idea',
          body:
            'Every room at Annie May is its own retreat. The bones are heritage, the beds are new and generous, and the quiet is guaranteed by the adults-only rule.\n\nPick a room among the original details downstairs, or climb the black spiral stair to the loft.',
        },
        {
          type: 'rooms',
          heading: '',
          items: [
            {
              name: 'The Loft',
              body: 'Top of the spiral stair, under the rake of the roof. A skylight over the bed, filament bulbs overhead, an orange velvet armchair for the afternoon and its own ensuite tucked behind the wall.',
              images: [
                { url: A('ece3840c34-Annie-May-Loft-Room1.jpg'), alt: 'The Loft' },
                { url: A('11d768d76c-DEB_AIRBNB_-39-1.jpg'), alt: 'The spiral stair' },
              ],
            },
            {
              name: 'The Bay Window Room',
              body: 'The big front room. A king against a deep teal bedhead, two armchairs in the arched bay window and morning light through the sheers.',
              images: [
                { url: A('80a2abce87-Annie-May-Bedroom.jpg'), alt: 'The Bay Window Room' },
                { url: A('556c863cd5-Annie-May-Bedroom1.jpg'), alt: 'The details' },
              ],
            },
            {
              name: 'The Arch Room',
              body: 'High ceilings, an arched window nearly the width of the wall and a settee that has ended more than one afternoon early.',
              images: [{ url: A('f85263f1b4-Annie-Mays-Bedroom.jpg'), alt: 'The Arch Room' }],
            },
            {
              name: 'Room Four',
              body: 'One of the quiet rooms off the hall. Linen sheets, a deep bed and heritage details overhead.',
              images: [{ url: A('7d7e7e85ed-DEB_AIRBNB_-4-1.jpg'), alt: 'Room four' }],
            },
            {
              name: 'Room Five',
              body: 'Soft light through sheer curtains and not a sound after ten. Bring the book you keep meaning to finish.',
              images: [{ url: A('dbbe321ce8-DEB_AIRBNB_-79-1.jpg'), alt: 'Room five' }],
            },
            {
              name: 'Room Six',
              body: 'The simplest room in the house, which is saying something. Bed, chair, window, done properly.',
              images: [{ url: A('b5db9de437-DEB_AIRBNB_-11.jpg'), alt: 'Room six' }],
            },
            {
              name: 'Room Seven',
              body: 'Last down the hall and first to go quiet. A proper retreat for one or two.',
              images: [{ url: A('ba7d162897-DEB_AIRBNB_-19.jpg'), alt: 'Room seven' }],
            },
          ],
        },
        {
          type: 'faq',
          heading: 'Good to know',
          items: [
            { q: 'Is it really adults only?', a: 'Yes, always. It is what keeps the house calm, and it is the thing guests thank us for most.' },
            { q: 'What about breakfast?', a: 'The breakfast room is the heart of the house. Ask Deb about breakfast when you book and it will be sorted.' },
            { q: 'How central is it?', a: 'You are in Devonport itself. The waterfront, the cafes and the Spirit of Tasmania terminal are all a few minutes away.' },
            { q: 'When can we check in?', a: 'Deb will arrange a time that suits you when you book. It is that kind of place.' },
          ],
        },
        {
          type: 'cta',
          heading: 'Pick your room',
          body: 'Book direct for the best rate.',
          buttonText: 'Check availability',
          buttonHref: AM_BOOK,
        },
      ],
    },
    {
      slug: 'explore',
      nav_label: 'Explore',
      title: 'Explore · Annie May',
      sections: [
        {
          type: 'hero',
          kicker: 'From the front door',
          headline: 'Vineyards, distilleries, slow days',
          subheadline: 'Devonport is the start of the good bits of the north west.',
          imageUrl: A('ffe059ef45-DEB_AIRBNB_-47.jpg'),
        },
        {
          type: 'features',
          heading: 'Days out for grown-ups',
          items: [
            { title: 'Ghost Rock Vineyard', body: 'Cellar door with a view over the coast, twenty minutes east. Book the long lunch.', imageUrl: A('e2a227f0e6-Annie-May-Ghost-Rock-Vineyard.jpg') },
            { title: 'Southern Wild Distillery', body: 'Devonport’s own gin, distilled a few minutes from the house.', imageUrl: A('e77e24bcb7-Annie-May-Southern-Wild-Distillery.jpg') },
            { title: 'Ashgrove Cheese', body: 'Farmhouse cheese on the road to Deloraine. Take an esky.', imageUrl: A('8998d1fa26-Annie-May-Ashgrove-Cheese-.jpg') },
            { title: 'Tasmanian Arboretum', body: 'Platypus at dusk if you are patient, and 66 hectares of trees if you are not.', imageUrl: A('5e369d42c8-Annie-May-Tasmanian-Arboretum.jpg') },
            { title: 'Sheffield murals', body: 'An entire town of street art under Mount Roland, forty minutes away.', imageUrl: A('5bdb001499-Annie-May-Sheffield-Mural.jpg') },
            { title: 'Don River Railway', body: 'Beautifully kept steam trains ten minutes up the road.', imageUrl: A('b59f744fc4-Ten-Fifty-Bakers-Don-River-Railway.jpg') },
          ],
        },
        {
          type: 'cta',
          heading: 'Come back to a quiet house',
          body: 'Whatever the day held, the evening is calm.',
          buttonText: 'Check availability',
          buttonHref: AM_BOOK,
        },
      ],
    },
  ],
};

export const SITE_SEEDS: Record<string, SiteSeed> = {
  'ten-fifty-bakers': tenFiftyBakers,
  'prescription-pad': prescriptionPad,
  'annie-may': annieMay,
};
