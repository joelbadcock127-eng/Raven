import Link from 'next/link';
import {
  getAvailability,
  listBookings,
  listProperties,
  lodgifyConfigured,
  type LodgifyBooking,
  type LodgifyProperty,
} from '@/lib/lodgify';
import { todayIso } from '@/lib/pms';

export const revalidate = 0;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Available days render empty — colour only marks booked/blocked.
const STATUS_BG = {
  available: 'var(--canvas)',
  booked: '#f4b9b3',
  blocked: '#e6e6e6',
} as const;

function monthLabel(ym: string): string {
  return new Date(ym + '-01T00:00:00').toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function daysInMonth(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
}

/** Monday-based column index (0–6) for a yyyy-mm-dd date. */
function weekday(date: string): number {
  return (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; property?: string }>;
}) {
  const { month: monthParam, property: propertyParam } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? '') ? monthParam! : todayIso().slice(0, 7);
  const days = daysInMonth(month);
  const first = days[0];
  const last = days[days.length - 1];
  const today = todayIso();

  const configured = lodgifyConfigured();
  let properties: LodgifyProperty[] = [];
  let bookings: LodgifyBooking[] = [];
  const booked = new Map<number, Set<string>>(); // propertyId → unavailable dates
  let loadError: string | null = null;

  if (configured) {
    try {
      [properties, bookings] = await Promise.all([
        listProperties(),
        listBookings({ max: 200, stayFrom: first, stayTo: last }),
      ]);
      const availability = await Promise.all(
        properties.map((p) => getAvailability(p.id, first, last)),
      );
      properties.forEach((p, i) => {
        const set = new Set<string>();
        for (const period of availability[i]) {
          if (period.available) continue;
          const d = new Date(period.start + 'T00:00:00Z');
          const end = new Date(period.end + 'T00:00:00Z');
          while (d <= end) {
            set.add(d.toISOString().slice(0, 10));
            d.setUTCDate(d.getUTCDate() + 1);
          }
        }
        booked.set(p.id, set);
      });
    } catch (err) {
      loadError = (err as Error).message;
    }
  }

  const selectedId = Number(propertyParam);
  const selected = properties.find((p) => p.id === selectedId) ?? null;
  const shown = selected ? [selected] : properties;

  const guestOn = (propertyId: number, date: string): string | null => {
    const b = bookings.find(
      (x) =>
        x.propertyId === propertyId &&
        x.arrival <= date &&
        x.departure > date &&
        x.status.toLowerCase() === 'booked',
    );
    return b ? b.guestName : null;
  };

  const statusOn = (propertyId: number, date: string): keyof typeof STATUS_BG => {
    if (!(booked.get(propertyId) ?? new Set()).has(date)) return 'available';
    return guestOn(propertyId, date) ? 'booked' : 'blocked';
  };

  const calHref = (over: { month?: string; property?: number | null }) => {
    const p = new URLSearchParams();
    const m = over.month ?? month;
    const prop = over.property === undefined ? (selected?.id ?? null) : over.property;
    if (m !== todayIso().slice(0, 7) || over.month) p.set('month', m);
    if (prop != null) p.set('property', String(prop));
    const s = p.toString();
    return s ? `/calendar?${s}` : '/calendar';
  };

  // Leading blanks so day 1 lands on its weekday column (Monday start).
  const cells: (string | null)[] = [...Array(weekday(first)).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const navBtn: React.CSSProperties = {
    padding: '6px 12px',
    border: '1px solid var(--hairline)',
    borderRadius: 'var(--r-md)',
  };

  return (
    <>
      <header style={{ marginBottom: 18, display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <h1 className="display-lg" style={{ flex: 1 }}>Calendar</h1>
        <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href={calHref({ month: shiftMonth(month, -1) })} className="caption" style={navBtn}>←</Link>
          <span className="heading-md" style={{ minWidth: 160, textAlign: 'center' }}>{monthLabel(month)}</span>
          <Link href={calHref({ month: shiftMonth(month, 1) })} className="caption" style={navBtn}>→</Link>
          <Link href={calHref({ month: todayIso().slice(0, 7) })} className="caption" style={navBtn}>Today</Link>
        </nav>
      </header>

      {!configured && (
        <div className="card" style={{ padding: '12px 18px', marginBottom: 18, background: '#fff8e1', borderColor: '#e8d9a0' }}>
          <span className="caption" style={{ color: '#8a6410' }}>
            Set LODGIFY_API_KEY in the environment to switch on the PMS tabs.
          </span>
        </div>
      )}
      {loadError && (
        <div className="card" style={{ padding: '12px 18px', marginBottom: 18, background: '#fdecea', borderColor: '#e8b0ab' }}>
          <span className="caption" style={{ color: '#b3261e' }}>Lodgify error: {loadError}</span>
        </div>
      )}

      {properties.length > 0 && (
        <nav style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {[null, ...properties].map((p) => {
            const active = (p?.id ?? null) === (selected?.id ?? null);
            return (
              <Link
                key={p?.id ?? 'all'}
                href={calHref({ property: p?.id ?? null })}
                className="caption"
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid var(--hairline)',
                  background: active ? 'var(--canvas-soft)' : 'transparent',
                  color: active ? 'var(--primary-deep)' : 'var(--ink-secondary)',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {p?.name ?? 'All rentals'}
              </Link>
            );
          })}
        </nav>
      )}

      <section className="card" style={{ padding: 22 }}>
        {properties.length === 0 ? (
          <p className="caption" style={{ color: 'var(--ink-mute)' }}>
            {configured ? 'No rentals found on the Lodgify account.' : 'The availability grid appears once Lodgify is connected.'}
          </p>
        ) : (
          <div style={{ minWidth: 700, overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {WEEKDAYS.map((w) => (
                <div key={w} className="micro-cap" style={{ textAlign: 'center', color: 'var(--ink-mute)', padding: '2px 0 6px' }}>
                  {w}
                </div>
              ))}
              {cells.map((d, i) =>
                d == null ? (
                  <div key={`blank-${i}`} />
                ) : (
                  <div
                    key={d}
                    style={{
                      minHeight: selected ? 76 : 24 + shown.length * 22,
                      border: '1px solid var(--hairline)',
                      borderRadius: 'var(--r-md)',
                      padding: 6,
                      display: 'grid',
                      gap: 4,
                      alignContent: 'start',
                      outline: d === today ? '2px solid var(--primary-deep)' : 'none',
                      outlineOffset: -2,
                      background: selected ? STATUS_BG[statusOn(selected.id, d)] : 'var(--canvas)',
                    }}
                  >
                    <span
                      className="micro-cap tnum"
                      style={{ fontWeight: d === today ? 700 : 400, color: d === today ? 'var(--primary-deep)' : 'var(--ink-mute)' }}
                    >
                      {Number(d.slice(8))}
                    </span>
                    {shown.map((p) => {
                      const status = statusOn(p.id, d);
                      const guest = status === 'booked' ? guestOn(p.id, d) : null;
                      if (selected) {
                        // Whole cell already carries the colour; just name the guest.
                        return guest ? (
                          <span key={p.id} className="micro-cap" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {guest}
                          </span>
                        ) : status === 'blocked' ? (
                          <span key={p.id} className="micro-cap" style={{ color: 'var(--ink-mute)' }}>blocked</span>
                        ) : null;
                      }
                      // Available days stay empty — a quiet cell means free.
                      if (status === 'available') return null;
                      return (
                        <span
                          key={p.id}
                          title={`${p.name} · ${d} · ${guest ?? status}`}
                          className="micro-cap"
                          style={{
                            display: 'block',
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: STATUS_BG[status],
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {guest ?? p.name}
                        </span>
                      );
                    })}
                  </div>
                ),
              )}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
          {(Object.entries(STATUS_BG) as [string, string][]).map(([label, bg]) => (
            <span key={label} className="micro-cap" style={{ color: 'var(--ink-mute)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, background: bg, border: '1px solid var(--hairline)', display: 'inline-block', borderRadius: 3 }} />
              {label}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
