import Link from 'next/link';
import {
  getThread,
  listBookings,
  listProperties,
  lodgifyConfigured,
  type LodgifyBooking,
  type LodgifyProperty,
  type Thread,
} from '@/lib/lodgify';
import { fmtMoney, fmtShort, statusStyle } from '@/lib/pms';
import { PropertyThumb, SourceLogo } from '@/components/PmsBits';
import { replyToGuest } from './actions';

export const revalidate = 0;

const FILTERS = ['All', 'Booked', 'Open', 'Tentative', 'Declined'] as const;

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    booking?: string;
    sent?: string;
    sendError?: string;
    debug?: string;
  }>;
}) {
  const { status = 'All', booking: bookingParam, sent, sendError, debug } = await searchParams;
  const configured = lodgifyConfigured();

  let bookings: LodgifyBooking[] = [];
  let properties: LodgifyProperty[] = [];
  let loadError: string | null = null;
  if (configured) {
    try {
      [bookings, properties] = await Promise.all([listBookings({ max: 200 }), listProperties()]);
    } catch (err) {
      loadError = (err as Error).message;
    }
  }
  const propById = new Map(properties.map((p) => [p.id, p]));
  const shown = bookings
    .filter((b) => status === 'All' || b.status.toLowerCase() === status.toLowerCase())
    .sort((a, b) => (b.createdAt ?? b.arrival).localeCompare(a.createdAt ?? a.arrival));

  const selected =
    bookings.find((b) => String(b.id) === bookingParam) ?? shown[0] ?? null;
  const selectedProp =
    selected?.propertyId != null ? propById.get(selected.propertyId) : undefined;

  let thread: Thread | null = null;
  let threadError: string | null = null;
  if (selected?.threadUid) {
    try {
      thread = await getThread(selected.threadUid);
    } catch (err) {
      threadError = (err as Error).message;
    }
  }

  const query = (over: Record<string, string | null>) => {
    const p = new URLSearchParams();
    if (status !== 'All') p.set('status', status);
    if (selected) p.set('booking', String(selected.id));
    for (const [k, v] of Object.entries(over)) {
      if (v == null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return s ? `/reservations?${s}` : '/reservations';
  };

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <h1 className="display-lg" style={{ marginBottom: 8 }}>Reservations</h1>
        <p className="caption" style={{ maxWidth: 620, color: 'var(--ink-mute)' }}>
          Every booking and enquiry from Lodgify — pick one to see the details and message the
          guest, straight back through the channel they booked on.
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
      {sent && (
        <div className="card" style={{ padding: '12px 18px', marginBottom: 18, background: '#e7f5ec', borderColor: '#b5ddc4' }}>
          <span className="caption" style={{ color: '#1e7d43' }}>Message sent.</span>
        </div>
      )}
      {sendError && (
        <div className="card" style={{ padding: '12px 18px', marginBottom: 18, background: '#fdecea', borderColor: '#e8b0ab' }}>
          <span className="caption" style={{ color: '#b3261e' }}>Send failed: {sendError}</span>
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

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(280px, 380px) 1fr', alignItems: 'start' }}>
        {/* reservation list */}
        <section className="card" style={{ padding: '4px 0', maxHeight: '75vh', overflowY: 'auto' }}>
          {shown.length === 0 ? (
            <p className="caption" style={{ color: 'var(--ink-mute)', padding: '14px 18px' }}>
              {configured ? 'No reservations match this filter.' : 'Reservations appear once Lodgify is connected.'}
            </p>
          ) : (
            shown.map((b) => {
              const pill = statusStyle(b.status);
              const prop = b.propertyId != null ? propById.get(b.propertyId) : undefined;
              const active = b.id === selected?.id;
              return (
                <Link
                  key={b.id}
                  href={query({ booking: String(b.id), sent: null, sendError: null })}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: active ? 'var(--canvas-soft)' : 'transparent',
                    borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
                  }}
                >
                  <PropertyThumb url={prop?.imageUrl} name={prop?.name ?? b.propertyName ?? '·'} size={48} />
                  <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 3 }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span className="micro-cap" style={{ padding: '1px 8px', borderRadius: 999, ...pill }}>{b.status}</span>
                      <span style={{ flex: 1 }} />
                      <span className="micro-cap tnum" style={{ color: 'var(--ink-mute)' }}>
                        {b.createdAt ? fmtShort(b.createdAt) : ''}
                      </span>
                    </span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span className="caption" style={{ fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.guestName}
                      </span>
                      <span className="caption tnum" style={{ color: 'var(--primary-deep)' }}>{fmtMoney(b.totalAmount, b.currency)}</span>
                    </span>
                    <span className="micro-cap" style={{ color: 'var(--ink-mute)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <SourceLogo source={b.source} size={13} />
                      {fmtShort(b.arrival)} – {fmtShort(b.departure)} · {b.nights}n · {b.adults || '–'} guests
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </section>

        {/* reservation card + conversation */}
        <section className="card" style={{ padding: 22 }}>
          {!selected ? (
            <p className="caption" style={{ color: 'var(--ink-mute)' }}>Select a reservation.</p>
          ) : (
            <>
              <div className="card" style={{ padding: 18, marginBottom: 18, background: 'var(--canvas-soft)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="micro-cap" style={{ padding: '2px 8px', borderRadius: 999, ...statusStyle(selected.status) }}>{selected.status}</span>
                    <h2 className="heading-md" style={{ margin: '8px 0 2px' }}>{selected.guestName}</h2>
                    <p className="micro-cap" style={{ color: 'var(--ink-mute)' }}>
                      {selected.adults || '–'} guests · {selected.nights} nights
                      {selected.source ? `, from ${selected.source}` : ''}
                      <br />
                      Reservation ID: {selected.id}
                      {selected.guestEmail ? <><br />{selected.guestEmail}</> : null}
                      {selected.guestPhone ? <><br />{selected.guestPhone}</> : null}
                    </p>
                  </div>
                  <SourceLogo source={selected.source} size={26} />
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '14px 0', paddingTop: 14, borderTop: '1px solid var(--hairline)' }}>
                  <PropertyThumb url={selectedProp?.imageUrl} name={selectedProp?.name ?? selected.propertyName ?? '·'} size={44} />
                  <div style={{ minWidth: 0 }}>
                    <div className="caption" style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedProp?.name ?? selected.propertyName ?? '—'}
                    </div>
                    {selected.propertyId != null && (
                      <div className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Rental Id: {selected.propertyId}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24, paddingTop: 14, borderTop: '1px solid var(--hairline)', flexWrap: 'wrap' }}>
                  <div>
                    <div className="caption tnum" style={{ fontWeight: 500 }}>{fmtShort(selected.arrival)}</div>
                    <div className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Check-in</div>
                  </div>
                  <div>
                    <div className="caption tnum" style={{ fontWeight: 500 }}>{fmtShort(selected.departure)}</div>
                    <div className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Check-out</div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ textAlign: 'right' }}>
                    <div className="micro-cap tnum" style={{ color: 'var(--ink-mute)' }}>
                      Due {fmtMoney(Math.max(0, (selected.totalAmount ?? 0) - (selected.amountPaid ?? 0)), selected.currency)}
                      {' · '}Paid {fmtMoney(selected.amountPaid ?? 0, selected.currency)}
                    </div>
                    <div className="caption tnum" style={{ fontWeight: 600, fontSize: 16 }}>
                      {fmtMoney(selected.totalAmount, selected.currency)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10, marginBottom: 18, maxHeight: '40vh', overflowY: 'auto' }}>
                {!selected.threadUid ? (
                  <p className="caption" style={{ color: 'var(--ink-mute)' }}>
                    Lodgify has no message thread for this reservation yet.
                  </p>
                ) : threadError ? (
                  <p className="caption" style={{ color: '#b3261e' }}>Couldn&apos;t load the thread: {threadError}</p>
                ) : !thread || thread.messages.length === 0 ? (
                  <p className="caption" style={{ color: 'var(--ink-mute)' }}>No messages yet — start the conversation below.</p>
                ) : (
                  thread.messages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        justifySelf: m.isInbound ? 'start' : 'end',
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: 'var(--r-md)',
                        background: m.isInbound ? 'var(--canvas-soft)' : 'var(--primary-deep)',
                        color: m.isInbound ? 'inherit' : '#fff',
                      }}
                    >
                      {m.subject && <div className="micro-cap" style={{ opacity: 0.75, marginBottom: 3 }}>{m.subject}</div>}
                      <div className="caption" style={{ color: 'inherit', whiteSpace: 'pre-wrap' }}>{m.message}</div>
                      <div className="micro-cap" style={{ opacity: 0.6, marginTop: 4 }}>
                        {m.createdAt
                          ? new Date(m.createdAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : ''}
                        {debug === '1' && ` · ${m.kind ?? 'no type field'} · ${m.isInbound ? 'guest' : 'us'}`}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {debug === '1' && thread && (
                <pre className="caption" style={{ maxHeight: 260, overflow: 'auto', background: 'var(--canvas-soft)', padding: 12, borderRadius: 'var(--r-md)', marginBottom: 18, fontSize: 11 }}>
                  {JSON.stringify(thread.raw, null, 2)}
                </pre>
              )}

              {selected.threadUid && (
                <form action={replyToGuest} style={{ display: 'grid', gap: 10 }}>
                  <input type="hidden" name="bookingId" value={selected.id} />
                  <input type="hidden" name="threadUid" value={selected.threadUid ?? ''} />
                  <textarea
                    name="message"
                    required
                    rows={3}
                    placeholder={`Reply to ${selected.guestName}…`}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--r-md)',
                      border: '1px solid var(--hairline)',
                      background: 'var(--canvas)',
                      font: 'inherit',
                      fontSize: 14,
                      resize: 'vertical',
                    }}
                  />
                  <button
                    type="submit"
                    className="caption"
                    style={{
                      justifySelf: 'end',
                      padding: '8px 22px',
                      borderRadius: 999,
                      border: 'none',
                      background: 'var(--primary-deep)',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Send
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>

      <footer className="caption" style={{ paddingTop: 32, color: 'var(--ink-mute)' }}>
        Showing {shown.length} of {bookings.length} reservations synced from Lodgify.
      </footer>
    </>
  );
}
