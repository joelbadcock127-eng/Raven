import Link from 'next/link';
import { listBookings, lodgifyConfigured, type LodgifyBooking } from '@/lib/lodgify';
import { fmtMoney, fmtShort, statusStyle } from '@/lib/pms';

export const revalidate = 0;

const FILTERS = ['All', 'Booked', 'Open', 'Tentative', 'Declined'] as const;

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = 'All' } = await searchParams;
  const configured = lodgifyConfigured();
  let bookings: LodgifyBooking[] = [];
  let loadError: string | null = null;
  if (configured) {
    try {
      bookings = await listBookings({ max: 200 });
    } catch (err) {
      loadError = (err as Error).message;
    }
  }
  const shown = bookings
    .filter((b) => status === 'All' || b.status.toLowerCase() === status.toLowerCase())
    .sort((a, b) => (b.createdAt ?? b.arrival).localeCompare(a.createdAt ?? a.arrival));

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <h1 className="display-lg" style={{ marginBottom: 8 }}>Reservations</h1>
        <p className="caption" style={{ maxWidth: 620, color: 'var(--ink-mute)' }}>
          Every booking and enquiry from Lodgify, newest first. Open one to message the guest from
          the Inbox.
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

      <nav style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => {
          const active = f === status || (f === 'All' && !FILTERS.includes(status as (typeof FILTERS)[number]));
          return (
            <Link
              key={f}
              href={f === 'All' ? '/reservations' : `/reservations?status=${f}`}
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
              {f}
            </Link>
          );
        })}
      </nav>

      <section className="card" style={{ padding: '8px 22px' }}>
        {shown.length === 0 ? (
          <p className="caption" style={{ color: 'var(--ink-mute)', padding: '14px 0' }}>
            {configured ? 'No reservations match this filter.' : 'Reservations appear once Lodgify is connected.'}
          </p>
        ) : (
          shown.map((b) => {
            const pill = statusStyle(b.status);
            return (
              <Link
                key={b.id}
                href={b.threadUid ? `/inbox?booking=${b.id}` : `/reservations?status=${status}`}
                style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', padding: '12px 0', borderBottom: '1px solid var(--hairline)' }}
              >
                <span className="micro-cap" style={{ padding: '2px 8px', borderRadius: 999, ...pill }}>{b.status}</span>
                <span className="caption" style={{ fontWeight: 500, minWidth: 140, flex: 1 }}>{b.guestName}</span>
                <span className="caption" style={{ color: 'var(--ink-mute)', minWidth: 150 }}>{b.propertyName ?? '—'}</span>
                <span className="caption tnum">{fmtShort(b.arrival)} – {fmtShort(b.departure)}</span>
                <span className="caption tnum" style={{ color: 'var(--ink-mute)' }}>{b.nights}n · {b.adults || '–'} guests</span>
                <span className="micro-cap" style={{ color: 'var(--ink-mute)', width: 70 }}>{b.source ?? ''}</span>
                <span className="caption tnum" style={{ color: 'var(--primary-deep)', width: 80, textAlign: 'right' }}>{fmtMoney(b.totalAmount, b.currency)}</span>
              </Link>
            );
          })
        )}
      </section>

      <footer className="caption" style={{ paddingTop: 32, color: 'var(--ink-mute)' }}>
        Showing {shown.length} of {bookings.length} reservations synced from Lodgify.
      </footer>
    </>
  );
}
