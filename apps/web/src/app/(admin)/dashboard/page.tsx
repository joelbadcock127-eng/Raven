import Link from 'next/link';
import {
  listBookings,
  listProperties,
  lodgifyConfigured,
  type LodgifyBooking,
  type LodgifyProperty,
} from '@/lib/lodgify';
import { bucketStays, fmtShort, fmtMoney, isoPlusDays, statusStyle, todayIso } from '@/lib/pms';
import { SourceLogo } from '@/components/PmsBits';

export const revalidate = 0;

function StayRow({ b, propName }: { b: LodgifyBooking; propName: string | null }) {
  const pill = statusStyle(b.status);
  return (
    <Link
      href={`/reservations?booking=${b.id}`}
      style={{ display: 'grid', gap: 3, padding: '10px 0', borderBottom: '1px solid var(--hairline)' }}
    >
      <span style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span className="micro-cap" style={{ padding: '2px 8px', borderRadius: 999, ...pill }}>{b.status}</span>
        <span className="caption" style={{ fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.guestName}</span>
        <span className="caption tnum" style={{ color: 'var(--primary-deep)' }}>{fmtMoney(b.totalAmount, b.currency)}</span>
      </span>
      <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <SourceLogo source={b.source} size={13} />
        <span className="caption tnum">{fmtShort(b.arrival)} – {fmtShort(b.departure)}</span>
        <span className="micro-cap tnum" style={{ color: 'var(--ink-mute)' }}>{b.adults || '–'} guests</span>
        <span className="micro-cap" style={{ color: 'var(--ink-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
          {propName ?? ''}
        </span>
      </span>
    </Link>
  );
}

export default async function PmsDashboardPage() {
  const configured = lodgifyConfigured();
  let bookings: LodgifyBooking[] = [];
  let properties: LodgifyProperty[] = [];
  let loadError: string | null = null;
  if (configured) {
    try {
      [bookings, properties] = await Promise.all([
        listBookings({ max: 100, stayFrom: todayIso(), stayTo: isoPlusDays(30) }),
        listProperties(),
      ]);
    } catch (err) {
      loadError = (err as Error).message;
    }
  }
  const propById = new Map(properties.map((p) => [p.id, p]));
  const nameOf = (b: LodgifyBooking) =>
    (b.propertyId != null ? propById.get(b.propertyId)?.name : null) ?? b.propertyName;

  const { arrivals, departures, staying } = bucketStays(bookings);
  // Balance outstanding on confirmed stays only — enquiries aren't money owed.
  const due = bookings
    .filter((b) => b.status.toLowerCase() === 'booked')
    .reduce((n, b) => n + Math.max(0, (b.totalAmount ?? 0) - (b.amountPaid ?? 0)), 0);

  const tiles = [
    { v: String(arrivals.length), l: 'arrivals · next 30d' },
    { v: String(departures.length), l: 'departures · next 30d' },
    { v: String(staying.length), l: 'currently staying' },
    { v: fmtMoney(due, 'AUD'), l: 'balance due · booked stays, next 30d' },
  ];

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <h1 className="display-lg" style={{ marginBottom: 8 }}>Dashboard</h1>
        <p className="caption" style={{ maxWidth: 620, color: 'var(--ink-mute)' }}>
          The PMS view, live from Lodgify: confirmed arrivals, departures and in-house guests over
          the next 30 days. Enquiries and requests live on the Reservations tab.
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
            ['Next arrivals', arrivals, 'Booked arrivals in the next 30 days appear here.'],
            ['Next departures', departures, 'Booked departures in the next 30 days appear here.'],
            ['Currently staying', staying, 'Guests in-house right now appear here.'],
          ] as const
        ).map(([title, list, empty]) => (
          <section key={title} className="card" style={{ padding: 22 }}>
            <h2 className="heading-md" style={{ marginBottom: 10 }}>{title} ({list.length})</h2>
            {list.length === 0 ? (
              <p className="caption" style={{ color: 'var(--ink-mute)' }}>{empty}</p>
            ) : (
              list.slice(0, 8).map((b) => <StayRow key={`${title}-${b.id}`} b={b} propName={nameOf(b)} />)
            )}
          </section>
        ))}
      </div>
    </>
  );
}
