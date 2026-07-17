import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { PROPERTIES } from './properties.js';
import { dedupe, normalizeEvent } from './normalize.js';
import { buildOpportunity } from './scoring.js';
import { devonportCouncil } from './sources/devonportCouncil.js';
import { eventbrite } from './sources/eventbrite.js';
import { latrobeCouncil } from './sources/latrobeCouncil.js';
import { tasCalendar } from './sources/tasCalendar.js';
import type { EventSource } from './sources/base.js';
import type { Opportunity } from './types.js';

const SOURCES: EventSource[] = [tasCalendar, devonportCouncil, latrobeCouncil, eventbrite];

interface CliOptions {
  sources: string[];
  json?: string;
  horizonDays: number;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { sources: SOURCES.map((s) => s.name), horizonDays: 180 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--source') opts.sources = argv[++i].split(',');
    else if (argv[i] === '--json') opts.json = argv[++i];
    else if (argv[i] === '--days') opts.horizonDays = Number(argv[++i]);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const today = new Date().toISOString().slice(0, 10);

  const raw = [];
  for (const source of SOURCES.filter((s) => opts.sources.includes(s.name))) {
    console.log(`→ ${source.name}`);
    try {
      const events = await source.fetchEvents();
      console.log(`  ${events.length} raw events`);
      raw.push(...events);
    } catch (err) {
      console.warn(`  ! source failed: ${(err as Error).message}`);
    }
  }

  const normalized = dedupe(
    raw
      .map((r) => normalizeEvent(r, today))
      .filter((e): e is NonNullable<typeof e> => e != null)
      .filter((e) => e.daysUntil >= 0 && e.daysUntil <= opts.horizonDays),
  );

  const opportunities: Opportunity[] = normalized
    .map((e) => buildOpportunity(e, PROPERTIES))
    .sort(
      (a, b) =>
        b.recommended.total - a.recommended.total || a.event.daysUntil - b.event.daysUntil,
    );

  console.log(
    `\n${normalized.length} events within ${opts.horizonDays} days · scored for ${PROPERTIES.length} properties\n`,
  );

  for (const o of opportunities.slice(0, 20)) {
    const e = o.event;
    const flag = o.priority === 'high' ? '🔴' : o.priority === 'medium' ? '🟡' : '⚪';
    console.log(`${flag} [${o.recommended.total}] ${e.title}`);
    console.log(
      `   ${e.start}${e.end !== e.start ? ` → ${e.end}` : ''} · in ${e.daysUntil} days · ${e.venueName ?? e.locality ?? ''} · tags: ${e.tags.join(', ')}`,
    );
    console.log(
      `   best: ${o.recommended.propertyName} (${o.recommended.total}) · others: ${o.scores
        .slice(1)
        .map((s) => `${s.propertyName} ${s.total}`)
        .join(' · ')}`,
    );
    console.log(`   why: ${o.recommended.rationale.slice(0, 3).join(' | ')}\n`);
  }

  if (opts.json) {
    mkdirSync(dirname(opts.json), { recursive: true });
    writeFileSync(
      opts.json,
      JSON.stringify({ generatedAt: new Date().toISOString(), today, opportunities }, null, 2),
    );
    console.log(`Wrote ${opportunities.length} opportunities to ${opts.json}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
