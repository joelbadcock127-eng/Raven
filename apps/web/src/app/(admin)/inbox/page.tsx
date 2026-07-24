import Link from 'next/link';
import {
  getThread,
  listBookings,
  lodgifyConfigured,
  type LodgifyBooking,
  type Thread,
} from '@/lib/lodgify';
import { fmtMoney, fmtShort, statusStyle } from '@/lib/pms';
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
  let loadError: string | null = null;
  if (configured) {
    try {
      bookings = await listBookings({ max: 100 });
    } catch (err) {
      loadError = (err as Error).message;
    }
  }
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
              return (
                <Link
                  key={b.id}
                  href={`/inbox?booking=${b.id}`}
                  style={{
                    display: 'grid',
                    gap: 4,
                    padding: '12px 22px',
                    background: active ? 'var(--canvas-soft)' : 'transparent',
                    borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
                  }}
                >
                  <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span className="caption" style={{ fontWeight: 500, flex: 1 }}>{b.guestName}</span>
                    <span className="micro-cap" style={{ padding: '1px 7px', borderRadius: 999, ...pill }}>{b.status}</span>
                  </span>
                  <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>
                    {b.propertyName ?? '—'} · {fmtShort(b.arrival)} – {fmtShort(b.departure)}
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
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 6 }}>
                <h2 className="heading-md" style={{ flex: 1 }}>{selected.guestName}</h2>
                <span className="caption tnum" style={{ color: 'var(--primary-deep)' }}>
                  {fmtMoney(selected.totalAmount, selected.currency)}
                </span>
              </div>
              <p className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 16 }}>
                {selected.propertyName ?? '—'} · {fmtShort(selected.arrival)} – {fmtShort(selected.departure)} ·{' '}
                {selected.nights} nights · {selected.adults || '–'} guests
                {selected.source ? ` · via ${selected.source}` : ''} · Booking #{selected.id}
                {selected.guestEmail ? ` · ${selected.guestEmail}` : ''}
                {selected.guestPhone ? ` · ${selected.guestPhone}` : ''}
              </p>

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
