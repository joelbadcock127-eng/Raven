import type { RawEvent } from '../types.js';
import type { EventSource } from './base.js';

/**
 * Calendar-driven demand: Tasmanian public holidays, long weekends and
 * school-holiday blocks. These aren't scraped — they're known dates that
 * reliably move accommodation demand (brief, section 05).
 *
 * NOTE: dates below are the published/expected 2026–27 dates and should be
 * re-verified each year during onboarding (esp. TAS school term dates).
 */

interface Holiday {
  name: string;
  date: string; // yyyy-mm-dd
  regional?: string;
  longWeekend?: boolean;
}

const PUBLIC_HOLIDAYS: Holiday[] = [
  { name: "New Year's Day", date: '2026-01-01' },
  { name: 'Australia Day', date: '2026-01-26', longWeekend: true },
  { name: 'Eight Hours Day', date: '2026-03-09', longWeekend: true },
  { name: 'Good Friday / Easter', date: '2026-04-03', longWeekend: true },
  { name: 'Easter Monday', date: '2026-04-06', longWeekend: true },
  { name: 'Anzac Day', date: '2026-04-25' },
  { name: "King's Birthday", date: '2026-06-08', longWeekend: true },
  { name: 'Recreation Day (Northern Tasmania)', date: '2026-11-02', regional: 'North Tas', longWeekend: true },
  { name: 'Devonport Show Day', date: '2026-11-27', regional: 'Devonport', longWeekend: true },
  { name: 'Christmas Day', date: '2026-12-25' },
  { name: 'Boxing Day', date: '2026-12-26' },
  { name: "New Year's Day", date: '2027-01-01', longWeekend: true },
  { name: 'Australia Day', date: '2027-01-26' },
  { name: 'Eight Hours Day', date: '2027-03-08', longWeekend: true },
  { name: 'Good Friday / Easter', date: '2027-03-26', longWeekend: true },
  { name: 'Easter Monday', date: '2027-03-29', longWeekend: true },
];

/** Approximate TAS school holiday blocks (verify against education.tas.gov.au). */
const SCHOOL_HOLIDAYS: Array<{ name: string; start: string; end: string }> = [
  { name: 'TAS school holidays — autumn break', start: '2026-04-11', end: '2026-04-26' },
  { name: 'TAS school holidays — winter break', start: '2026-07-04', end: '2026-07-19' },
  { name: 'TAS school holidays — spring break', start: '2026-09-26', end: '2026-10-11' },
  { name: 'TAS school holidays — summer break', start: '2026-12-18', end: '2027-02-03' },
];

export const tasCalendar: EventSource = {
  name: 'tas-calendar',
  async fetchEvents(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    for (const h of PUBLIC_HOLIDAYS) {
      events.push({
        source: 'tas-calendar',
        sourceUrl: 'https://worksafe.tas.gov.au/topics/laws-and-compliance/public-holidays',
        title: `${h.name}${h.regional ? ` (${h.regional})` : ''} — public holiday${h.longWeekend ? ' long weekend' : ''}`,
        description: h.longWeekend
          ? 'Long weekend: elevated leisure demand for 2–3 night stays.'
          : 'Public holiday: elevated short-stay leisure demand.',
        startDate: h.date,
        endDate: h.date,
        locality: h.regional ?? 'Tasmania',
      });
    }
    for (const s of SCHOOL_HOLIDAYS) {
      events.push({
        source: 'tas-calendar',
        sourceUrl: 'https://www.education.tas.gov.au/parents-carers/term-dates/',
        title: s.name,
        description:
          'School holiday block: strong family and group demand, multi-night stays. Dates approximate — verify each year.',
        startDate: s.start,
        endDate: s.end,
        locality: 'Tasmania',
      });
    }
    return events;
  },
};
