import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Computed demand signals — deterministic calendar + live weather logic.
 * No AI involved: each signal becomes an `events` row (source 'signal'),
 * static per-property scores, and an opportunity, so the feed and the
 * campaign pipeline treat them exactly like scraped events.
 */

interface Signal {
  key: string;             // stable id fragment
  title: string;
  description: string;
  start: string;           // yyyy-mm-dd
  end: string;
  tags: string[];
  demand: number;          // 0-100
  summary: string;         // owner-facing one-liner
  sourceUrl: string;
  /** property → score 0-100 (missing = 40) */
  fit: Record<string, number>;
  rationale: string[];
}

const P = { TFB: 'ten-fifty-bakers', RX: 'prescription-pad', AM: 'annie-may' } as const;

/* ── School holidays (verify each year — Dept for Education TAS / VIC) ── */
const TAS_HOLIDAYS: Array<[string, string, string]> = [
  ['2026-07-04', '2026-07-19', 'TAS winter school holidays'],
  ['2026-09-26', '2026-10-11', 'TAS spring school holidays'],
  ['2026-12-18', '2027-02-03', 'TAS summer school holidays'],
  ['2027-04-10', '2027-04-25', 'TAS autumn school holidays'],
];
// Victorian holidays drive ferry traffic — half the ferry queue is VIC plates.
const VIC_HOLIDAYS: Array<[string, string, string]> = [
  ['2026-06-27', '2026-07-12', 'VIC winter school holidays'],
  ['2026-09-19', '2026-10-04', 'VIC spring school holidays'],
  ['2026-12-19', '2027-01-27', 'VIC summer school holidays'],
  ['2027-04-01', '2027-04-18', 'VIC autumn school holidays'],
];

/* ── Seasonal wildlife/nature windows (recurring every year) ── */
const SEASONAL: Array<{
  startMD: string; endMD: string; title: string; description: string;
  tags: string[]; demand: number; summary: string; fit: Record<string, number>; rationale: string[];
}> = [
  {
    startMD: '09-01', endMD: '03-31',
    title: 'Little penguin season — Lillico Beach',
    description: 'Little penguins come ashore at dusk at the Lillico Beach viewing platform, minutes west of Devonport. Free, ranger-attended in peak weeks, best after sunset.',
    tags: ['nature-walking', 'family'],
    demand: 55,
    summary: 'Penguins at Lillico pull families and nature travellers to the Devonport coast all season — an easy add-on night for any stay.',
    fit: { [P.TFB]: 70, [P.RX]: 65, [P.AM]: 60 },
    rationale: ['Dusk wildlife within 20–30 min of every property', 'Strong family and nature-traveller draw'],
  },
  {
    startMD: '03-01', endMD: '05-31',
    title: 'Autumn wildlife at Narawntapu',
    description: 'Mild dusk temperatures bring wombats, Forester kangaroos and wallabies onto the Narawntapu plains — the reason the park gets called the Serengeti of Tasmania.',
    tags: ['nature-walking', 'wellness'],
    demand: 50,
    summary: 'Peak wildlife viewing on Ten Fifty’s doorstep — sell the three-night wildlife package.',
    fit: { [P.TFB]: 85, [P.RX]: 45, [P.AM]: 40 },
    rationale: ['Narawntapu borders Ten Fifty Bakers', 'Best wombat/kangaroo viewing months'],
  },
  {
    startMD: '09-20', endMD: '10-10',
    title: 'Shearwaters return to the coast',
    description: 'Short-tailed shearwaters return from the north Pacific to their coastal rookeries in late September — a spectacle over the water at dusk around Port Sorell and the north coast.',
    tags: ['nature-walking', 'community'],
    demand: 35,
    summary: 'The town of Shearwater’s namesake birds come home — a neat local-story hook for spring stays.',
    fit: { [P.RX]: 70, [P.TFB]: 55, [P.AM]: 40 },
    rationale: ['Port Sorell / Shearwater coast is the viewing area', 'Great content-page story'],
  },
  {
    startMD: '10-01', endMD: '11-30',
    title: 'Spring wildflowers and orchids',
    description: 'Native orchids and coastal wildflowers peak across Narawntapu and the private trails through October and November.',
    tags: ['nature-walking', 'wellness'],
    demand: 40,
    summary: 'Wildflower season on 20 km of private trails — shoulder-season filler for midweek stays.',
    fit: { [P.TFB]: 80, [P.RX]: 45, [P.AM]: 35 },
    rationale: ['80+ native plant species on the Ten Fifty property', 'Shoulder-season demand builder'],
  },
  {
    startMD: '06-01', endMD: '08-31',
    title: 'Winter dark-sky season',
    description: 'Longest, darkest, clearest nights of the year — prime Milky Way and aurora-watching conditions away from town lights.',
    tags: ['wellness', 'romantic'],
    demand: 45,
    summary: 'Dark-sky winter nights are the sauna-and-stars pitch — fill cold midweeks with the winter wellness offer.',
    fit: { [P.TFB]: 80, [P.AM]: 45, [P.RX]: 40 },
    rationale: ['Zero light pollution at Bakers Beach', 'Pairs with sauna/outdoor-bath winter offer'],
  },
];

function overlapsHorizon(start: string, end: string, today: string, horizon: string): boolean {
  return end >= today && start <= horizon;
}

/** Expand recurring month-day windows into dated windows within the horizon. */
function seasonalWindows(today: string, horizon: string): Signal[] {
  const years = [Number(today.slice(0, 4)) - 1, Number(today.slice(0, 4)), Number(today.slice(0, 4)) + 1];
  const out: Signal[] = [];
  for (const s of SEASONAL) {
    for (const y of years) {
      const start = `${y}-${s.startMD}`;
      // window may cross new year
      const endYear = s.endMD < s.startMD ? y + 1 : y;
      const end = `${endYear}-${s.endMD}`;
      if (!overlapsHorizon(start, end, today, horizon)) continue;
      out.push({
        key: `${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${start}`,
        title: s.title,
        description: s.description,
        start, end,
        tags: s.tags,
        demand: s.demand,
        summary: s.summary,
        sourceUrl: 'https://parks.tas.gov.au/explore-our-parks/narawntapu-national-park',
        fit: s.fit,
        rationale: s.rationale,
      });
    }
  }
  return out;
}

function holidaySignals(today: string, horizon: string): Signal[] {
  const out: Signal[] = [];
  for (const [start, end, label] of TAS_HOLIDAYS) {
    if (!overlapsHorizon(start, end, today, horizon)) continue;
    out.push({
      key: `school-tas-${start}`,
      title: label,
      description: 'Tasmanian school holidays — families travelling within the state, grandparents hosting, regional attractions busy. Dates approximate: confirm against the Department for Education calendar.',
      start, end,
      tags: ['school-holiday', 'family'],
      demand: 60,
      summary: 'Tasmanian families on the move — family-friendly packages and multi-night stays convert best.',
      sourceUrl: 'https://www.decyp.tas.gov.au/about-us/term-dates/',
      fit: { [P.RX]: 80, [P.TFB]: 65, [P.AM]: 30 },
      rationale: ['Family travel peaks', 'Prescription Pad is built for family groups', 'Annie May is adults-only — caution'],
    });
  }
  for (const [start, end, label] of VIC_HOLIDAYS) {
    if (!overlapsHorizon(start, end, today, horizon)) continue;
    out.push({
      key: `ferry-vic-${start}`,
      title: `Ferry surge — ${label}`,
      description: 'Victorian school holidays fill the Spirit of Tasmania with family cars. Evening sailings dock in Devonport around 6:30pm; many arrivals want a first-night stay near the terminal. Dates approximate: confirm against the VIC school calendar.',
      start, end,
      tags: ['school-holiday', 'family', 'cruise'],
      demand: 65,
      summary: 'Ferry-borne mainland families arriving in Devonport — the late-ferry first-night package sells itself this fortnight.',
      sourceUrl: 'https://www.spiritoftasmania.com.au/',
      fit: { [P.AM]: 75, [P.RX]: 75, [P.TFB]: 50 },
      rationale: ['Devonport is the ferry port', 'First/last-night stays near the terminal', 'Family cars head to beaches and parks'],
    });
  }
  return out;
}

/* ── Live weather windows (Open-Meteo, no key needed) ── */
async function weatherSignals(
  today: string,
  props: Array<{ id: string; lat: number; lon: number }>,
): Promise<Signal[]> {
  const tfb = props.find((p) => p.id === P.TFB) ?? { lat: -41.16, lon: 146.6 };
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${tfb.lat}&longitude=${tfb.lon}` +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,cloud_cover_mean' +
    '&forecast_days=14&timezone=Australia%2FHobart';
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[]; cloud_cover_mean?: number[] };
  };
  const d = data.daily;
  if (!d?.time?.length) return [];

  const out: Signal[] = [];
  for (let i = 0; i < d.time.length; i++) {
    const date = d.time[i];
    if (date <= today) continue;
    const dow = new Date(date + 'T12:00:00').getDay();

    // Clear warm weekend → walking/beach window (Fri that starts a dry, mild Fri-Sun run)
    if (dow === 5 && i + 2 < d.time.length) {
      const dry = [i, i + 1, i + 2].every((j) => (d.precipitation_sum[j] ?? 99) < 2);
      const mild = [i, i + 1, i + 2].every((j) => (d.temperature_2m_max[j] ?? 0) >= 15);
      if (dry && mild) {
        out.push({
          key: `weather-clear-weekend-${date}`,
          title: 'Clear weekend forecast — walking weather',
          description: `Forecast dry with daytime highs above 15°C from ${date} across the weekend at Bakers Beach — prime conditions for the trails, the beach and outdoor everything.`,
          start: date,
          end: d.time[i + 2],
          tags: ['nature-walking', 'long-weekend'],
          demand: 55,
          summary: 'A dry, mild weekend is forecast — push last-minute weekend availability now, while people are planning.',
          sourceUrl: 'https://open-meteo.com/',
          fit: { [P.TFB]: 80, [P.RX]: 65, [P.AM]: 45 },
          rationale: ['Dry Fri–Sun forecast', 'Short-lead bookings respond to good forecasts'],
        });
      }
    }

    // Cold clear winter nights → sauna/dark-sky window (2+ crisp clear nights)
    const month = Number(date.slice(5, 7));
    if (month >= 5 && month <= 9 && i + 1 < d.time.length) {
      const crisp = [i, i + 1].every(
        (j) => (d.temperature_2m_min[j] ?? 99) <= 4 && (d.precipitation_sum[j] ?? 99) < 1 && (d.cloud_cover_mean?.[j] ?? 100) <= 40,
      );
      if (crisp) {
        out.push({
          key: `weather-crisp-nights-${date}`,
          title: 'Cold clear nights forecast — sauna & stars',
          description: `Forecast near-freezing, clear nights from ${date} — the exact conditions the barrel sauna, hot outdoor baths and dark-sky fire nights were made for.`,
          start: date,
          end: d.time[i + 1],
          tags: ['wellness', 'romantic'],
          demand: 50,
          summary: 'Crisp clear nights incoming — the winter sauna pitch lands hardest with a real forecast behind it.',
          sourceUrl: 'https://open-meteo.com/',
          fit: { [P.TFB]: 85, [P.AM]: 45, [P.RX]: 35 },
          rationale: ['Clear sub-4° nights forecast', 'Sauna/bath/aurora content writes itself'],
        });
        break; // one crisp-nights signal per run is enough
      }
    }
  }
  return out;
}

function priorityFor(demand: number): 'high' | 'medium' | 'low' {
  return demand >= 65 ? 'high' : demand >= 45 ? 'medium' : 'low';
}

export async function computeSignals(supabase: SupabaseClient): Promise<{ upserted: number; skipped: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 200 * 86400_000).toISOString().slice(0, 10);

  const { data: props } = await supabase.from('properties').select('id, lat, lon');
  const properties = (props ?? []) as Array<{ id: string; lat: number; lon: number }>;
  const propertyIds = properties.length ? properties.map((p) => p.id) : Object.values(P);

  const signals: Signal[] = [
    ...holidaySignals(today, horizon),
    ...seasonalWindows(today, horizon),
    ...(await weatherSignals(today, properties).catch(() => [] as Signal[])),
  ];

  let upserted = 0;
  let skipped = 0;
  for (const s of signals) {
    const id = `sig-${s.key}`;
    const now = new Date().toISOString();

    const { error: evErr } = await supabase.from('events').upsert(
      {
        id,
        source: 'signal',
        source_url: s.sourceUrl,
        title: s.title,
        description: s.description,
        start_date: s.start,
        end_date: s.end,
        locality: 'Devonport / Bakers Beach region',
        tags: s.tags,
        ai_demand: s.demand,
        ai_summary: s.summary,
        ai_enriched_at: now, // computed — skip the AI enrich pass entirely
        last_seen_at: now,
        last_checked_at: now,
      },
      { onConflict: 'id' },
    );
    if (evErr) { skipped++; continue; }

    const best = propertyIds.reduce((a, b) => ((s.fit[a] ?? 40) >= (s.fit[b] ?? 40) ? a : b));
    await supabase.from('event_scores').upsert(
      propertyIds.map((pid) => ({
        event_id: id,
        property_id: pid,
        total: s.fit[pid] ?? 40,
        demand: Math.round(s.demand / 4),
        location: 15,
        guest_fit: Math.round((s.fit[pid] ?? 40) / 4),
        inventory: 12,
        stay_fit: 8,
        rationale: s.rationale,
        scored_at: now,
      })),
      { onConflict: 'event_id,property_id' },
    );

    // one opportunity per event; never resurrect a dismissed one
    const { data: existing } = await supabase
      .from('opportunities')
      .select('id')
      .eq('event_id', id)
      .maybeSingle();
    if (!existing) {
      await supabase.from('opportunities').insert({
        event_id: id,
        recommended_property_id: best,
        priority: priorityFor(Math.max(...propertyIds.map((pid) => s.fit[pid] ?? 40))),
        status: 'new',
      });
    }
    upserted++;
  }
  return { upserted, skipped };
}
