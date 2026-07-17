/**
 * Push a scrape run into Supabase via PostgREST.
 * Usage:  npm run scrape -- --json out/events.json && npm run sync -- out/events.json
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).
 */
import { readFileSync } from 'node:fs';
import type { Opportunity } from './types.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example)');
  process.exit(1);
}

async function upsert(table: string, rows: unknown[], onConflict: string) {
  if (!rows.length) return;
  const res = await fetch(`${url}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: {
      apikey: key!,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status} — ${await res.text()}`);
  console.log(`  upserted ${rows.length} rows into ${table}`);
}

async function main() {
  const file = process.argv[2] ?? 'out/events.json';
  const { opportunities } = JSON.parse(readFileSync(file, 'utf8')) as {
    opportunities: Opportunity[];
  };

  await upsert(
    'events',
    opportunities.map(({ event: e }) => ({
      id: e.id,
      source: e.source,
      source_url: e.sourceUrl,
      title: e.title,
      description: e.description ?? null,
      start_date: e.start,
      end_date: e.end,
      venue_name: e.venueName ?? null,
      address: e.address ?? null,
      locality: e.locality ?? null,
      lat: e.lat ?? null,
      lon: e.lon ?? null,
      url: e.url ?? null,
      image: e.image ?? null,
      organiser: e.organiser ?? null,
      ticket_url: e.ticketUrl ?? null,
      tags: e.tags,
      last_seen_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
    })),
    'id',
  );

  await upsert(
    'event_scores',
    opportunities.flatMap((o) =>
      o.scores.map((s) => ({
        event_id: o.event.id,
        property_id: s.propertyId,
        total: s.total,
        demand: s.breakdown.demand,
        location: s.breakdown.location,
        guest_fit: s.breakdown.guestFit,
        inventory: s.breakdown.inventory,
        stay_fit: s.breakdown.stayFit,
        rationale: s.rationale,
        scored_at: new Date().toISOString(),
      })),
    ),
    'event_id,property_id',
  );

  console.log(`Synced ${opportunities.length} opportunities to Supabase.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
