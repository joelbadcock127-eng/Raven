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

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
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
      for (const p of properties) {
        const set = new Set<string>();
        for (const period of await getAvailability(p.id, first, last)) {
          if (period.available) continue;
          const d = new Date(period.start + 'T00:00:00Z');
          const end = new Date(period.end + 'T00:00:00Z');
          while (d <= end) {
            set.add(d.toISOString().slice(0, 10));
            d.setUTCDate(d.getUTCDate() + 1);
          }
        }
        booked.set(p.id, set);
      }
    } catch (err) {
      loadError = (err as Error).message;
    }
  }

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

  return (
    <>
      <header style={{ marginBottom: 22, display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <h1 className="display-lg" style={{ flex: 1 }}>Calendar</h1>
        <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href={`/calendar?month=${shiftMonth(month, -1)}`} className="caption" style={{ padding: '6px 12px', border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)' }}>←</Link>
          <span className="heading-md" style={{ minWidth: 160, textAlign: 'center' }}>{monthLabel(month)}</span>
          <Link href={`/calendar?month=${shiftMonth(month, 1)}`} className="caption" style={{ padding: '6px 12px', border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)' }}>→</Link>
          <Link href="/calendar" className="caption" style={{ padding: '6px 12px', border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)' }}>Today</Link>
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

      <section className="card" style={{ padding: 22, overflowX: 'auto' }}>
        {properties.length === 0 ? (
          <p className="caption" style={{ color: 'var(--ink-mute)' }}>
            {configured ? 'No rentals found on the Lodgify account.' : 'The availability grid appears once Lodgify is connected.'}
          </p>
        ) : (
          <table style={{ borderCollapse: 'collapse', minWidth: days.length * 34 + 180 }}>
            <thead>
              <tr>
                <th className="micro-cap" style={{ textAlign: 'left', padding: '6px 10px 6px 0', color: 'var(--ink-mute)', position: 'sticky', left: 0, background: 'var(--surface, var(--canvas))' }}>Rental</th>
                {days.map((d) => (
                  <th key={d} className="micro-cap" style={{ padding: 4, fontWeight: d === today ? 700 : 400, color: d === today ? 'var(--primary-deep)' : 'var(--ink-mute)' }}>
                    {Number(d.slice(8))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => {
                const set = booked.get(p.id) ?? new Set();
                return (
                  <tr key={p.id}>
                    <td className="caption" style={{ padding: '6px 10px 6px 0', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', position: 'sticky', left: 0, background: 'var(--surface, var(--canvas))' }}>
                      {p.name}
                    </td>
                    {days.map((d) => {
                      const isBooked = set.has(d);
                      const guest = isBooked ? guestOn(p.id, d) : null;
                      return (
                        <td
                          key={d}
                          title={`${d}${guest ? ` · ${guest}` : isBooked ? ' · blocked' : ' · available'}`}
                          style={{
                            width: 30,
                            height: 30,
                            border: '1px solid var(--hairline)',
                            background: isBooked ? (guest ? '#f4b9b3' : '#e6e6e6') : '#e7f5ec',
                            outline: d === today ? '2px solid var(--primary-deep)' : 'none',
                            outlineOffset: -2,
                          }}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
          {(
            [
              ['#e7f5ec', 'available'],
              ['#f4b9b3', 'booked'],
              ['#e6e6e6', 'blocked'],
            ] as const
          ).map(([bg, label]) => (
            <span key={label} className="micro-cap" style={{ color: 'var(--ink-mute)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, background: bg, border: '1px solid var(--hairline)', display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
