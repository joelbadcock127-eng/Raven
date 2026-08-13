# Annie May — event article template

How to produce an SEO event article for Annie May, using the existing
event-pages CMS. First worked example: **Wynyard Tulip Festival 2026**
(`/events/wynyard-tulip-festival-2026-10`).

## How the CMS works

- Articles live in the Supabase `event_pages` table, one row per page,
  keyed by `slug`. The `content` jsonb column holds everything the page
  renders; `published` controls visibility (drafts render with a banner
  and `noindex`).
- Any row with `property_id = 'annie-may'` is rendered at
  `/events/<slug>` in Annie May's own design language by
  `AnnieMayEventArticle.tsx`, wrapped in the site chrome. Other
  properties get the generic template in `app/events/[slug]/page.tsx`.
- Pages can be authored two ways: the campaign kit (`lib/kit.ts`)
  generates them from an `events` row via the admin Campaigns screen, or
  a row can be inserted directly (as the tulip page was).
- Slug convention: `<event-title-slugified>-<YYYY-MM>`.
- Also insert a matching row in `events` (`source = 'manual'`) so the
  event shows up in the monitor and can be linked via `event_id`.

## Choosing an event

- Within about an hour's drive of Devonport, and suited to Annie May's
  guest: **adults only** — food, wine, gardens, music, sport, heritage.
  Skip family fairs.
- Publish 6–10 weeks ahead of the event for the SEO window.
- Confirm dates/venue/entry from the organiser's own site and link it as
  `ticketUrl`.

## Writing rules

- The article is **informative first** — a genuinely useful guide to the
  event (dates, venue, entry, how to get there, when it's best) that
  would rank and read well even with the accommodation removed.
- Annie May enters **subtly**, mid-article: `aboutProperty` frames her
  as "the sensible base", never a sales pitch. House voice: understated,
  warm, Australian English, no prices, "she/her" for the house.
- Include the target keyword (event name + year) in `headline`,
  `metaDescription` and the opening of `intro`. Meta description ≤160
  chars. The page `<title>` becomes `"<headline> — Annie May"`.
- Booking incentive goes in `offer` as a **limited-time, book-direct**
  package. Rotate from: late checkout · local produce hamper ·
  complimentary bottle of Tasmanian sparkling. Give it a deadline and a
  name (e.g. "The Tulip Weekend, booked direct").

## Imagery

- `heroImageUrl`: one evocative image **of the event** (21:9 crop on the
  page). Generated or licensed — never lifted from the organiser.
  Store under `apps/web/public/mirror-assets/am-event-<slug-ish>.jpg`,
  resized ≤1920px, quality ~82.
- `galleryUrls`: at least one image **of Annie May** (the facade
  `/mirror-assets/1d534881d3-Annie-May-Boutique-Accomodation.jpg` works;
  see `IMG` in `components/anniemay/data.ts` for the library).

## Content schema (`content` jsonb)

| Field | Notes |
| --- | --- |
| `headline` | H1 + meta title; carries the keyword |
| `subheadline` | One-sentence hook under the H1 |
| `intro` | The event, fully covered: what/when/where/how much |
| `tieIn` | The trip worked out — drives, stops, best times |
| `aboutProperty` | The subtle Annie May paragraph |
| `whyStay[]` | ≤7 bullets (rendered with roman numerals) |
| `plan[]` | Day-by-day shape of the stay |
| `practical[]` | `{label, value}` — dates, season, getting there |
| `offer` | `{name, pitch}` — the limited-time direct incentive |
| `galleryUrls[]` | Up to 4; include one Annie May image |
| `heroImageUrl` | The event image |
| `metaDescription` | ≤160 chars, keyword up front |
| `cta`, `bookUrl` | "Check availabilities" + Preno direct link |
| `eventTitle`, `eventDates`, `venue`, `locality`, `ticketUrl` | Kicker + outbound link |
| `propertyName`, `propertyDomain` | "Annie May", "anniemay.com.au" |

## Publishing checklist

1. Hero image committed to `mirror-assets` and pushed to main.
2. `events` row inserted (`source = 'manual'`).
3. `event_pages` row upserted with `published = false`; preview at
   `/events/<slug>`.
4. Owner confirms the offer terms and deadline.
5. Flip `published = true`.
