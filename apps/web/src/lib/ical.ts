/**
 * Minimal iCal (ICS) parser for booking calendars (Preno export for Annie May).
 * Extracts VEVENT DTSTART/DTEND as booked date ranges. DTEND is exclusive
 * per RFC 5545 for DATE values — i.e. checkout day, which suits nightly
 * availability directly.
 */

export interface BookedRange {
  start: string; // yyyy-mm-dd inclusive (check-in)
  end: string;   // yyyy-mm-dd exclusive (check-out)
  summary?: string;
}

function parseIcsDate(v: string): string | null {
  const m = v.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function parseIcs(ics: string): BookedRange[] {
  // Unfold continuation lines (RFC 5545 §3.1)
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');
  const events: BookedRange[] = [];
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    const body = block.split('END:VEVENT')[0];
    const startLine = body.match(/^DTSTART[^:]*:(.+)$/m)?.[1];
    const endLine = body.match(/^DTEND[^:]*:(.+)$/m)?.[1];
    const summary = body.match(/^SUMMARY[^:]*:(.+)$/m)?.[1]?.trim();
    if (!startLine) continue;
    const start = parseIcsDate(startLine);
    let end = endLine ? parseIcsDate(endLine) : null;
    if (!start) continue;
    // STAAH (Annie May's channel) exports each blocked night as its own event
    // with DTSTART == DTEND, which under the RFC exclusive-DTEND rule would be
    // a zero-night event and get dropped. Treat DTEND <= DTSTART (or missing)
    // as a single night; genuine multi-night ranges (DTEND > DTSTART) are kept
    // exclusive as before.
    if (!end || end <= start) {
      const d = new Date(start + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      end = d.toISOString().slice(0, 10);
    }
    events.push({ start, end, summary });
  }
  return events;
}

const ICAL_MIN_INTERVAL_MS = 7000; // Lodgify publishes a 10/min ICS ceiling; be equally polite to Preno
let lastIcalFetch = 0;

export async function fetchBookedRanges(url: string): Promise<BookedRange[]> {
  const wait = lastIcalFetch + ICAL_MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastIcalFetch = Date.now();
  const res = await fetch(url, {
    headers: { 'user-agent': 'RavenAvailabilitySync/0.1' },
    signal: AbortSignal.timeout(25_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`iCal HTTP ${res.status} for ${url}`);
  return parseIcs(await res.text());
}

/** Expand booked ranges into a per-night availability map over [from, to). */
export function toNightlyAvailability(
  booked: BookedRange[],
  from: string,
  to: string,
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  const d = new Date(from + 'T00:00:00Z');
  const endD = new Date(to + 'T00:00:00Z');
  while (d < endD) {
    map.set(d.toISOString().slice(0, 10), true);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  for (const b of booked) {
    const bd = new Date(b.start + 'T00:00:00Z');
    const be = new Date(b.end + 'T00:00:00Z');
    while (bd < be) {
      const key = bd.toISOString().slice(0, 10);
      if (map.has(key)) map.set(key, false);
      bd.setUTCDate(bd.getUTCDate() + 1);
    }
  }
  return map;
}
