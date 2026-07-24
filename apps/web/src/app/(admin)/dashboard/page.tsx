import Link from 'next/link';
import { listBookings, lodgifyConfigured, type LodgifyBooking } from '@/lib/lodgify';
import { bucketStays, fmtShort, fmtMoney, isoPlusDays, statusStyle, todayIso } from '@/lib/pms';

export const revalidate = 0;

function StayRow({ b }: { b: LodgifyBooking }) {
  const pill = statusStyle(b.status);
  return (
    <Link
      href={b.threadUid ? `/inbox?booking=${b.id}` : `/reservations`}
      style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', padding: '10px 0', borderBottom: '1px solid var(--hairline)' }}
    >
      <span className="micro-cap" style={{ padding: '2px 8px', borderRadius: 999, ...pill }}>{b.status}</span>
      <span className="caption" style={{ fontWeight: 500, flex: 1, minWidth: 120 }}>{b.guestName}</span>
      <span className="caption" style={{ color: 'var(--ink-mute)', minWidth: 140 }}>{b.propertyName ?? '—'}</span>
      <span className="caption tnum">{fmtShort(b.arrival)} – {fmtShort(b.departure)}</span>
      <span className="caption tnum" style={{ color: 'var(--ink-mute)' }}>{b.adults || '–'} guests</span>
      <span className="caption tnum" style={{ color: 'var(--primary-deep)' }}>{fmtMoney(b.totalAmount, b.currency)}</span>
    </Link>
  );
}

export default async function PmsDashboardPage() {
  const configured = lodgifyConfigured();
  let bookings: LodgifyBooking[] = [];
  let loadError: string | null = null;
  if (configured) {
    try {
      bookings = await listBookings({ max: 100, stayFrom: todayIso(), stayTo: isoPlusDays(30) });
    } catch (err) {
      loadError = (err as Error).message;
    }
  }
  const { arrivals, departures, staying } = bucketStays(bookings);
  const due = bookings.reduce((n, b) => n + Math.max(0, (b.totalAmount ?? 0) - (b.amountPaid ?? 0)), 0);

  const tiles = [
    { v: String(arrivals.length), l: 'arrivals · next 30d' },
    { v: String(departures.length), l: 'departures · next 30d' },
    { v: String(staying.length), l: 'currently staying' },
    { v: fmtMoney(due, 'AUD'), l: 'balance due · next 30d' },
  ];

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <h1 className="display-lg" style={{ marginBottom: 8 }}>Dashboard</h1>
        <p className="caption" style={{ maxWidth: 620, color: 'var(--ink-mute)' }}>
          The PMS view, live from Lodgify: who&apos;s arriving, who&apos;s leaving and who&apos;s in-house
          across the next 30 days.
        </p>
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

      <section style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        {tiles.map((t) => (
          <div key={t.l} className="card" style={{ padding: '16px 22px', minWidth: 150 }}>
            <div className="tnum" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.1 }}>{t.v}</div>
            <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginTop: 5 }}>{t.l}</div>
          </div>
        ))}
      </section>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', alignItems: 'start' }}>
        {(
          [
            ['Next arrivals', arrivals, 'Arrivals in the next 30 days appear here.'],
            ['Next departures', departures, 'Departures in the next 30 days appear here.'],
            ['Currently staying', staying, 'Guests in-house right now appear here.'],
          ] as const
        ).map(([title, list, empty]) => (
          <section key={title} className="card" style={{ padding: 22 }}>
            <h2 className="heading-md" style={{ marginBottom: 10 }}>{title} ({list.length})</h2>
            {list.length === 0 ? (
              <p className="caption" style={{ color: 'var(--ink-mute)' }}>{empty}</p>
            ) : (
              list.slice(0, 8).map((b) => <StayRow key={`${title}-${b.id}`} b={b} />)
            )}
          </section>
        ))}
      </div>
    </>
  );
}
