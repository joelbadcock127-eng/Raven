# Raven

**A booking-generation platform for short-term accommodation.** Raven finds accommodation demand, identifies empty dates, and turns those opportunities into direct bookings for three Tasmanian properties: **Ten Fifty Bakers**, **The Prescription Pad**, and **Annie May**.

<img src="assets/logo/raven-logo.svg" alt="Raven" width="360">

> Full brief: [`docs/Raven_Product_Build_Brief.pdf`](docs/Raven_Product_Build_Brief.pdf) · Design system: [`docs/DESIGN.md`](docs/DESIGN.md)

## What Raven is (and isn't)

Raven is **not** a property-management system. Lodgify continues to own bookings, calendars, availability, channel management and guest messaging. Raven sits alongside it and owns:

- Event intelligence
- Opportunity recommendations
- Property websites and SEO pages
- Marketing campaigns
- Occupancy-gap activation

## The five core modules

| # | Module | Purpose | Status |
|---|--------|---------|--------|
| 1 | **Event Monitor** | Discovers and scores dates likely to generate accommodation demand | 🚧 In progress — `packages/event-monitor` |
| 2 | Opportunity Feed | Turns signals into clear, prioritised actions for the owner | Planned |
| 3 | Website Builder | Runs all property websites and generates targeted event pages | Planned |
| 4 | Campaign Generator | Creates coordinated content around each booking opportunity | Planned |
| 5 | Occupancy Gap Finder | Finds vacant nights and triggers the best response | Planned |

## Architecture (target)

One multi-tenant **Vercel** deployment serving all three custom domains · **Supabase** for content, users, events and media · **Lodgify** as the booking source of truth (server-side API calls only, well below rate limits, cached + queued) · **Raven admin** for editing, approval and publishing.

Key rules from the brief:

- Every generated output (pages, campaigns, prices) is a **starting point** — always editable and approval-led before publication.
- Score opportunities **separately per property** (demand 25% · location 20% · guest fit 25% · inventory 20% · stay fit 10%) and explain why the others ranked lower.
- Annie May is **room-level inventory** (7 separately bookable rooms) — never collapse it into one unit.
- Lodgify is authoritative for final price and sellable dates; stale cached data may only be shown when labelled.

## The three properties

| | Ten Fifty Bakers | The Prescription Pad | Annie May |
|---|---|---|---|
| Where | Bakers Beach (~30 min from Devonport) | Shearwater (~20 min from Devonport) | Central Devonport |
| Model | Whole property, up to 10 guests | Whole property, up to 10 guests | 7 individually bookable ensuite rooms, adults only |
| Sweet spot | Nature/wellness escapes, romantic weekends, multi-night groups | Families, milestone weekends, sporting groups | Devonport events, business travel, couples, Spirit of Tasmania stopovers |
| Avoid | Short city events, one-night overflow | Solo travellers, couples | Family-with-children campaigns |

## Repository layout

```
docs/                     Product brief (PDF) + DESIGN.md (Stripe-style design tokens)
assets/logo/              Brand assets
packages/event-monitor/   Module 1 — event scraper + per-property opportunity scoring
supabase/migrations/      Database schema (applied once Supabase is connected)
```

## Design language

All UI follows [`docs/DESIGN.md`](docs/DESIGN.md): Stripe-inspired — indigo `#533afd` primary, deep-navy ink `#0d253d`, Inter at weight 300 with negative tracking for display type, tabular figures for money, pill buttons, gradient-mesh heroes.

## Development

```bash
cd packages/event-monitor
npm install
npm run scrape          # run all sources, print scored opportunities
npm run scrape -- --json out/events.json
```
