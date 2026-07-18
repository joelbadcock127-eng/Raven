/**
 * Offer templates — specific reasons to travel, matched to demand signals by
 * pure logic (tags + property), no AI. A campaign picks one offer; every
 * generated asset (page, emails, posts) then sells that offer.
 */

export interface OfferTemplate {
  id: string;
  name: string;
  /** Property ids this offer makes sense for. */
  properties: string[];
  /** Event/signal tags that suggest this offer. */
  tags: string[];
  /** What the guest gets — used verbatim in copy generation. */
  pitch: string;
  /** Note to the owner on how to run it. */
  ownerNote: string;
}

export const OFFER_TEMPLATES: OfferTemplate[] = [
  {
    id: 'guided-walk',
    name: 'Stay + guided Bakers walk',
    properties: ['ten-fifty-bakers'],
    tags: ['nature-walking', 'wellness', 'sports'],
    pitch:
      'Two nights at Ten Fifty Bakers with a guided walk along the private trails and into Narawntapu — routes matched to the group, wildlife at dusk included.',
    ownerNote: 'Coordinate with Bakers Walking Co (they already guide guests here). Price the walk in, don’t itemise it.',
  },
  {
    id: 'winter-wellness',
    name: 'Winter sauna & wellness stay',
    properties: ['ten-fifty-bakers'],
    tags: ['wellness', 'romantic', 'school-holiday'],
    pitch:
      'A midwinter reset: barrel sauna sessions, hot outdoor baths under cold clear skies, fires lit, and 20 km of trails to earn it all.',
    ownerNote: 'Push June–August dates that would otherwise sit empty. Cold snaps are the hook, not the obstacle.',
  },
  {
    id: 'wildlife-package',
    name: 'Three-night wildlife package',
    properties: ['ten-fifty-bakers'],
    tags: ['nature-walking', 'family', 'school-holiday'],
    pitch:
      'Three nights on the edge of Narawntapu — wallabies and wombats at dusk on the property, penguin viewing at Lillico Beach, and the quietest beach in the north.',
    ownerNote: 'Sell the third night as the difference between seeing wildlife and ticking it off.',
  },
  {
    id: 'contractor-weekday',
    name: 'Contractor weekday rates',
    properties: ['prescription-pad', 'annie-may'],
    tags: ['business', 'conference'],
    pitch:
      'Clean beds, full kitchen, fast wifi and off-street parking for working crews — Monday to Thursday, weekly terms available, invoiced properly.',
    ownerNote: 'Target construction and infrastructure projects around Devonport/Port Sorell. Weekday occupancy is the win; keep weekends clear for leisure rates.',
  },
  {
    id: 'visiting-family',
    name: 'Visiting-family package',
    properties: ['prescription-pad', 'annie-may'],
    tags: ['family', 'community', 'wedding-milestone', 'funeral'],
    pitch:
      'The whole family under one roof minutes from town — room to cook together, spread out, and be close to the people you came for.',
    ownerNote: 'Works for weddings, milestone birthdays, reunions and funerals. Tone shifts with the occasion — the kit copy handles it.',
  },
  {
    id: 'event-group',
    name: 'Event group accommodation',
    properties: ['prescription-pad', 'ten-fifty-bakers'],
    tags: ['sports', 'festival', 'music', 'community', 'market'],
    pitch:
      'Sleep the whole team or crew together near the event — ten beds, big kitchen, easy parking, and no one drawing straws for the couch.',
    ownerNote: 'Pitch the organiser directly: teams, bands, stallholders and officials all need group beds.',
  },
  {
    id: 'late-ferry',
    name: 'Late ferry arrival package',
    properties: ['annie-may', 'prescription-pad'],
    tags: ['cruise', 'family', 'long-weekend', 'school-holiday'],
    pitch:
      'Roll off the Spirit of Tasmania and be in bed in minutes — late self check-in sorted, breakfast tips waiting, and a fresh start to the island in the morning.',
    ownerNote: 'The evening sailing docks at Devonport around 6:30pm and the night sailing early morning — first/last-night stays are an easy repeat product.',
  },
  {
    id: 'private-retreat',
    name: 'Private group retreat',
    properties: ['ten-fifty-bakers'],
    tags: ['wellness', 'business', 'conference', 'arts'],
    pitch:
      'The whole property for your retreat — workshop in the lounge, walk the trails between sessions, sauna and fire circle after dark. No other guests, no interruptions.',
    ownerNote: 'Yoga teachers, creative groups, small leadership teams. Midweek dates, higher nightly value, low wear.',
  },
  {
    id: 'romantic-escape',
    name: 'Adults-only escape',
    properties: ['annie-may'],
    tags: ['romantic', 'wedding-milestone', 'food-wine'],
    pitch:
      'A quiet heritage room, good linen, and Devonport’s restaurants a short walk away — grown-up travel without a single bunk bed in sight.',
    ownerNote: 'Anniversaries, proposals, empty-nesters off the ferry. Pairs with food-wine events.',
  },
];

/** Offers ranked for a property + event tags — simple overlap scoring. */
export function matchOffers(propertyId: string | null, tags: string[]): OfferTemplate[] {
  return OFFER_TEMPLATES
    .filter((o) => !propertyId || o.properties.includes(propertyId))
    .map((o) => ({ o, hits: o.tags.filter((t) => tags.includes(t)).length }))
    .sort((a, b) => b.hits - a.hits)
    .map(({ o }) => o);
}

/**
 * Distribution channels in escalation order: free and organic first, paid
 * last. Each has a default "switch on" point in days before the target date;
 * cheap channels start early, desperation moves are held back until the
 * dates are close and still unbooked. Editable per campaign (playbook).
 */
export const DISTRIBUTION_CHANNELS: Array<{ id: string; label: string; hint: string; daysOut: number }> = [
  { id: 'contentPage', label: 'Content page', daysOut: 60, hint: 'Publish the event page on the property site first — it does the selling for every later channel.' },
  { id: 'email', label: 'Email list', daysOut: 45, hint: 'Send the guest email to your MailerLite list.' },
  { id: 'formerGuests', label: 'Former guests', daysOut: 42, hint: 'Personal note to past guests who match this offer.' },
  { id: 'directOutreach', label: 'Direct outreach', daysOut: 40, hint: 'Email the organiser / project manager with the group pitch.' },
  { id: 'localPartners', label: 'Local partners', daysOut: 35, hint: 'Ask venues, operators and organisers to share your stay link.' },
  { id: 'travelGroups', label: 'Travel groups', daysOut: 21, hint: 'Post in Tasmania travel Facebook groups and forums (as the owner, transparently).' },
  { id: 'paidSocial', label: 'Paid social', daysOut: 10, hint: 'Last resort: boost on Meta with a small daily budget once free channels have had their shot.' },
];
