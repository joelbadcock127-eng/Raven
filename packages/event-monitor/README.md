# @raven/event-monitor — Module 1

Discovers events and dates likely to generate accommodation demand, then scores each one **separately per property** using the brief's model: demand 25% · location 20% · guest fit 25% · inventory 20% · stay fit 10%.

## Sources (no APIs, polite scraping)

| Source | Method | What it yields |
|---|---|---|
| `tas-calendar` | Built-in dataset | TAS public holidays, long weekends, school-holiday blocks (2026–27; verify yearly) |
| `devonport-council` | Listing → detail pages → schema.org JSON-LD | Devonport events with full dates, venues, addresses |
| `eventbrite` | Public search pages → schema.org ItemList JSON-LD | Devonport + Launceston region events with geo coordinates |

All HTTP goes through `politeFetch`: per-host throttling (1 req / 1.5 s), retries with exponential backoff, `Retry-After` honoured — the same safeguard philosophy the brief requires for Lodgify.

## Run

```bash
npm install
npm run scrape                          # all sources, top opportunities to stdout
npm run scrape -- --source tas-calendar # one source
npm run scrape -- --json out/events.json --days 120
```

## Output

Each opportunity names the recommended property, shows its score and explains why the others ranked lower (feed rule from the brief), e.g.

```
🔴 [78.5] Devonport Jazz
   2026-07-23 → 2026-07-26 · in 6 days · Devonport · tags: music, festival
   best: Annie May (78.5) · others: The Prescription Pad 55.2 · Ten Fifty Bakers 41.0
   why: Demand: event type historically drives visitor demand; runs 4 days | Location: ~1 km from Annie May | ...
```

## Next steps

- Upsert into Supabase (`supabase/migrations/0001_event_monitor.sql` is ready) once the account is connected.
- Add sources: Spirit of Tasmania sailings, paranaple arts centre, Discover Tasmania, cruise-ship schedules.
- Blend in Lodgify availability so scores react to real vacancy (inventory pillar).
- Optional AI pass (Claude) to refine tags, estimate attendance and write the "why this property" copy.
