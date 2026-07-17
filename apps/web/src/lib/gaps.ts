/**
 * Occupancy Gap Finder (Module 5, "detect" stage): find runs of vacant
 * nights that are bounded by bookings or close enough to matter.
 */

export interface Gap {
  start: string;
  end: string; // inclusive last vacant night
  nights: number;
  kind: 'isolated-night' | 'short-gap' | 'empty-weekend' | 'long-gap';
}

const DAY_MS = 86_400_000;

export function findGaps(nights: Map<string, boolean>, horizonDays = 90): Gap[] {
  const dates = [...nights.keys()].sort();
  const gaps: Gap[] = [];
  let runStart: string | null = null;
  let prev: string | null = null;

  const today = Date.now();
  const flush = (endDate: string) => {
    if (!runStart) return;
    const nightsCount = Math.round((Date.parse(endDate) - Date.parse(runStart)) / DAY_MS) + 1;
    const withinHorizon = (Date.parse(runStart) - today) / DAY_MS <= horizonDays;
    if (withinHorizon && nightsCount >= 1) {
      gaps.push({ start: runStart, end: endDate, nights: nightsCount, kind: classify(runStart, nightsCount) });
    }
    runStart = null;
  };

  for (const date of dates) {
    if (nights.get(date)) {
      if (!runStart) runStart = date;
      prev = date;
    } else {
      if (prev) flush(prev);
      prev = null;
    }
  }
  if (prev) flush(prev);
  return gaps;
}

function classify(start: string, nights: number): Gap['kind'] {
  if (nights === 1) return 'isolated-night';
  if (nights <= 4) {
    const dow = new Date(start + 'T12:00:00Z').getUTCDay();
    if (dow === 5 && nights <= 3) return 'empty-weekend'; // starts Friday
    return 'short-gap';
  }
  return 'long-gap';
}
