import { createHash } from 'node:crypto';
import type { EventTag, NormalizedEvent, RawEvent } from './types.js';

const TAG_KEYWORDS: Array<[EventTag, RegExp]> = [
  ['festival', /festival|fest\b|agfest|expo/i],
  ['music', /music|concert|gig|band|jazz|blues|orchestra|choir|dj\b/i],
  ['sports', /sport|match|tournament|marathon|triathlon|race|cup\b|league|basketball|football|cricket|netball|jackjumpers|athletic|swim|cycling|golf/i],
  ['conference', /conference|summit|symposium|convention|agm\b|forum/i],
  ['business', /business|networking|workshop|seminar|training|masterclass/i],
  ['community', /community|neighbourhood|council|volunteer|fundrais/i],
  ['family', /family|kids|children|all ages|school holiday program|discovery day/i],
  ['wellness', /wellness|yoga|breathwork|meditation|retreat|mindful|sauna|spa\b/i],
  ['nature-walking', /walk|hike|trail|wildlife|nature|bird|garden|arboretum|national park/i],
  ['food-wine', /food|wine|beer|whisky|distill|dining|degustation|taste|farmers market|long lunch/i],
  ['arts', /art\b|arts|gallery|exhibition|theatre|film|cinema|craft|museum|heritage/i],
  ['wedding-milestone', /wedding|anniversary|birthday|reunion|celebration|milestone/i],
  ['market', /market|twilight market|makers/i],
  ['romantic', /romantic|couples|valentine|date night/i],
  ['funeral', /funeral|memorial service|celebration of life|in loving memory/i],
  ['cruise', /cruise|spirit of tasmania|ship/i],
  ['school-holiday', /school holiday/i],
  ['public-holiday', /public holiday/i],
  ['long-weekend', /long weekend/i],
];

export function inferTags(text: string): EventTag[] {
  const tags = TAG_KEYWORDS.filter(([, re]) => re.test(text)).map(([t]) => t);
  return tags.length ? tags : ['community'];
}

function toIsoDate(s: string): string {
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`Unparseable date: ${s}`);
  return d.toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
}

export function normalizeEvent(raw: RawEvent, today: string): NormalizedEvent | null {
  let start: string;
  let end: string;
  try {
    start = toIsoDate(raw.startDate);
    end = raw.endDate ? toIsoDate(raw.endDate) : start;
  } catch {
    return null;
  }
  if (end < start) end = start;
  const daysUntil = daysBetween(today, start);
  const tagSource = `${raw.title} ${raw.description ?? ''} ${raw.venueName ?? ''}`;
  // Facts only: keep a short factual snippet for classification — Raven never
  // republishes a source's article text; AI writes original copy from facts.
  const snippet = raw.description
    ? raw.description.replace(/\s+/g, ' ').trim().slice(0, 280) || undefined
    : undefined;
  const id = createHash('sha256')
    .update(`${raw.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${start}|${raw.locality ?? raw.venueName ?? ''}`)
    .digest('hex')
    .slice(0, 16);
  return {
    id,
    source: raw.source,
    sourceUrl: raw.sourceUrl,
    title: raw.title,
    description: snippet,
    start,
    end,
    days: daysBetween(start, end) + 1,
    daysUntil,
    venueName: raw.venueName,
    address: raw.address,
    locality: raw.locality,
    lat: raw.lat,
    lon: raw.lon,
    url: raw.url,
    image: raw.image,
    organiser: raw.organiser,
    ticketUrl: raw.ticketUrl,
    tags: inferTags(tagSource),
  };
}

/** Dedupe by id (title+date+place hash); prefer entries with more detail. */
export function dedupe(events: NormalizedEvent[]): NormalizedEvent[] {
  const byId = new Map<string, NormalizedEvent>();
  for (const e of events) {
    const existing = byId.get(e.id);
    if (!existing || richness(e) > richness(existing)) byId.set(e.id, e);
  }
  return [...byId.values()];
}

function richness(e: NormalizedEvent): number {
  return [e.description, e.address, e.lat, e.image, e.url].filter(Boolean).length;
}
