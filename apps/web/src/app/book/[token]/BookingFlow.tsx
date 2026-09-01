'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Lodgify-checkout-style booking flow, payment-free.
 *
 * The calendar is the point: two months, unavailable nights struck out,
 * "Not available for check-in" tooltip, click (or click-drag) to pick the
 * range — check-in goes black, the span fills grey, and checkout may land
 * on the first unavailable date (you leave that morning). The summary
 * panel counts nights instead of dollars, and Book Now sends the stay
 * straight into the PMS with nothing charged.
 */

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const fmtField = (s: string) => { const d = parse(s); return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`; };
const fmtLong = (s: string) => { const d = parse(s); return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0,3)} ${d.getUTCFullYear()}`; };

interface Props {
  token: string;
  propertyName: string;
  imageUrl: string | null;
  requireApproval: boolean;
}

export default function BookingFlow({ token, propertyName, imageUrl, requireApproval }: Props) {
  const todayIso = useMemo(() => iso(new Date()), []);
  const [blocked, setBlocked] = useState<Set<string> | null>(null);
  const [loadError, setLoadError] = useState('');

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [hover, setHover] = useState('');
  const [calOpen, setCalOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  const [guestsOpen, setGuestsOpen] = useState(false);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const [step, setStep] = useState<'dates' | 'details'>('dates');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState<'booked' | 'pending' | ''>('');

  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/private-booking/availability?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.blocked) setBlocked(new Set<string>(d.blocked));
        else setLoadError(d.error ?? 'Could not load availability');
      })
      .catch(() => setLoadError('Could not load availability'));
  }, [token]);

  // close popovers on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setCalOpen(false);
        setGuestsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const isBlocked = (d: string) => blocked?.has(d) ?? false;
  const isPast = (d: string) => d <= todayIso;

  /** All nights in [a, b) free — b itself may be an unavailable date (checkout morning). */
  const rangeFree = (a: string, b: string) => {
    let d = parse(a);
    const endD = parse(b);
    while (d < endD) {
      if (isBlocked(iso(d))) return false;
      d = new Date(d.getTime() + DAY_MS);
    }
    return true;
  };

  const nights = start && end ? Math.round((parse(end).getTime() - parse(start).getTime()) / DAY_MS) : 0;

  const pickDate = (d: string) => {
    if (isPast(d)) return;
    if (start && !end && d > start && rangeFree(start, d)) {
      setEnd(d);
      setCalOpen(false);
      return;
    }
    if (isBlocked(d)) return; // not available for check-in
    setStart(d);
    setEnd('');
  };

  const clearDates = () => { setStart(''); setEnd(''); setStep('dates'); };

  const previewEnd = start && !end && hover && hover > start && rangeFree(start, hover) ? hover : '';
  const inRange = (d: string) => {
    const hi = end || previewEnd;
    return !!start && !!hi && d > start && d < hi;
  };

  const monthGrid = (offset: number) => {
    const base = new Date();
    const y = base.getFullYear();
    const m = base.getMonth() + offset;
    const first = new Date(Date.UTC(y, m, 1));
    const label = `${MONTHS[first.getUTCMonth()]} ${first.getUTCFullYear()}`;
    const lead = (first.getUTCDay() + 6) % 7; // Monday-first
    const daysIn = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const cells: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysIn; d++) cells.push(iso(new Date(Date.UTC(y, m, d))));
    return { label, cells };
  };

  const canBook = nights > 0;
  const detailsValid = name.trim().length > 1 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const submit = async () => {
    if (!canBook || !detailsValid || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const r = await fetch('/api/private-booking/book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, arrival: start, departure: end, adults, children, infants, name, email, phone, notes }),
      });
      const d = await r.json();
      if (d.ok) setDone(d.mode === 'pending' ? 'pending' : 'booked');
      else setSubmitError(d.error ?? 'Something went wrong');
    } catch {
      setSubmitError('Network problem — please try again');
    }
    setSubmitting(false);
  };

  const guestsLabel = `${adults} adult${adults === 1 ? '' : 's'}${children ? `, ${children} child${children === 1 ? '' : 'ren'}` : ''}${infants ? `, ${infants} infant${infants === 1 ? '' : 's'}` : ''}`;

  const cellStyle = (d: string): React.CSSProperties => {
    const past = isPast(d);
    const blockedD = isBlocked(d);
    const sel = d === start || d === end || d === previewEnd;
    const mid = inRange(d);
    return {
      width: 34,
      height: 34,
      lineHeight: '34px',
      textAlign: 'center',
      fontSize: 13,
      borderRadius: sel ? 6 : 0,
      cursor: past ? 'default' : 'pointer',
      userSelect: 'none',
      background: sel ? '#111' : mid ? '#e3e1dc' : 'transparent',
      color: sel ? '#fff' : past || blockedD ? '#b9b6b0' : '#1c1b18',
      textDecoration: !past && blockedD && !sel ? 'line-through' : 'none',
      transition: 'background 0.12s, color 0.12s',
    };
  };

  if (done) {
    return (
      <Shell propertyName={propertyName}>
        <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#111', color: '#fff', fontSize: 30, lineHeight: '64px', margin: '0 auto 20px' }}>✓</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>
            {done === 'booked' ? 'Your dates are booked' : 'Request received'}
          </h1>
          <p style={{ color: '#57544e', lineHeight: 1.6, marginBottom: 8 }}>
            {fmtLong(start)} → {fmtLong(end)} · {nights} night{nights === 1 ? '' : 's'} · {guestsLabel}
          </p>
          <p style={{ color: '#57544e', lineHeight: 1.6 }}>
            {done === 'booked'
              ? 'No payment was taken — your stay will be invoiced directly. A confirmation is now in our system and the dates are reserved for you.'
              : 'No payment is needed. We will confirm your dates shortly and be in touch on the email you provided.'}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell propertyName={propertyName}>
      <div ref={wrapRef} style={{ maxWidth: 1060, margin: '0 auto', padding: '28px 20px 120px' }}>
        {/* step breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, marginBottom: 26, color: '#8d8a83' }}>
          <button onClick={() => setStep('dates')} style={{ all: 'unset', cursor: 'pointer', color: step === 'dates' ? '#111' : '#8d8a83', textDecoration: step === 'dates' ? 'underline' : 'none', textUnderlineOffset: 6 }}>Dates</button>
          <span>›</span>
          <span style={{ color: step === 'details' ? '#111' : '#b9b6b0', textDecoration: step === 'details' ? 'underline' : 'none', textUnderlineOffset: 6 }}>Contact</span>
        </nav>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
          {/* ── left column ── */}
          <div style={{ flex: '1 1 520px', minWidth: 300 }}>
            {step === 'dates' && (
              <>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>Dates</h1>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {/* date fields */}
                    <div style={{ display: 'flex', border: '1px solid #d9d6d0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                      <button onClick={() => { setCalOpen(true); setGuestsOpen(false); }} style={{ all: 'unset', cursor: 'pointer', padding: '9px 16px', minWidth: 118, borderRight: '1px solid #d9d6d0' }}>
                        <div style={{ fontSize: 11.5, color: '#8d8a83' }}>Check-in</div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{start ? fmtField(start) : '––'}</div>
                      </button>
                      <button onClick={() => { setCalOpen(true); setGuestsOpen(false); }} style={{ all: 'unset', cursor: 'pointer', padding: '9px 16px', minWidth: 118, position: 'relative' }}>
                        <div style={{ fontSize: 11.5, color: '#8d8a83' }}>Check-out</div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{end ? fmtField(end) : '––'}</div>
                      </button>
                      {(start || end) && (
                        <button aria-label="Clear dates" onClick={clearDates} style={{ all: 'unset', cursor: 'pointer', padding: '0 12px', color: '#8d8a83', fontSize: 15 }}>✕</button>
                      )}
                    </div>
                    {/* guests field */}
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => { setGuestsOpen((v) => !v); setCalOpen(false); }} style={{ all: 'unset', cursor: 'pointer', padding: '9px 16px', minWidth: 170, border: '1px solid #d9d6d0', borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span>
                          <span style={{ display: 'block', fontSize: 11.5, color: '#8d8a83' }}>Guests</span>
                          <span style={{ fontSize: 15, fontWeight: 600 }}>{guestsLabel}</span>
                        </span>
                        <span style={{ color: '#8d8a83', fontSize: 11, transform: guestsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
                      </button>
                      {guestsOpen && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 30, background: '#fff', border: '1px solid #eceae6', borderRadius: 12, boxShadow: '0 12px 40px rgba(20,18,14,0.14)', padding: '18px 20px', width: 250, animation: 'pbfade 0.18s ease' }}>
                          <Stepper label="adults" sub="Ages 13 or above" value={adults} min={1} max={8} onChange={setAdults} />
                          <Stepper label="children" sub="Ages 2–12" value={children} min={0} max={6} onChange={setChildren} />
                          <Stepper label="infants" sub="Under 2" value={infants} min={0} max={4} onChange={setInfants} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', opacity: 0.45 }}>
                            <div><div style={{ fontSize: 14, fontWeight: 600 }}>pets</div><div style={{ fontSize: 12, color: '#8d8a83' }}>Not allowed</div></div>
                            <div style={{ fontSize: 14 }}>0</div>
                          </div>
                          <button onClick={() => setGuestsOpen(false)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', borderTop: '1px solid #eceae6', paddingTop: 12, marginTop: 6, fontSize: 14.5, fontWeight: 600 }}>Done</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* calendar dropdown */}
                  {calOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 10px)', left: 0, zIndex: 20, background: '#fff', border: '1px solid #eceae6', borderRadius: 14, boxShadow: '0 18px 60px rgba(20,18,14,0.16)', padding: '18px 22px 22px', animation: 'pbslide 0.22s ease', maxWidth: 'min(94vw, 560px)' }}>
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
                                  {cells.map((d, i) =>
                                    d == null ? (
                                      <div key={`x${i}`} />
                                    ) : (
                                      <div
                                        key={d}
                                        style={cellStyle(d)}
                                        onPointerDown={(e) => { e.preventDefault(); pickDate(d); }}
                                        onPointerUp={() => { if (start && !end && hover && hover > start && hover === d && rangeFree(start, d)) { setEnd(d); setCalOpen(false); } }}
                                        onMouseEnter={(e) => {
                                          setHover(d);
                                          const bad = !isPast(d) && isBlocked(d) && !(start && !end && d > start && rangeFree(start, d));
                                          if (bad) {
                                            const r = (e.target as HTMLElement).getBoundingClientRect();
                                            const w = wrapRef.current!.getBoundingClientRect();
                                            setTooltip({ x: r.left - w.left + r.width / 2, y: r.top - w.top - 34 });
                                          } else setTooltip(null);
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
                <p style={{ marginTop: 26, fontSize: 13.5, color: '#8d8a83', maxWidth: 460, lineHeight: 1.6 }}>
                  Crossed-out dates are unavailable. Pick your check-in, then your check-out — you can check out on the morning of the first crossed-out day.
                </p>
              </>
            )}

            {step === 'details' && (
              <>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>Contact</h1>
                <div style={{ display: 'grid', gap: 14, maxWidth: 440 }}>
                  <Field label="Full name" value={name} onChange={setName} placeholder="Jane Smith" />
                  <Field label="Email" value={email} onChange={setEmail} placeholder="jane@example.com" type="email" />
                  <Field label="Phone (optional)" value={phone} onChange={setPhone} placeholder="04xx xxx xxx" type="tel" />
                  <div>
                    <div style={{ fontSize: 12.5, color: '#8d8a83', marginBottom: 6 }}>Anything we should know? (optional)</div>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: '100%', border: '1px solid #d9d6d0', borderRadius: 8, padding: '10px 14px', fontSize: 14.5, fontFamily: 'inherit', resize: 'vertical' }} />
                  </div>
                  <p style={{ fontSize: 13, color: '#8d8a83', lineHeight: 1.6 }}>
                    No payment is taken on this page — your stay is invoiced directly after booking.
                  </p>
                  {submitError && <p style={{ fontSize: 13.5, color: '#a33' }}>{submitError}</p>}
                </div>
              </>
            )}
          </div>

          {/* ── reservation summary ── */}
          <aside style={{ flex: '0 1 320px', minWidth: 280, border: '1px solid #eceae6', borderRadius: 14, padding: '22px 24px', background: '#fff', boxShadow: '0 4px 24px rgba(20,18,14,0.05)' }}>
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
            <div style={{ padding: '16px 0 4px' }}>
              {nights > 0 ? (
                <div style={{ animation: 'pbfade 0.25s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>Your stay</span>
                    <span style={{ fontSize: 20, fontWeight: 700 }}>{nights} night{nights === 1 ? '' : 's'}</span>
                  </div>
                  <Row k="Check-in" v={fmtLong(start)} />
                  <Row k="Check-out" v={fmtLong(end)} />
                  <Row k="Guests" v={guestsLabel} />
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #eceae6', fontSize: 12.5, color: '#8d8a83', lineHeight: 1.55 }}>
                    No payment due now — this stay is invoiced directly.
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13.5, color: '#8d8a83', lineHeight: 1.6 }}>Select your dates to see your stay summary.</p>
              )}
            </div>
          </aside>
        </div>

        {tooltip && (
          <div style={{ position: 'absolute', left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)', background: '#111', color: '#fff', fontSize: 12, padding: '6px 10px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 40, animation: 'pbfade 0.12s ease' }}>
          Not available for check-in
          </div>
        )}
      </div>

      {/* footer action bar */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff', borderTop: '1px solid #eceae6', padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', zIndex: 50 }}>
        {step === 'dates' ? (
          <button
            onClick={() => canBook && setStep('details')}
            disabled={!canBook}
            style={{ all: 'unset', cursor: canBook ? 'pointer' : 'default', background: canBook ? '#111' : '#e3e1dc', color: canBook ? '#fff' : '#9b978f', fontSize: 15, fontWeight: 600, padding: '13px 38px', borderRadius: 10, transition: 'background 0.15s, transform 0.1s' }}
          >
            Book Now
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!detailsValid || submitting}
            style={{ all: 'unset', cursor: detailsValid && !submitting ? 'pointer' : 'default', background: detailsValid && !submitting ? '#111' : '#e3e1dc', color: detailsValid && !submitting ? '#fff' : '#9b978f', fontSize: 15, fontWeight: 600, padding: '13px 38px', borderRadius: 10, transition: 'background 0.15s' }}
          >
            {submitting ? 'Booking…' : requireApproval ? 'Send booking request' : 'Confirm booking'}
          </button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ propertyName, children }: { propertyName: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fbfaf8', color: '#1c1b18', fontFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes pbfade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pbslide { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: none } }
        @media (max-width: 640px) { .pb-month2 { display: none } }
        button:focus-visible { outline: 2px solid #111; outline-offset: 2px }
      `}</style>
      <header style={{ background: '#000', color: '#fff', padding: '20px 28px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>Stay with Us</div>
      </header>
      <div style={{ fontSize: 12.5, textAlign: 'center', padding: '10px 16px', background: '#f2f0ec', color: '#57544e' }}>
        Private booking page for {propertyName} — no payment required.
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

function Field({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <label>
      <div style={{ fontSize: 12.5, color: '#8d8a83', marginBottom: 6 }}>{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type ?? 'text'} style={{ width: '100%', border: '1px solid #d9d6d0', borderRadius: 8, padding: '11px 14px', fontSize: 14.5, fontFamily: 'inherit', background: '#fff' }} />
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '4px 0', color: '#57544e' }}>
      <span>{k}</span>
      <span style={{ color: '#1c1b18', fontWeight: 500 }}>{v}</span>
    </div>
  );
}
