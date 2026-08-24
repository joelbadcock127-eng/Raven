-- Sprint launch-first opportunity: Australian Junior Squash Championships
-- (27 Sep – 3 Oct 2026, Squash Haus, Devonport) × The Prescription Pad's
-- 18-night gap from 14 Sep. Draft page — flip published=true once vacancy
-- is re-confirmed on the day of publishing.
--
-- Run against the decra (raven-sydney) Supabase project:
--   psql or the SQL editor, or `supabase db execute --file <this file>`

insert into events (id, source, source_url, title, description, start_date, end_date, venue_name, address, locality, url, tags)
values (
  'manual-aus-junior-squash-2026',
  'manual',
  'https://www.discovertasmania.com.au/things-to-do/festivals-and-events/2026-australian-junior-squash-championships/',
  '2026 Australian Junior Squash Championships',
  'National junior championships across U11–U19 age groups, individual and teams divisions, with state teams travelling from every Australian state. Level 1 coach course runs 26–27 September. Seven days of competition at Squash Haus, Devonport.',
  '2026-09-26',
  '2026-10-03',
  'Squash Haus',
  '34 Forbes Street, Devonport TAS 7310',
  'Devonport',
  'https://www.squashaus.com.au/competitions_and_events/australian-junior-championships/',
  array['sport','national','juniors','teams','families']
)
on conflict (id) do update set last_seen_at = now();

insert into event_pages (slug, campaign_id, property_id, event_id, content, published)
values (
  'australian-junior-squash-championships-accommodation',
  null,
  'prescription-pad',
  'manual-aus-junior-squash-2026',
  $${
    "headline": "Australian Junior Squash Championships 2026: group accommodation, sorted.",
    "subheadline": "Seven days of national junior squash at Squash Haus, Devonport, from 27 September to 3 October. If you are bringing a team, a squad of juniors or the whole family, here is a house that takes everyone.",
    "intro": "The 2026 Australian Junior Squash Championships run Sunday 27 September to Saturday 3 October at Squash Haus, 34 Forbes Street, Devonport — U11 through U19 age groups, individual and teams divisions, with state teams from around the country. A Level 1 coaching course runs alongside on 26–27 September, so most travelling groups arrive the weekend before. A week is a long time to split a squad across motel rooms: The Prescription Pad in Shearwater sleeps ten under one roof, about twenty minutes from the courts, with a full kitchen for team dinners, a games room for the downtime between matches, and Port Sorell's beaches at the end of the street for rest days.",
    "tieIn": "The championships fall inside the Tasmanian and Victorian spring school holidays, so the week works as a family trip around the squash: Narawntapu National Park and its wombats are twenty minutes away, the Spirit of Tasmania docks in Devonport if you are driving over with the car full of racquets, and cafes and takeaway in Shearwater and Port Sorell handle the nights nobody wants to cook.",
    "aboutProperty": "The Prescription Pad is a spacious group house in Shearwater built exactly for this: families, sports weekends and reunions. It sleeps ten, has room to spread out after long days at the courts, and books with a two-night minimum — for the championships you will want the whole week anyway.",
    "whyStay": [
      "One house for the whole squad — ten beds under one roof beats four motel rooms for team logistics, meals and curfews.",
      "About twenty minutes by car to Squash Haus on Forbes Street, an easy morning run for match days.",
      "A full kitchen and barbecue for proper team dinners — carb-loading juniors are expensive to feed out every night for a week.",
      "A games room for the hours between matches, and Port Sorell's beaches five minutes away for rest days.",
      "Book direct with the owners — no booking-site fees, and the house is yours for the whole championships week."
    ],
    "plan": [
      "Friday 25 or Saturday 26 September — arrive (the Spirit docks in Devonport, 25 minutes away), settle the squad in, coaches head to the Level 1 course.",
      "Sunday 27 September – Saturday 3 October — championships week: courts in the morning, Shearwater to regroup, beach or games room in the evening.",
      "Sunday 4 October — slow pack-up, a last beach walk, and the drive or sail home."
    ],
    "practical": [
      { "label": "Event", "value": "2026 Australian Junior Squash Championships, Sunday 27 September – Saturday 3 October; Level 1 coach course 26–27 September." },
      { "label": "Venue", "value": "Squash Haus, 34 Forbes Street, Devonport TAS 7310." },
      { "label": "The house", "value": "The Prescription Pad, Shearwater — sleeps 10, two-night minimum, roughly 20 minutes' drive to the venue." },
      { "label": "Getting there", "value": "Fly into Devonport or Launceston, or bring the car on the Spirit of Tasmania — the terminal is 25 minutes from the house." }
    ],
    "galleryUrls": [
      "/mirror-assets/e0b0a007f0-The-Prescription-Pad1.jpg",
      "/mirror-assets/68c26961d7-The-Prescription-Pad2.jpg",
      "/mirror-assets/d673830394-Prescription-Pad-Eightball.png",
      "/mirror-assets/0bfde11580-Prescription-Pad-Beach.png"
    ],
    "offer": {
      "name": "The championships week, booked direct",
      "pitch": "Book the house direct for five nights or more over the championships (26 September – 4 October) and the owners will include a late checkout on your last morning plus a welcome grocery pack for the first team breakfast. Mention the squash when you book."
    },
    "cta": "Check availability",
    "metaDescription": "Accommodation for the 2026 Australian Junior Squash Championships in Devonport, 27 Sep – 3 Oct: a group house in Shearwater sleeping 10, ~20 minutes from Squash Haus. Book direct.",
    "heroImageUrl": "/mirror-assets/ca00174563-The-Prescription-Pad-Hero-3.jpg",
    "bookUrl": "https://theprescriptionpad.com.au/bookings/",
    "propertyName": "The Prescription Pad",
    "propertyDomain": "theprescriptionpad.com.au",
    "eventTitle": "2026 Australian Junior Squash Championships",
    "eventDates": "27 September – 3 October 2026",
    "venue": "Squash Haus, 34 Forbes Street",
    "locality": "Devonport, Tasmania",
    "ticketUrl": "https://www.squashaus.com.au/competitions_and_events/australian-junior-championships/",
    "expiresAt": "2026-10-04"
  }$$::jsonb,
  false
)
on conflict (slug) do update set content = excluded.content, event_id = excluded.event_id, updated_at = now();

-- The tulip page: durable slug (no date string) + archive date, per the
-- sprint URL convention. The old slug row is replaced by the new one.
update event_pages
set slug = 'wynyard-tulip-festival-accommodation',
    content = content || '{"expiresAt": "2026-10-25"}'::jsonb,
    updated_at = now()
where slug = 'wynyard-tulip-festival-2026-10';
