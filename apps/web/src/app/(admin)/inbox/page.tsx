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

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; sent?: string; sendError?: string }>;
}) {
  const { booking: bookingParam, sent, sendError } = await searchParams;
  const configured = lodgifyConfigured();

  let bookings: LodgifyBooking[] = [];
  let properties: LodgifyProperty[] = [];
  let loadError: string | null = null;
  if (configured) {
    try {
      [bookings, properties] = await Promise.all([listBookings({ max: 100 }), listProperties()]);
    } catch (err) {
      loadError = (err as Error).message;
    }
  }
  const propById = new Map(properties.map((p) => [p.id, p]));
  const conversations = bookings
    .filter((b) => b.threadUid)
    .sort((a, b) => (b.createdAt ?? b.arrival).localeCompare(a.createdAt ?? a.arrival));

  const selected =
    conversations.find((b) => String(b.id) === bookingParam) ?? conversations[0] ?? null;

  let thread: Thread | null = null;
  let threadError: string | null = null;
  if (selected?.threadUid) {
    try {
      thread = await getThread(selected.threadUid);
    } catch (err) {
      threadError = (err as Error).message;
    }
  }

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <h1 className="display-lg" style={{ marginBottom: 8 }}>Inbox</h1>
        <p className="caption" style={{ maxWidth: 620, color: 'var(--ink-mute)' }}>
          Guest messaging through Lodgify — one thread per reservation, replies go straight to the
          guest on whichever channel they booked through.
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

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(260px, 340px) 1fr', alignItems: 'start' }}>
        {/* thread list */}
        <section className="card" style={{ padding: '8px 0', maxHeight: '70vh', overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <p className="caption" style={{ color: 'var(--ink-mute)', padding: '14px 22px' }}>
              {configured ? 'No guest conversations yet.' : 'Conversations appear once Lodgify is connected.'}
            </p>
          ) : (
            conversations.map((b) => {
              const active = b.id === selected?.id;
              const pill = statusStyle(b.status);
              const prop = b.propertyId != null ? propById.get(b.propertyId) : undefined;
              return (
                <Link
                  key={b.id}
                  href={`/inbox?booking=${b.id}`}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    padding: '12px 18px',
                    background: active ? 'var(--canvas-soft)' : 'transparent',
                    borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
                  }}
                >
                  <PropertyThumb url={prop?.imageUrl} name={prop?.name ?? b.propertyName ?? '·'} size={42} />
                  <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 3 }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span className="caption" style={{ fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.guestName}
                      </span>
                      <span className="micro-cap" style={{ padding: '1px 7px', borderRadius: 999, ...pill }}>{b.status}</span>
                    </span>
                    <span className="micro-cap" style={{ color: 'var(--ink-mute)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <SourceLogo source={b.source} size={13} />
                      {fmtShort(b.arrival)} – {fmtShort(b.departure)}
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </section>

        {/* conversation + reservation summary */}
        <section className="card" style={{ padding: 22 }}>
          {!selected ? (
            <p className="caption" style={{ color: 'var(--ink-mute)' }}>Select a conversation.</p>
          ) : (
            <>
              {(() => {
                const prop = selected.propertyId != null ? propById.get(selected.propertyId) : undefined;
                const pill = statusStyle(selected.status);
                return (
                  <div className="card" style={{ padding: 18, marginBottom: 18, background: 'var(--canvas-soft)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="micro-cap" style={{ padding: '2px 8px', borderRadius: 999, ...pill }}>{selected.status}</span>
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
                      <PropertyThumb url={prop?.imageUrl} name={prop?.name ?? selected.propertyName ?? '·'} size={44} />
                      <div style={{ minWidth: 0 }}>
                        <div className="caption" style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {prop?.name ?? selected.propertyName ?? '—'}
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
                );
              })()}

              <div style={{ display: 'grid', gap: 10, marginBottom: 18, maxHeight: '42vh', overflowY: 'auto' }}>
                {threadError ? (
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
                      {m.createdAt && (
                        <div className="micro-cap" style={{ opacity: 0.6, marginTop: 4 }}>
                          {new Date(m.createdAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

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
            </>
          )}
        </section>
      </div>
    </>
  );
}
