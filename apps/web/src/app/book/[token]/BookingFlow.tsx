'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Lodgify-checkout-style booking flow, payment-free, multi-stay.
 *
 * Built for a tour operator holding dates across a season: each stay is a
 * check-in/check-out pair with its own guest count and room setup, added
 * with "+" beneath the last. Contact details are fixed on the link, so
 * Book Now sends every stay straight into the PMS with nothing charged.
 * The calendar is the point: unavailable nights struck out, tooltip on
 * hover, click (or click-drag) range selection.
 */

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const fmtField = (s: string) => { const d = parse(s); return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`; };
const fmtShort = (s: string) => { const d = parse(s); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0,3)} ${d.getUTCFullYear()}`; };

interface Stay {
  start: string;
  end: string;
  adults: number;
  children: number;
  infants: number;
  customRooms: boolean;
  roomConfig: string;
}

const newStay = (): Stay => ({ start: '', end: '', adults: 2, children: 0, infants: 0, customRooms: false, roomConfig: '' });

interface StayResult { arrival: string; departure: string; ok: boolean; state?: string; bookingId?: number; error?: string }

interface HistoryRow { arrival: string; departure: string; adults: number; children: number; status: string; roomConfig: string | null }

interface Props {
  token: string;
  propertyName: string;
  imageUrl: string | null;
  requireApproval: boolean;
  defaultRoomConfig: string;
}

export default function BookingFlow({ token, propertyName, imageUrl, requireApproval, defaultRoomConfig }: Props) {
  const todayIso = useMemo(() => iso(new Date()), []);
  const [blocked, setBlocked] = useState<Set<string> | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [stays, setStays] = useState<Stay[]>([newStay()]);
  const [active, setActive] = useState(0); // stay index the calendar edits
  const [hover, setHover] = useState('');
  const [calOpen, setCalOpen] = useState(false);
  const [guestsOpenFor, setGuestsOpenFor] = useState(-1);
  const [monthOffset, setMonthOffset] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [results, setResults] = useState<StayResult[] | null>(null);
  const [pendingMode, setPendingMode] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/private-booking/availability?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.blocked) setBlocked(new Set<string>(d.blocked));
        else setLoadError(d.error ?? 'Could not load availability');
        if (Array.isArray(d.history)) setHistory(d.history as HistoryRow[]);
      })
      .catch(() => setLoadError('Could not load availability'));
  }, [token]);

  // Any click outside a popover (or its own trigger) closes it.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.pb-guests')) setGuestsOpenFor(-1);
      if (!t.closest('.pb-cal') && !t.closest('.pb-datefield')) setCalOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  /** nights blocked in Lodgify, plus nights already held by the OTHER stays being built */
  const isBlocked = (d: string, forStay: number) => {
    if (blocked?.has(d)) return true;
    for (let i = 0; i < stays.length; i++) {
      if (i === forStay) continue;
      const s = stays[i];
      if (s.start && s.end && d >= s.start && d < s.end) return true;
    }
    return false;
  };
  const isPast = (d: string) => d <= todayIso;

  const rangeFree = (a: string, b: string, forStay: number) => {
    let d = parse(a);
    const endD = parse(b);
    while (d < endD) {
      if (isBlocked(iso(d), forStay)) return false;
      d = new Date(d.getTime() + DAY_MS);
    }
    return true;
  };

  const nightsOf = (s: Stay) => (s.start && s.end ? Math.round((parse(s.end).getTime() - parse(s.start).getTime()) / DAY_MS) : 0);
  const totalNights = stays.reduce((n, s) => n + nightsOf(s), 0);
  const completeStays = stays.filter((s) => nightsOf(s) > 0);
  const canBook = completeStays.length > 0 && completeStays.length === stays.length;

  const patchStay = (i: number, patch: Partial<Stay>) => setStays((arr) => arr.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const pickDate = (d: string) => {
    if (isPast(d)) return;
    const s = stays[active];
    if (s.start && !s.end && d > s.start && rangeFree(s.start, d, active)) {
      patchStay(active, { end: d });
      setCalOpen(false);
      return;
    }
    if (isBlocked(d, active)) return;
    patchStay(active, { start: d, end: '' });
  };

  const activeStay = stays[active];
  const previewEnd = activeStay?.start && !activeStay.end && hover && hover > activeStay.start && rangeFree(activeStay.start, hover, active) ? hover : '';

  const monthGrid = (offset: number) => {
    const base = new Date();
    const y = base.getFullYear();
    const m = base.getMonth() + offset;
    const first = new Date(Date.UTC(y, m, 1));
    const label = `${MONTHS[first.getUTCMonth()]} ${first.getUTCFullYear()}`;
    const lead = (first.getUTCDay() + 6) % 7;
    const daysIn = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const cells: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysIn; d++) cells.push(iso(new Date(Date.UTC(y, m, d))));
    return { label, cells };
  };

  const submit = async () => {
    if (!canBook || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const r = await fetch('/api/private-booking/book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          stays: completeStays.map((s) => ({
            arrival: s.start,
            departure: s.end,
            adults: s.adults,
            children: s.children,
            infants: s.infants,
            roomConfig: s.customRooms ? s.roomConfig : '',
          })),
        }),
      });
      const d = await r.json();
      if (d.results) {
        setResults(d.results as StayResult[]);
        setPendingMode(d.mode === 'pending');
      } else setSubmitError(d.error ?? 'Something went wrong');
    } catch {
      setSubmitError('Network problem — please try again');
    }
    setSubmitting(false);
  };

  const guestsLabelOf = (s: Stay) => `${s.adults} adult${s.adults === 1 ? '' : 's'}${s.children ? `, ${s.children} child${s.children === 1 ? '' : 'ren'}` : ''}${s.infants ? `, ${s.infants} infant${s.infants === 1 ? '' : 's'}` : ''}`;

  const cellStyle = (d: string): React.CSSProperties => {
    const past = isPast(d);
    const blockedD = isBlocked(d, active);
    const s = activeStay;
    const sel = s && (d === s.start || d === s.end || d === previewEnd);
    const hi = s?.end || previewEnd;
    const mid = !!s?.start && !!hi && d > s.start && d < hi;
    return {
      width: 34, height: 34, lineHeight: '34px', textAlign: 'center', fontSize: 13,
      borderRadius: sel ? 6 : 0,
      cursor: past ? 'default' : 'pointer', userSelect: 'none',
      background: sel ? '#111' : mid ? '#e3e1dc' : 'transparent',
      color: sel ? '#fff' : past || blockedD ? '#b9b6b0' : '#1c1b18',
      textDecoration: !past && blockedD && !sel ? 'line-through' : 'none',
      transition: 'background 0.12s, color 0.12s',
    };
  };

  /* ── done screen ── */
  if (results) {
    const okCount = results.filter((r) => r.ok).length;
    const anyRequested = results.some((r) => r.ok && (pendingMode || r.state === 'requested'));
    const allRequested = results.every((r) => !r.ok || pendingMode || r.state === 'requested');
    return (
      <Shell propertyName={propertyName}>
        <div style={{ maxWidth: 620, margin: '60px auto', padding: '0 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1e7a3c', color: '#fff', fontSize: 30, lineHeight: '64px', margin: '0 auto 20px', animation: 'pbpulse 1.8s ease-out infinite' }}>✓</div>
            <h1 style={{ fontSize: 26, fontWeight: 700 }}>
              {okCount < results.length ? 'Partially booked' : allRequested ? 'Requests received' : anyRequested ? 'Booked — single nights to confirm' : okCount === 1 ? 'Your stay is booked' : 'Your stays are booked'}
            </h1>
          </div>
          <div style={{ background: '#fff', border: '1px solid #eceae6', borderRadius: 14, padding: '8px 22px' }}>
            {results.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '13px 0', borderTop: i ? '1px solid #eceae6' : 'none', fontSize: 14 }}>
                <span>{fmtShort(r.arrival)} → {fmtShort(r.departure)}</span>
                <span style={{ color: r.ok ? '#1c1b18' : '#a33', fontWeight: 600, textAlign: 'right' }}>
                  {r.ok ? (pendingMode || r.state === 'requested' ? 'Requested — we’ll confirm' : 'Booked ✓') : r.error ?? 'Failed'}
                </span>
              </div>
            ))}
          </div>
          <p style={{ color: '#57544e', lineHeight: 1.6, marginTop: 20, textAlign: 'center', fontSize: 14 }}>
            No payment was taken — stays are invoiced directly.
            {anyRequested ? ' Single-night dates are held as requests and confirmed shortly by the property.' : ' The booked dates are now reserved.'}
            {' '}If you need to change any of these dates, just contact us.
          </p>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button
              onClick={() => window.location.reload()}
              style={{ all: 'unset', cursor: 'pointer', background: '#111', color: '#fff', fontSize: 14.5, fontWeight: 600, padding: '12px 32px', borderRadius: 10 }}
            >
              Book more dates
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell propertyName={propertyName}>
      <div ref={wrapRef} className="pb-wrap" style={{ maxWidth: 1060, margin: '0 auto', padding: '28px 20px 120px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>Dates</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
          {/* ── stays column ── */}
          <div style={{ flex: '1 1 520px', minWidth: 300 }}>
            {stays.map((s, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: 18, animation: 'pbfade 0.25s ease' }}>
                {stays.length > 1 && (
                  <div style={{ fontSize: 11.5, color: '#8d8a83', marginBottom: 6 }}>Stay {i + 1}</div>
                )}
                <div className="pb-fieldsrow" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <div className="pb-datefield" style={{ display: 'flex', border: '1px solid ' + (calOpen && active === i ? '#111' : '#d9d6d0'), borderRadius: 8, overflow: 'hidden', background: '#fff', transition: 'border-color 0.15s' }}>
                    <button onClick={() => { setActive(i); setCalOpen(true); setGuestsOpenFor(-1); }} style={{ all: 'unset', cursor: 'pointer', padding: '9px 16px', minWidth: 112, borderRight: '1px solid #d9d6d0' }}>
                      <div style={{ fontSize: 11.5, color: '#8d8a83' }}>Check-in</div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{s.start ? fmtField(s.start) : '––'}</div>
                    </button>
                    <button onClick={() => { setActive(i); setCalOpen(true); setGuestsOpenFor(-1); }} style={{ all: 'unset', cursor: 'pointer', padding: '9px 16px', minWidth: 112 }}>
                      <div style={{ fontSize: 11.5, color: '#8d8a83' }}>Check-out</div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{s.end ? fmtField(s.end) : '––'}</div>
                    </button>
                    {(s.start || s.end) && (
                      <button aria-label="Clear dates" onClick={() => patchStay(i, { start: '', end: '' })} style={{ all: 'unset', cursor: 'pointer', padding: '0 12px', color: '#8d8a83', fontSize: 15 }}>✕</button>
                    )}
                  </div>

                  {/* guests + remove, one unit so mobile keeps them together */}
                  <div className="pb-guestrow" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="pb-guests" style={{ position: 'relative' }}>
                    <button className="pb-guestbtn" onClick={() => { setGuestsOpenFor(guestsOpenFor === i ? -1 : i); setCalOpen(false); }} style={{ all: 'unset', cursor: 'pointer', padding: '9px 16px', minWidth: 150, border: '1px solid #d9d6d0', borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, boxSizing: 'border-box' }}>
                      <span>
                        <span style={{ display: 'block', fontSize: 11.5, color: '#8d8a83' }}>Guests</span>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{guestsLabelOf(s)}</span>
                      </span>
                      <span style={{ color: '#8d8a83', fontSize: 11, transform: guestsOpenFor === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
                    </button>
                    {guestsOpenFor === i && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 30, background: '#fff', border: '1px solid #eceae6', borderRadius: 12, boxShadow: '0 12px 40px rgba(20,18,14,0.14)', padding: '14px 20px', width: 250, animation: 'pbfade 0.18s ease' }}>
                        <Stepper label="adults" sub="Ages 13 or above" value={s.adults} min={1} max={10} onChange={(v) => patchStay(i, { adults: v })} />
                        <Stepper label="children" sub="Ages 2–12" value={s.children} min={0} max={8} onChange={(v) => patchStay(i, { children: v })} />
                        <Stepper label="infants" sub="Under 2" value={s.infants} min={0} max={4} onChange={(v) => patchStay(i, { infants: v })} />
                        <button onClick={() => setGuestsOpenFor(-1)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', borderTop: '1px solid #eceae6', paddingTop: 12, marginTop: 6, fontSize: 14.5, fontWeight: 600 }}>Done</button>
                      </div>
                    )}
                  </div>

                  {/* remove stay */}
                  {stays.length > 1 && (
                    <button
                      aria-label="Remove stay"
                      title="Remove stay"
                      onClick={() => { setStays((arr) => arr.filter((_, j) => j !== i)); setActive(0); setCalOpen(false); }}
                      style={{ all: 'unset', cursor: 'pointer', alignSelf: 'center', width: 30, height: 30, lineHeight: '28px', textAlign: 'center', border: '1px solid #d9d6d0', borderRadius: '50%', color: '#8d8a83', fontSize: 13, background: '#fff' }}
                    >
                      ✕
                    </button>
                  )}
                  </div>
                </div>

                {/* room setup */}
                <div className="pb-rooms" style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, color: '#8d8a83' }}>Room setup</span>
                  {/* "Different" toggles: closing it reverts to the default but
                      keeps any typed text for if they switch back — only an
                      OPEN custom field is actually sent with the booking. */}
                  <button onClick={() => patchStay(i, { customRooms: false })} style={pill(!s.customRooms)}>Default · {defaultRoomConfig}</button>
                  <button onClick={() => patchStay(i, { customRooms: !s.customRooms })} style={pill(s.customRooms)}>Different</button>
                  {s.customRooms && (
                    <input
                      value={s.roomConfig}
                      onChange={(e) => patchStay(i, { roomConfig: e.target.value })}
                      placeholder="e.g. 2 kings, 2 twins, 1 double"
                      autoFocus
                      style={{ flex: '1 1 220px', border: '1px solid #d9d6d0', borderRadius: 8, padding: '7px 12px', fontSize: 13.5, fontFamily: 'inherit', background: '#fff', animation: 'pbfade 0.18s ease' }}
                    />
                  )}
                </div>

                {/* calendar dropdown for the active stay */}
                {calOpen && active === i && (
                  <div className="pb-cal" style={{ position: 'absolute', top: 64, left: 0, zIndex: 20, background: '#fff', border: '1px solid #eceae6', borderRadius: 14, boxShadow: '0 18px 60px rgba(20,18,14,0.16)', padding: '18px 22px 22px', animation: 'pbslide 0.22s ease', maxWidth: 'min(94vw, 560px)' }}>
                    {blocked == null && !loadError && <div style={{ padding: 30, color: '#8d8a83', fontSize: 14 }}>Loading live availability…</div>}
                    {loadError && <div style={{ padding: 30, color: '#a33', fontSize: 14 }}>{loadError}</div>}
                    {blocked != null && (
                      <div style={{ display: 'flex', gap: 34, position: 'relative' }}>
                        <button aria-label="Earlier" disabled={monthOffset === 0} onClick={() => setMonthOffset((v) => Math.max(0, v - 1))} style={{ all: 'unset', cursor: monthOffset === 0 ? 'default' : 'pointer', position: 'absolute', left: -6, top: 0, color: monthOffset === 0 ? '#d9d6d0' : '#57544e', fontSize: 16, padding: 4 }}>‹</button>
                        <button aria-label="Later" disabled={monthOffset >= 13} onClick={() => setMonthOffset((v) => Math.min(13, v + 1))} style={{ all: 'unset', cursor: 'pointer', position: 'absolute', right: -6, top: 0, color: '#57544e', fontSize: 16, padding: 4 }}>›</button>
                        {[monthOffset, monthOffset + 1].map((off, idx) => {
                          const { label, cells } = monthGrid(off);
                          return (
                            <div key={off} className={idx === 1 ? 'pb-month2' : undefined}>
                              <div style={{ textAlign: 'center', fontSize: 14.5, fontWeight: 600, marginBottom: 12 }}>{label}</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 34px)', gap: '2px 1px' }}>
                                {WEEKDAYS.map((w) => (
                                  <div key={w} style={{ textAlign: 'center', fontSize: 11.5, color: '#8d8a83', marginBottom: 4 }}>{w}</div>
                                ))}
                                {cells.map((d, ci) =>
                                  d == null ? (
                                    <div key={`x${ci}`} />
                                  ) : (
                                    <div
                                      key={d}
                                      style={cellStyle(d)}
                                      onPointerDown={(e) => { e.preventDefault(); pickDate(d); }}
                                      onPointerUp={() => { const st = stays[active]; if (st?.start && !st.end && hover === d && d > st.start && rangeFree(st.start, d, active)) { patchStay(active, { end: d }); setCalOpen(false); } }}
                                      onMouseEnter={() => setHover(d)}
                                      onMouseMove={(e) => {
                                        const st = stays[active];
                                        const bad = !isPast(d) && isBlocked(d, active) && !(st?.start && !st.end && d > st.start && rangeFree(st.start, d, active));
                                        setTooltip(bad ? { x: e.clientX, y: e.clientY - 38 } : null);
                                      }}
                                      onMouseLeave={() => { setHover(''); setTooltip(null); }}
                                    >
                                      {parse(d).getUTCDate()}
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* add another stay */}
            {stays.every((s) => nightsOf(s) > 0) && (
              <button
                onClick={() => { setStays((arr) => [...arr, newStay()]); setActive(stays.length); setCalOpen(true); }}
                style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: '#1c1b18', padding: '10px 0', animation: 'pbfade 0.25s ease' }}
              >
                <span style={{ width: 26, height: 26, lineHeight: '24px', textAlign: 'center', border: '1px solid #c9c6c0', borderRadius: '50%', fontSize: 16 }}>+</span>
                Add another stay
              </button>
            )}

            <p style={{ marginTop: 22, fontSize: 13.5, color: '#8d8a83', maxWidth: 460, lineHeight: 1.6 }}>
              Crossed-out dates are unavailable. You can check out on the morning of the first
              crossed-out day. Stays of 2+ nights book instantly; single nights are sent as a
              request and confirmed shortly.
            </p>
            {submitError && <p style={{ fontSize: 13.5, color: '#a33', marginTop: 10 }}>{submitError}</p>}
          </div>

          {/* ── reservation summary ── */}
          <div className="pb-aside" style={{ flex: '0 1 320px', minWidth: 280, display: 'grid', gap: 16, alignContent: 'start' }}>
          <aside style={{ border: '1px solid #eceae6', borderRadius: 14, padding: '22px 24px', background: '#fff', boxShadow: '0 4px 24px rgba(20,18,14,0.05)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Reservation summary</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid #eceae6' }}>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" style={{ width: 54, height: 44, objectFit: 'cover', borderRadius: 6 }} />
              ) : (
                <div style={{ width: 54, height: 44, borderRadius: 6, background: '#e3e1dc' }} />
              )}
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{propertyName}</div>
            </div>
            {completeStays.length > 0 ? (
              <div style={{ padding: '14px 0 4px', animation: 'pbfade 0.25s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{completeStays.length === 1 ? 'Your stay' : `${completeStays.length} stays`}</span>
                  <span style={{ fontSize: 20, fontWeight: 700 }}>{totalNights} night{totalNights === 1 ? '' : 's'}</span>
                </div>
                {completeStays.map((s, i) => (
                  <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px solid #f2f0ec' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 600 }}>
                      <span>{fmtShort(s.start)} → {fmtShort(s.end)}</span>
                      <span>{nightsOf(s)} night{nightsOf(s) === 1 ? '' : 's'}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#8d8a83', marginTop: 3 }}>
                      {guestsLabelOf(s)}{s.customRooms && s.roomConfig ? ` · ${s.roomConfig}` : ''}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 10, paddingTop: 14, borderTop: '1px solid #eceae6', fontSize: 12.5, color: '#8d8a83', lineHeight: 1.55 }}>
                  No payment due now — invoiced directly.
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13.5, color: '#8d8a83', lineHeight: 1.6, paddingTop: 14 }}>Select your dates to see your stay summary.</p>
            )}
          </aside>

          {/* every stay already secured through this link — collapsed by default */}
          {history.length > 0 && (
            <section style={{ border: '1px solid #eceae6', borderRadius: 14, padding: historyOpen ? '18px 24px 14px' : '18px 24px', background: '#fff', boxShadow: '0 4px 24px rgba(20,18,14,0.05)', animation: 'pbfade 0.25s ease' }}>
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                aria-expanded={historyOpen}
                style={{ all: 'unset', cursor: 'pointer', display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
              >
                <span>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>Booked through this link</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#8d8a83', marginTop: 2 }}>{history.length} booking{history.length === 1 ? '' : 's'} so far</span>
                </span>
                <span style={{ color: '#8d8a83', fontSize: 11, transform: historyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>▼</span>
              </button>
              {historyOpen && <div style={{ marginTop: 8, animation: 'pbslide 0.2s ease' }}>
              {history.map((h, i) => {
                const n = Math.round((parse(h.departure).getTime() - parse(h.arrival).getTime()) / DAY_MS);
                const past = h.departure <= todayIso;
                return (
                  <div key={i} style={{ padding: '9px 0', borderTop: '1px solid #f2f0ec', opacity: past ? 0.5 : 1 }}>
                    <div className="pb-histrow" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{fmtShort(h.arrival)} → {fmtShort(h.departure)}</span>
                      <span style={{ color: h.status === 'booked' ? '#1e7a3c' : '#8d8a83', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {h.status === 'booked' ? 'Booked ✓' : 'Awaiting confirmation'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8d8a83', marginTop: 2 }}>
                      {n} night{n === 1 ? '' : 's'} · {h.adults + h.children} guest{h.adults + h.children === 1 ? '' : 's'}
                      {h.roomConfig ? ` · ${h.roomConfig}` : ''}
                    </div>
                  </div>
                );
              })}
              </div>}
            </section>
          )}
          </div>
        </div>

        {tooltip && (
          <div style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)', background: '#111', color: '#fff', fontSize: 12, padding: '6px 10px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 60, animation: 'pbfade 0.12s ease' }}>
            Not available for check-in
          </div>
        )}
      </div>

      {/* footer action bar */}
      <div className="pb-footer" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff', borderTop: '1px solid #eceae6', padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, zIndex: 50 }}>
        {canBook && (
          <span className="pb-footnote" style={{ fontSize: 13, color: '#8d8a83' }}>
            {completeStays.length === 1 ? '' : `${completeStays.length} stays · `}{totalNights} night{totalNights === 1 ? '' : 's'} · no payment
          </span>
        )}
        <button
          className="pb-book"
          onClick={submit}
          disabled={!canBook || submitting}
          style={{ all: 'unset', cursor: canBook && !submitting ? 'pointer' : 'default', background: canBook && !submitting ? '#111' : '#e3e1dc', color: canBook && !submitting ? '#fff' : '#9b978f', fontSize: 15, fontWeight: 600, padding: '13px 38px', borderRadius: 10, transition: 'background 0.15s', boxSizing: 'border-box' }}
        >
          {submitting ? 'Booking…' : requireApproval ? 'Send request' : 'Book Now'}
        </button>
      </div>
    </Shell>
  );
}

const pill = (on: boolean): React.CSSProperties => ({
  all: 'unset',
  cursor: 'pointer',
  fontSize: 12.5,
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid ' + (on ? '#111' : '#d9d6d0'),
  background: on ? '#111' : '#fff',
  color: on ? '#fff' : '#57544e',
  transition: 'all 0.15s',
});

function Shell({ propertyName, children }: { propertyName: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fbfaf8', color: '#1c1b18', fontFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes pbfade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pbslide { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: none } }
        @keyframes pbpulse { 0% { box-shadow: 0 0 0 0 rgba(30,122,60,0.45) } 70% { box-shadow: 0 0 0 18px rgba(30,122,60,0) } 100% { box-shadow: 0 0 0 0 rgba(30,122,60,0) } }
        @media (max-width: 640px) {
          .pb-month2 { display: none }
          /* stack the field rows: dates full width, then guests + remove */
          .pb-fieldsrow { flex-direction: column; align-items: stretch }
          .pb-datefield { width: 100% }
          .pb-datefield > button { flex: 1 1 0; min-width: 0 !important }
          .pb-guestrow { width: 100% }
          .pb-guests { flex: 1; min-width: 0 }
          .pb-guestbtn { width: 100% }
          /* room setup: pills wrap cleanly, custom field gets its own line */
          .pb-rooms { row-gap: 8px }
          .pb-rooms input { flex: 1 1 100% }
          /* single centred month, sized to the screen */
          .pb-cal { left: 0; right: 0; max-width: none !important; padding: 16px 12px 18px !important }
          .pb-cal > div { justify-content: center }
          /* summary card sits full width under the form */
          .pb-aside { flex: 1 1 100%; min-width: 0 }
          /* footer: full-width button, note above it */
          .pb-footer { flex-wrap: wrap; justify-content: center; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) }
          .pb-footnote { flex: 1 1 100%; text-align: center }
          .pb-book { flex: 1; text-align: center }
          .pb-wrap { padding: 20px 16px 150px !important }
          /* history rows: let the status drop under the dates when tight */
          .pb-histrow { flex-wrap: wrap }
        }
        button:focus-visible { outline: 2px solid #111; outline-offset: 2px }
      `}</style>
      <header style={{ background: '#000', color: '#fff', padding: '20px 28px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>Stay with Us</div>
      </header>
      <div style={{ fontSize: 12.5, textAlign: 'center', padding: '10px 16px', background: '#f2f0ec', color: '#57544e' }}>
        Private booking page for {propertyName}.
      </div>
      {children}
    </div>
  );
}

function Stepper({ label, sub, value, min, max, onChange }: { label: string; sub: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = (dis: boolean): React.CSSProperties => ({ all: 'unset', cursor: dis ? 'default' : 'pointer', width: 28, height: 28, lineHeight: '26px', textAlign: 'center', border: '1px solid ' + (dis ? '#eceae6' : '#c9c6c0'), borderRadius: '50%', color: dis ? '#d9d6d0' : '#1c1b18', fontSize: 16 });
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
      <div><div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 12, color: '#8d8a83' }}>{sub}</div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={btn(value <= min)} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <span style={{ minWidth: 16, textAlign: 'center', fontSize: 14 }}>{value}</span>
        <button style={btn(value >= max)} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}
