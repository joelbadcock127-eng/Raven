# Site design research — the three property redesigns

Research base for the designed sites shipped in `apps/web/src/lib/siteSeeds.ts` and the
motion system in `SiteRenderer.tsx`. Three research lanes ran in parallel: world-class
lodge/boutique-hotel sites, award-winners (Awwwards / CSS Design Awards / FWA), and
direct-booking conversion teardowns.

## References

### Luxury lodges and boutique hotels

| Site | What works | Best for |
|---|---|---|
| [Saffire Freycinet](https://saffire-freycinet.com.au/) | Deep charcoal ground, white sans type, cinematic Tasmanian coast photography does all the persuading. Copy is sparse one-line poetry ("Be Nowhere Else"). Nav pared to five labels, one persistent "Reserve Your Stay". | **Ten Fifty Bakers** — you market a retreat by selling absence, not amenities |
| [Southern Ocean Lodge](https://southernoceanlodge.com.au/) | Light airy ground, golden-hour clifftop photography, interiors shot through floor-to-ceiling glass so every room reads as a view. Sticky "Reserve Now". | **Prescription Pad** — wild coast in a light, optimistic palette |
| [Annandale NZ](https://www.annandale.com/) | Exclusive-use villas each treated as a destination; dramatic letter-spaced display type; "Check Availability" early and repeated; "gumboot luxury" tone. | **Prescription Pad** — the closest structural comp: whole-house coastal booking |
| [Aman](https://www.aman.com/) | The ceiling for restraint: negative space, slow cinematic transitions, no people in photos, booking as a secondary act after seduction. | All three |
| [Ett Hem](https://www.etthem.se/) | "More personal than the luxury hotel." Nav is five domestic words (House, Kitchen, Garden…). Personal enquiry on equal footing with the engine. | **Annie May** — copy this information architecture almost verbatim |
| [The Newt in Somerset](https://thenewtinsomerset.com/) | Heritage + craft storytelling; lifestyle photography of real activity; sensory copy system; persistent split CTAs. | **Annie May** — heritage as a living brand, not a museum |

### Award winners

| Site | What works | Best for |
|---|---|---|
| [Casa di Legna](https://casadilegna.com/en) (CSS Winner) | One coastal house, one long scroll: parallax image reveals, lyrical short-line copy, sleeps-12 facts stated plainly, exactly one Book CTA. | **Prescription Pad** |
| [Rancho Santana](https://www.ranchosantana.com/) (CSS Winner) | Video-led hero, whitespace typography over bright coastal photography, lazy-loaded imagery kept fast, sticky Reserve. | **Prescription Pad** |
| [Son Daven](https://sondaven.com) (Awwwards SOTM) | Scroll-driven storytelling of remote nature: panoramic reveals, two-colour discipline, place-and-culture copy before product. | **Ten Fifty Bakers** |
| [Silena](https://www.silena.com/en) (Awwwards SOTD) | Adults-only calm expressed through pacing: smooth scroll, seamless page transitions, few deliberate images, contemplative copy. | **Ten Fifty Bakers** / **Annie May** |
| [Passalacqua](https://www.passalacqua.it/) (Awwwards HM) | Heritage narrated through the people who run it; details and portraits over empty rooms; lead capture that feels like hospitality. | **Annie May** |
| [Paris by Emily](https://parisbyemily.com) (Awwwards SOTD) | City-as-character storytelling; the guest is cast as protagonist before any product appears. | **Annie May** |

### Direct-booking conversion

| Source | What works |
|---|---|
| [The Hoxton](https://thehoxton.com) | Booking modal inline (never a foreign-looking redirect); "book direct… best rates plus perks we keep just for you". Neighbourhood-first heroes. |
| [AvantStay](https://www.avantstay.com) | Group homes sold on capacity in plain numerals; date+guest entry above the fold; specific trust ("300,000+ verified reviews"). |
| [Unyoked](https://unyoked.co) | The Australian off-grid benchmark: narrative earns the click, Book Now is always present, scarcity framed as an asset. |
| [Prostay 2026 teardown](https://www.prostay.com/blog/hotel-direct-booking-conversion-2026/) | Independents convert 0.73% site-wide vs 3.28% in the booking flow — the leak is the transition. Mobile is where 80–90% of direct bookings die. Speed first, then funnel, then rate messaging. |

## The three design directions

Siblings, not clones: same engine, same craft, three personalities.

**Ten Fifty Bakers — dark-sky cinematic (bush).** The Saffire/Son Daven model. Near-black
ground (`#15120d`), parchment type, brass accent, Cormorant Garamond display. Slow pacing,
full-height imagery, copy that sells absence: "Solar power. Salt air. Nothing else scheduled."

**The Prescription Pad — bright coastal modern (coastal).** The Southern Ocean
Lodge/Casa di Legna model. Off-white ground, deep sea ink, teal accent, Space Grotesk
display, generous radius. Capacity in plain numerals up front (5 kings / 10 beds), group
energy in the copy, light and optimistic imagery.

**Annie May — warm heritage editorial (urban).** The Ett Hem/Passalacqua model. Cream
ground, olive accent, Fraunces display. Domestic vocabulary (Rooms, not Accommodation),
host-led copy ("Book direct with Deb"), detail-led photography, adults-only calm as the
product.

## Motion system (and why no animation libraries)

Everything ships through the section engine in `SiteRenderer.tsx`:

- scroll-driven hero parallax with settle-down scale (replaces time-based Ken Burns)
- clip-path curtain reveals on all in-flow imagery; mask-rise staggered text reveals
- a pinned horizontal gallery: the film strip pins for one viewport and translates with
  scroll progress on desktop, falls back to native swipe on mobile
- cursor-aware image drift on fine pointers only
- route transitions via the View Transitions API (progressive enhancement)
- persistent booking path: header Book button on desktop, a fixed bottom
  "Check availability" bar on mobile that arrives after the first viewport

The brief suggested Framer Motion + GSAP/ScrollTrigger + Lenis. Deliberately not added:
this renderer is a data-driven section engine where every treatment above is achievable
with IntersectionObserver, one rAF scroll loop and scroll-driven CSS — roughly 90KB of
animation runtime avoided, which is exactly the headroom the Lighthouse-90-mobile floor
needs with full-bleed photography in play. Same logic the brief applies to WebGL: add it
only when a treatment demands it. None does yet.

`prefers-reduced-motion` gets a genuine tier, not a kill switch: content appears with calm
opacity fades, parallax and pinning are disabled (the gallery becomes a native swipe
strip), the hero renders static and full-frame, and the booking bar stops sliding.

## Conversion decisions carried into the builds

- Book/Check-availability CTA visible at every scroll depth on every page (header +
  mobile bar + section CTAs + image-backed closing CTA per page).
- Verb-first CTA labels ("Check availability", "Book your stay").
- Rate-parity messaging next to closing CTAs ("Book direct… best rate, always").
- Capacity numerals for the group house on the home page (AvantStay pattern).
- Booking currently hands off to each property's existing booking page; when the v2
  sites take over the domains, point the CTAs at the Lodgify booking engine so the flow
  stays on-brand (Hoxton pattern — avoid foreign-looking redirects).
