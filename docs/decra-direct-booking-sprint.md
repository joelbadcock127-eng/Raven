# Decra Direct Booking Sprint — results & cutover sheets

Sprint objective: one attributable direct booking, all three sites
domain-ready and indexable. Prepared 24 August 2026 against live Decra
availability data.

## 1 · Ranked opportunities (from ACTUAL unsold inventory)

### Data sources used

- `occupancy_gaps` + `availability_days` in the Decra database (synced
  nightly 19:00 UTC — Lodgify for Ten Fifty Bakers and The Prescription
  Pad, Preno iCal for Annie May), read via the deployed dashboard.
- Event facts verified against Discover Tasmania / Squash Australia /
  festival sites on 24 Aug 2026.

**Data gaps to fix:** (1) The Supabase connector in Claude sessions now
authenticates against a different Supabase account (ScoreApp/DTTA org) —
re-authorise it against the org that owns the `raven-sydney` project to
restore direct database access; until then database writes (publishing
event pages) need the SQL editor. (2) Annie May's room-level coverage
shows only 2–4 tracked units on sampled dates against seven rooms —
verify all seven Preno iCal feeds are configured in
`properties.ical_urls`.

### Live unsold inventory (next 8–12 weeks, from occupancy_gaps)

| Property | Gap start | Nights |
| --- | --- | --- |
| Prescription Pad | 14 Sep | **18** |
| Prescription Pad | 4 Oct | 12 |
| Prescription Pad | 18 Oct | 10 |
| Prescription Pad | 4 Nov | 23 |
| Ten Fifty Bakers | 9 Sep | 6 |
| Ten Fifty Bakers | 17 Sep | 4 |
| Ten Fifty Bakers | 23 Sep | **14** |
| Ten Fifty Bakers | 9/16/23/30 Oct | 5–6 each |
| Annie May | (room-level; mostly booked — 1 room open on sampled peak dates) | — |

### Top 5 (Demand × Intent × Fit × Inventory × Reachability × Lead time)

| # | Opportunity | Property | Why |
| --- | --- | --- | --- |
| **1 · LAUNCH FIRST** | **Australian Junior Squash Championships, 27 Sep–3 Oct** (Squash Haus, Devonport; coach course 26–27 Sep) | **The Prescription Pad** | National event, 7 days, state teams + families = certain accommodation intent. PP's 18-night gap (14 Sep–2 Oct) plus the 4 Oct gap covers the entire event. Sleeps 10 ≈ a team under one roof, ~20 min from the courts. Audience directly reachable via Squash Australia, state squash bodies and club Facebook groups. Booking window is NOW (5 weeks out). |
| 2 | TAS + VIC spring school holidays, 26 Sep–11 Oct | Prescription Pad | Same gap; family drive-over demand via Spirit of Tasmania. Distribution harder to target than #1 — run as backup messaging. |
| 3 | Squash overflow: parents/officials wanting a quiet adults-only stay | Annie May | Same event, premium angle. Inventory thin (1 room open on sampled dates) — verify room-level before promoting. |
| 4 | Coastal Pathway Ultra, 4 Oct | Prescription Pad / Ten Fifty Bakers | PP's 12-night gap starts exactly 4 Oct; runners + support crews, 1–2 nights. Small field — pair with #1 rather than standalone. |
| 5 | Tasmanian Craft Fair, Deloraine, 30 Oct–1 Nov | Ten Fifty Bakers | TFB's 30 Oct 6-night gap matches exactly; interstate craft-fair visitors tour the region. ~50 min drive — pitch as the scenic base. |

Discarded: Devonport Eisteddfod (2–17 Sep — too soon + mostly local),
Twilight Market/Living Well Expo (local audience), penguin/wildflower
seasonal windows (no dated travel trigger).

## 2 · What was built this sprint (code, merged to main)

- **Event pages** now emit canonical URLs on the property domain, full
  Open Graph metadata, and archive behaviour: an `expiresAt` date in the
  content JSON drops the page to noindex (still reachable) after the
  event, and drops it from the sitemap.
- **Attribution**: every event page's booking CTA now routes through a
  tracked `/go/<code>` link created automatically server-side — clicks
  land in `link_clicks` with referrer/UA, and the booking engine receives
  `utm_source=<property domain>, utm_medium=event-page,
  utm_campaign=<page slug>`. Falls back to plain UTM links if the
  tracked-links tables are unreachable.
- **What's-on index** at `/events` on every property domain (Annie May
  in her V2 chrome, generic elsewhere) — published pages are internally
  linked, never orphans; Annie May's footer links to it; sitemaps include
  it.
- **Canonical hostname**: `www.` permanently (308) redirects to the bare
  domain on all mapped property domains.
- **404 correctness**: unknown paths on anniemay.com.au now 404 instead
  of soft-200ing the home page.
- **Annie May pages** emit canonical + OG tags pointing at
  anniemay.com.au; app-host copies are explicitly noindexed.
- **Mirror sites audited**: TFB and Prescription Pad mirrors already
  carry correct per-page canonicals to their production domains, real
  titles and OG tags; no dev banners; booking links are absolute
  production URLs. No design changes made.
- **Launch-first draft page** ready:
  `supabase/seeds/2026-09-squash-championships-event-page.sql` creates
  `/events/australian-junior-squash-championships-accommodation` on
  theprescriptionpad.com.au (draft) and renames the tulip page to the
  durable `/events/wynyard-tulip-festival-accommodation` slug. Run it in
  the Supabase SQL editor, preview, then flip `published=true`.

## 3 · Expected domains (config, not guesses)

| Property | Domain (canonical) | Serves |
| --- | --- | --- |
| Annie May | `anniemay.com.au` | Bespoke V2 site (in code, ready) |
| Ten Fifty Bakers | `tenfiftybakers.com.au` | Current mirrored design |
| The Prescription Pad | `theprescriptionpad.com.au` | Current mirrored design |

TODO (not guessed): confirm each domain's registrar/DNS host login, and
that `NEXT_PUBLIC_APP_URL=https://decra-stays.vercel.app` is set in
Vercel (the middleware and canonical logic depend on it).

## 4 · DNS cutover sheet (one per domain)

Repeat for **anniemay.com.au**, **tenfiftybakers.com.au**,
**theprescriptionpad.com.au**:

1. **Before touching DNS**: back up the current WordPress site; note
   every existing DNS record (screenshot the zone).
2. **Vercel → decra-stays project → Settings → Domains**: add the root
   domain AND `www.`. Set the **root as primary**; Vercel then serves
   www as a redirect (the app middleware also 308s www→root).
3. If Vercel shows a **TXT verification record**, add it at the DNS host
   exactly as shown, before changing traffic records.
4. **Change ONLY web-routing records**, using the exact values Vercel
   displays (commonly `A @ → 76.76.21.21`; `CNAME www →
   cname.vercel-dns.com` — trust the dashboard over this doc):
   - REPLACE: existing `A`/`AAAA` on `@`, existing `A`/`CNAME` on `www`
     that point at the old web host.
   - DO NOT TOUCH: `MX`, `TXT` (SPF/DKIM/DMARC), `SRV`, subdomains like
     `mail.`, `autodiscover.`, or the registrar's nameservers.
5. Wait for Vercel to show the domain configured + SSL issued.
6. **Post-cutover tests** (per domain):
   - `https://<domain>/` 200 and shows the right site
   - `https://www.<domain>/` → 308 → root
   - deep link (e.g. `/accommodation` or `/our-story`) 200
   - `/robots.txt` allows crawling and names the sitemap
   - `/sitemap.xml` lists canonical production URLs only
   - `/events` renders (empty until a page is published there)
   - old-slug redirect on anniemay.com.au: `/annie-mays-story` → `/story`
   - view-source: canonical tag shows the production domain
7. **Then** Search Console: add the domain property (DNS TXT verify),
   submit `sitemap.xml`, Request Indexing for the homepage and the first
   event page. Import to Bing Webmaster Tools (feeds ChatGPT/Copilot).
   Monitor Pages coverage — submission ≠ indexed.

## 5 · Launch sequence for booking #1

1. Re-authorise the Supabase connector (or open the SQL editor) and run
   `supabase/seeds/2026-09-squash-championships-event-page.sql`.
2. Re-confirm Prescription Pad vacancy for 26 Sep–4 Oct, then set
   `published=true` on the squash page.
3. Cut over `theprescriptionpad.com.au` DNS (sheet above) — the page
   goes live at
   `theprescriptionpad.com.au/events/australian-junior-squash-championships-accommodation`.
4. Search Console: request indexing for it.
5. Distribution (manual, immediately): email Squash Tasmania + Squash
   Australia event contact (events@squashaus.com.au) offering the house
   for a travelling team; post in state junior-squash Facebook groups;
   message clubs in VIC/NSW/QLD with the link.
6. Watch attribution: `link_clicks` rows for
   `label = event:australian-junior-squash-championships-accommodation`
   and `utm_campaign` in the booking engine's referral data.

**Definition of done** is met when the page is published on the real
domain, crawlable, and clicks are flowing through the tracked link —
everything after that is outreach, not plumbing.
