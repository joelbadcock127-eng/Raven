/**
 * Lodgify v2 client — server-side only, per the brief (section 10-12):
 * throttled well below the published 750 req/min ceiling, exponential
 * backoff honouring Retry-After, all calls behind Raven's backend.
 *
 * NOTE: response shapes are normalised defensively; verify against the
 * live account on first sync (use /api/sync/availability?dryRun=1).
 */

const BASE = 'https://api.lodgify.com';
const MIN_INTERVAL_MS = 600; // ~100 req/min max — far below limits
let lastRequestAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function lodgifyFetch<T>(path: string, retries = 3): Promise<T> {
  const key = process.env.LODGIFY_API_KEY;
  if (!key) throw new Error('LODGIFY_API_KEY is not set');
  for (let attempt = 0; ; attempt++) {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'X-ApiKey': key, accept: 'application/json' },
      signal: AbortSignal.timeout(25_000),
      cache: 'no-store',
    });
    if (res.ok) return (await res.json()) as T;
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const retryAfter = Number(res.headers.get('retry-after')) * 1000 || 0;
      await sleep(Math.max(retryAfter, 2 ** attempt * 2000));
      continue;
    }
    throw new Error(`Lodgify HTTP ${res.status} for ${path}: ${(await res.text()).slice(0, 300)}`);
  }
}

export interface LodgifyProperty {
  id: number;
  name: string;
  rooms: Array<{ id: number; name: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export async function listProperties(): Promise<LodgifyProperty[]> {
  const data = await lodgifyFetch<Json>('/v2/properties?includeCount=false&includeInOut=false');
  const items: Json[] = Array.isArray(data) ? data : (data?.items ?? []);
  return items.map((p) => ({
    id: Number(p.id),
    name: String(p.name ?? ''),
    rooms: (p.rooms ?? p.room_types ?? []).map((r: Json) => ({
      id: Number(r.id),
      name: String(r.name ?? ''),
    })),
  }));
}

export interface AvailabilityPeriod {
  start: string; // yyyy-mm-dd
  end: string;
  available: boolean;
  roomTypeId?: number;
}

/** Availability calendar for one property over [start, end]. */
export async function getAvailability(
  propertyId: number,
  start: string,
  end: string,
): Promise<AvailabilityPeriod[]> {
  const data = await lodgifyFetch<Json>(
    `/v2/availability/${propertyId}?start=${start}&end=${end}&includeDetails=false`,
  );
  const entries: Json[] = Array.isArray(data) ? data : [data];
  const out: AvailabilityPeriod[] = [];
  for (const entry of entries) {
    const roomTypeId = entry?.room_type_id ?? entry?.roomTypeId;
    for (const p of entry?.periods ?? []) {
      out.push({
        start: String(p.start).slice(0, 10),
        end: String(p.end).slice(0, 10),
        available: p.available === 1 || p.available === true,
        roomTypeId: roomTypeId != null ? Number(roomTypeId) : undefined,
      });
    }
  }
  return out;
}

/** Raw passthrough for the dry-run diagnostic endpoint. */
export async function raw(path: string): Promise<Json> {
  return lodgifyFetch<Json>(path);
}
