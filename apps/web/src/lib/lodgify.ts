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

export function lodgifyConfigured(): boolean {
  return !!process.env.LODGIFY_API_KEY;
}

async function lodgifyFetch<T>(
  path: string,
  retries = 3,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const key = process.env.LODGIFY_API_KEY;
  if (!key) throw new Error('LODGIFY_API_KEY is not set');
  for (let attempt = 0; ; attempt++) {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    const res = await fetch(`${BASE}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        'X-ApiKey': key,
        accept: 'application/json',
        ...(init?.body != null ? { 'content-type': 'application/json' } : {}),
      },
      body: init?.body != null ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(25_000),
      cache: 'no-store',
    });
    if (res.ok && res.status === 204) return undefined as T;
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

/* ── PMS: bookings ─────────────────────────────────────────────── */

export interface LodgifyBooking {
  id: number;
  status: string; // Open | Booked | Tentative | Declined ...
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  arrival: string; // yyyy-mm-dd
  departure: string;
  nights: number;
  adults: number;
  propertyId: number | null;
  propertyName: string | null;
  source: string | null; // Airbnb, Manual, BookingCom, ...
  totalAmount: number | null;
  amountPaid: number | null;
  currency: string | null;
  threadUid: string | null; // messaging thread guid
  createdAt: string | null;
}

function normaliseBooking(b: Json): LodgifyBooking {
  const guest = b?.guest ?? {};
  const rooms: Json[] = b?.rooms ?? [];
  const people =
    Number(b?.people ?? 0) ||
    rooms.reduce((n, r) => n + Number(r?.people ?? r?.guest_breakdown?.adults ?? 0), 0);
  const arrival = String(b?.arrival ?? '').slice(0, 10);
  const departure = String(b?.departure ?? '').slice(0, 10);
  const nights = arrival && departure
    ? Math.max(0, Math.round((Date.parse(departure) - Date.parse(arrival)) / 86_400_000))
    : 0;
  return {
    id: Number(b?.id),
    status: String(b?.status ?? 'Unknown'),
    guestName: String(guest?.name ?? guest?.guest_name ?? 'Guest'),
    guestEmail: guest?.email != null ? String(guest.email) : null,
    guestPhone: guest?.phone != null ? String(guest.phone) : null,
    arrival,
    departure,
    nights,
    adults: people,
    propertyId: b?.property_id != null ? Number(b.property_id) : null,
    propertyName: b?.property_name != null ? String(b.property_name) : null,
    source: b?.source != null ? String(b.source) : null,
    totalAmount: b?.total_amount != null ? Number(b.total_amount) : null,
    amountPaid: b?.amount_paid != null ? Number(b.amount_paid) : null,
    currency: b?.currency_code != null ? String(b.currency_code) : null,
    threadUid: b?.thread_uid != null ? String(b.thread_uid) : null,
    createdAt: b?.created_at != null ? String(b.created_at) : null,
  };
}

/**
 * List bookings, newest first. Paginates until `max` items or the account
 * runs out. Optional stay-period window keeps dashboard/calendar calls light.
 */
export async function listBookings(opts?: {
  max?: number;
  stayFrom?: string; // filter: stays overlapping [stayFrom, stayTo]
  stayTo?: string;
}): Promise<LodgifyBooking[]> {
  const max = opts?.max ?? 100;
  const out: LodgifyBooking[] = [];
  for (let page = 1; out.length < max && page <= 10; page++) {
    const params = new URLSearchParams({
      page: String(page),
      size: String(Math.min(50, max - out.length)),
      includeCount: 'false',
      includeTransactions: 'false',
      includeQuoteDetails: 'false',
    });
    if (opts?.stayFrom && opts?.stayTo) {
      params.set('stayFilter', 'Overlap');
      params.set('periodStart', opts.stayFrom);
      params.set('periodEnd', opts.stayTo);
    }
    const data = await lodgifyFetch<Json>(`/v2/reservations/bookings?${params}`);
    const items: Json[] = Array.isArray(data) ? data : (data?.items ?? []);
    if (!items.length) break;
    out.push(...items.map(normaliseBooking));
    if (items.length < 50) break;
  }
  return out;
}

export async function getBooking(id: number): Promise<LodgifyBooking> {
  const data = await lodgifyFetch<Json>(`/v2/reservations/bookings/${id}`);
  return normaliseBooking(data);
}

/* ── PMS: messaging ────────────────────────────────────────────── */

export interface ThreadMessage {
  id: string;
  subject: string | null;
  message: string;
  isInbound: boolean; // true = from the guest
  createdAt: string | null;
}

export interface Thread {
  uid: string;
  subject: string | null;
  messages: ThreadMessage[];
}

/** Fetch one messaging thread by its guid (booking.threadUid). */
export async function getThread(threadUid: string): Promise<Thread> {
  const data = await lodgifyFetch<Json>(`/v2/messaging/${encodeURIComponent(threadUid)}`);
  const rawMessages: Json[] = data?.messages ?? data?.items ?? [];
  const messages: ThreadMessage[] = rawMessages.map((m: Json, i: number) => ({
    id: String(m?.id ?? m?.uid ?? i),
    subject: m?.subject != null ? String(m.subject) : null,
    message: String(m?.message ?? m?.body ?? m?.text ?? ''),
    isInbound: m?.type != null ? String(m.type).toLowerCase().includes('guest') : Boolean(m?.is_inbound ?? m?.inbound),
    createdAt: m?.date_created ?? m?.created_at ?? null,
  }));
  return {
    uid: String(data?.uid ?? data?.thread_uid ?? threadUid),
    subject: data?.subject != null ? String(data.subject) : null,
    messages,
  };
}

/**
 * Reply to a guest on a booking. Lodgify's public write surface for messaging
 * lives on v1; we try the booking-scoped endpoint first, then the thread one.
 * Verify against the live account — errors bubble up to the inbox UI.
 */
export async function sendGuestMessage(
  bookingId: number,
  threadUid: string | null,
  message: string,
): Promise<void> {
  const payload = [{ subject: '', message, type: 'Owner' }];
  try {
    await lodgifyFetch(`/v1/reservation/booking/${bookingId}/messages`, 1, {
      method: 'POST',
      body: payload,
    });
    return;
  } catch (err) {
    if (!threadUid) throw err;
  }
  await lodgifyFetch(`/v1/reservation/booking/${bookingId}/messages/${encodeURIComponent(threadUid!)}`, 1, {
    method: 'POST',
    body: payload,
  });
}
