'use client';

import { useMemo, useState, useTransition } from 'react';
import { savePromoCode, setPromoStatus, deletePromoCode, type PromoInput } from '@/app/(admin)/promo-codes/actions';
import { checkoutUrl, describeValue, effectiveStatus, type PromoCode } from '@/lib/promo';

export interface PromoProperty {
  id: string;
  name: string;
  lodgifyPropertyId: string;
}

const KINDS = [
  { v: 'free-night', l: 'Free night(s)' },
  { v: 'percent', l: 'Percent off' },
  { v: 'fixed', l: 'Amount off' },
  { v: 'other', l: 'Other' },
];

const STATUS_TONE: Record<string, string> = {
  active: 'var(--jade, #1a7f5a)',
  draft: 'var(--ink-mute)',
  paused: '#b8860b',
  expired: '#c0392b',
};

const field: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--hairline)',
  borderRadius: 8,
  background: 'var(--canvas)',
  font: 'inherit',
  fontSize: 13.5,
};
const lbl: React.CSSProperties = { display: 'block', marginBottom: 5 };

const EMPTY: PromoInput = {
  property_id: '',
  code: '',
  label: '',
  terms: '',
  kind: 'free-night',
  value: '',
  min_nights: '',
  book_by: '',
  stay_from: '',
  stay_to: '',
  default_adults: '2',
  status: 'draft',
  notes: '',
};

export default function PromoCodes({
  properties,
  codes,
  clicksByLink,
  redemptions,
  today,
}: {
  properties: PromoProperty[];
  codes: PromoCode[];
  clicksByLink: Record<string, number>;
  redemptions: Record<string, { count: number; amount: number; currency: string }>;
  today: string;
}) {
  const [form, setForm] = useState<PromoInput | null>(null);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');
  const [pending, start] = useTransition();

  const byProperty = useMemo(() => {
    const m = new Map<string, PromoCode[]>();
    for (const p of properties) m.set(p.id, []);
    for (const c of codes) m.get(c.property_id)?.push(c);
    return m;
  }, [properties, codes]);

  const set = (k: keyof PromoInput, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const submit = () =>
    form &&
    start(async () => {
      const res = await savePromoCode(form);
      setNotice(res.message);
      if (res.ok) setForm(null);
    });

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1800);
  };

  if (properties.length === 0)
    return <p className="caption">No Lodgify-managed properties are configured.</p>;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {notice && (
        <p className="caption" style={{ color: 'var(--primary-deep)' }}>{notice}</p>
      )}

      {properties.map((prop) => {
        const list = byProperty.get(prop.id) ?? [];
        return (
          <section key={prop.id} className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <h2 className="heading-md" style={{ flex: 1, minWidth: 180 }}>{prop.name}</h2>
              <button
                type="button"
                className="pill-primary"
                onClick={() => {
                  setNotice('');
                  setForm({ ...EMPTY, property_id: prop.id });
                }}
              >
                Add a code
              </button>
            </div>

            {(() => {
              const r = redemptions[prop.id];
              if (!r || r.count === 0) return null;
              return (
                <p className="caption" style={{ marginBottom: 12, color: 'var(--primary-deep)' }}>
                  {r.count} booking{r.count === 1 ? '' : 's'} with a promotion applied ·{' '}
                  {r.currency} {r.amount.toFixed(0)} discounted in the last 200 bookings.{' '}
                  <span style={{ color: 'var(--ink-mute)' }}>
                    Lodgify records the discount but not which code produced it.
                  </span>
                </p>
              );
            })()}

            {list.length === 0 && !form && (
              <p className="caption" style={{ color: 'var(--ink-mute)' }}>
                No codes recorded yet.
              </p>
            )}

            <div style={{ display: 'grid', gap: 12 }}>
              {list.map((c) => {
                const status = effectiveStatus(c, today);
                const url = checkoutUrl({
                  lodgifyPropertyId: prop.lodgifyPropertyId,
                  code: c.code,
                  adults: c.default_adults,
                });
                const clicks = c.tracked_link_id ? clicksByLink[c.tracked_link_id] ?? 0 : 0;
                return (
                  <div key={c.id} style={{ borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <code style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.06em' }}>{c.code}</code>
                      <span className="caption" style={{ flex: 1, minWidth: 140 }}>{c.label}</span>
                      <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>{describeValue(c)}</span>
                      <span className="micro-cap" style={{ color: STATUS_TONE[status] }}>{status}</span>
                      <span className="tnum caption" title="clicks on this code's link">{clicks} clicks</span>
                    </div>

                    {(c.book_by || c.stay_from || c.min_nights) && (
                      <p className="caption" style={{ color: 'var(--ink-mute)', marginTop: 4 }}>
                        {c.book_by ? `Book by ${c.book_by}` : ''}
                        {c.stay_from ? ` · stay ${c.stay_from}${c.stay_to ? ` to ${c.stay_to}` : ' onwards'}` : ''}
                        {c.min_nights ? ` · min ${c.min_nights} nights` : ''}
                      </p>
                    )}
                    {c.terms && <p className="caption" style={{ marginTop: 4 }}>{c.terms}</p>}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                      <button type="button" className="pill-primary" onClick={() => copy(url, `u${c.id}`)}>
                        {copied === `u${c.id}` ? 'Copied ✓' : 'Copy booking link'}
                      </button>
                      <button
                        type="button"
                        className="pill-primary"
                        style={{ background: 'var(--canvas)', color: 'var(--ink-mute)', border: '1px solid var(--hairline)' }}
                        onClick={() => copy(c.code, `c${c.id}`)}
                      >
                        {copied === `c${c.id}` ? 'Copied ✓' : 'Copy code'}
                      </button>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="caption">Test ↗</a>
                      <button
                        type="button"
                        className="caption"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                        onClick={() => {
                          setNotice('');
                          setForm({
                            id: c.id,
                            property_id: c.property_id,
                            code: c.code,
                            label: c.label,
                            terms: c.terms,
                            kind: c.kind,
                            value: c.value != null ? String(c.value) : '',
                            min_nights: c.min_nights != null ? String(c.min_nights) : '',
                            book_by: c.book_by ?? '',
                            stay_from: c.stay_from ?? '',
                            stay_to: c.stay_to ?? '',
                            default_adults: String(c.default_adults),
                            status: c.status,
                            notes: c.notes,
                          });
                        }}
                      >
                        Edit
                      </button>
                      {status !== 'active' ? (
                        <button
                          type="button"
                          className="caption"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                          disabled={pending}
                          onClick={() => start(async () => setNotice((await setPromoStatus(c.id, 'active')).message))}
                        >
                          Mark active
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="caption"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)' }}
                          disabled={pending}
                          onClick={() => start(async () => setNotice((await setPromoStatus(c.id, 'paused')).message))}
                        >
                          Pause
                        </button>
                      )}
                      <button
                        type="button"
                        className="caption"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b' }}
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm(`Remove ${c.code} from Decra? It stays in Lodgify.`)) return;
                          start(async () => setNotice((await deletePromoCode(c.id)).message));
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {form && form.property_id === prop.id && (
              <div style={{ borderTop: '1px solid var(--hairline)', marginTop: 16, paddingTop: 16 }}>
                <p className="caption" style={{ marginBottom: 12, color: 'var(--ink-mute)' }}>
                  Create the code in Lodgify first (Settings → Promotions), then record it here exactly
                  as you typed it there — Decra cannot create it in Lodgify for you. Codes are
                  case-sensitive and can be reused by any number of guests: Lodgify has no
                  single-use or per-guest codes, and coded offers apply to direct bookings only,
                  never to Airbnb, Vrbo or Booking.com.
                </p>
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
                  <label className="caption">
                    <span style={lbl}>Code (as in Lodgify)</span>
                    <input
                      style={field}
                      value={form.code}
                      onChange={(e) => set('code', e.target.value)}
                      placeholder="NWTRS"
                    />
                  </label>
                  <label className="caption">
                    <span style={lbl}>Name</span>
                    <input style={field} value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="NWTRS film offer" />
                  </label>
                  <label className="caption">
                    <span style={lbl}>Offer type</span>
                    <select style={field} value={form.kind} onChange={(e) => set('kind', e.target.value)}>
                      {KINDS.map((k) => (
                        <option key={k.v} value={k.v}>{k.l}</option>
                      ))}
                    </select>
                  </label>
                  <label className="caption">
                    <span style={lbl}>Value</span>
                    <input style={field} value={form.value} onChange={(e) => set('value', e.target.value)} placeholder="1" inputMode="decimal" />
                  </label>
                  <label className="caption">
                    <span style={lbl}>Minimum nights</span>
                    <input style={field} value={form.min_nights} onChange={(e) => set('min_nights', e.target.value)} placeholder="2" inputMode="numeric" />
                  </label>
                  <label className="caption">
                    <span style={lbl}>Book by</span>
                    <input style={field} type="date" value={form.book_by} onChange={(e) => set('book_by', e.target.value)} />
                  </label>
                  <label className="caption">
                    <span style={lbl}>Stay from</span>
                    <input style={field} type="date" value={form.stay_from} onChange={(e) => set('stay_from', e.target.value)} />
                  </label>
                  <label className="caption">
                    <span style={lbl}>Stay to</span>
                    <input style={field} type="date" value={form.stay_to} onChange={(e) => set('stay_to', e.target.value)} />
                  </label>
                  <label className="caption">
                    <span style={lbl}>Adults on the link</span>
                    <input style={field} value={form.default_adults} onChange={(e) => set('default_adults', e.target.value)} inputMode="numeric" />
                  </label>
                  <label className="caption">
                    <span style={lbl}>Status</span>
                    <select style={field} value={form.status} onChange={(e) => set('status', e.target.value)}>
                      {['draft', 'active', 'paused', 'expired'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="caption" style={{ display: 'block', marginTop: 12 }}>
                  <span style={lbl}>Terms, as guests should read them</span>
                  <input
                    style={field}
                    value={form.terms}
                    onChange={(e) => set('terms', e.target.value)}
                    placeholder="Pay for 2 or more nights and receive an additional night free."
                  />
                </label>
                <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  <button type="button" className="pill-primary" disabled={pending} onClick={submit}>
                    {pending ? 'Saving…' : form.id ? 'Save changes' : 'Add code'}
                  </button>
                  <button
                    type="button"
                    className="pill-primary"
                    style={{ background: 'var(--canvas)', color: 'var(--ink-mute)', border: '1px solid var(--hairline)' }}
                    onClick={() => setForm(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
