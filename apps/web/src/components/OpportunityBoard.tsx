'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setOpportunityStatus, logSignal } from '@/app/(admin)/actions';

export interface BoardProperty {
  id: string;
  name: string;
  locality: string;
  lat: number;
  lon: number;
}

export interface BoardOpportunity {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  summary: string | null;
  startDate: string;
  endDate: string;
  venue: string | null;
  locality: string | null;
  url: string | null;
  sourceUrl: string | null;
  source: string | null;
  tags: string[];
  demand: number | null;
  lat: number | null;
  lon: number | null;
  recommendedPropertyId: string | null;
  scores: Record<string, { total: number; rationale: string[] }>;
  availabilityBadge: string | null;
  bookedOut: boolean;
}

type Row = BoardOpportunity & { daysOut: number; distanceKm: number | null; columnId: string; columnScore: number };

const DAYS_MAX = 180; // slider right edge = no limit
const DIST_MAX = 200; // km; slider right edge = no limit

const PROPERTY_HUES: Record<string, string> = {
  'ten-fifty-bakers': '#8a6d3b',
  'prescription-pad': '#1d4e5f',
  'annie-may': '#3e4a3d',
};

/** Tags and title words that make an event obviously juicy for bookings. */
const HOT_TAGS = new Set(['school-holiday', 'public-holiday', 'wedding-milestone', 'festival', 'long-weekend']);
const HOT_WORDS = /valentine|easter|christmas|new year|mother'?s day|father'?s day|anzac|grand final|agfest/i;

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function daysUntil(date: string): number {
  return Math.round((Date.parse(date) - Date.now()) / 86_400_000);
}

/**
 * Golden: close to the property, lands in the campaign sweet spot, and scores
 * strongly. Hot: the kind of date people already travel for (school holidays,
 * Valentine's, festivals, weddings) or unusually high demand. Both surface in
 * the Top picks strip; you can't run with everything, these are the ones.
 */
function isGolden(o: Row): boolean {
  if (o.daysOut < 14 || o.daysOut > 130) return false;
  if (o.distanceKm == null || o.distanceKm > 30) return false;
  return o.columnScore >= 70 || (o.demand ?? 0) >= 70;
}

function isHot(o: Row): boolean {
  return o.tags.some((t) => HOT_TAGS.has(t)) || HOT_WORDS.test(o.title) || (o.demand ?? 0) >= 70;
}

function fmtDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function columnFor(o: BoardOpportunity, properties: BoardProperty[]): string {
  if (o.recommendedPropertyId && o.scores[o.recommendedPropertyId]) return o.recommendedPropertyId;
  let bestId = properties[0]?.id ?? '';
  let bestScore = -Infinity;
  for (const [pid, s] of Object.entries(o.scores)) {
    if (s.total > bestScore) {
      bestScore = s.total;
      bestId = pid;
    }
  }
  return bestId;
}

export default function OpportunityBoard({
  properties,
  opportunities,
}: {
  properties: BoardProperty[];
  opportunities: BoardOpportunity[];
}) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [maxDays, setMaxDays] = useState(DAYS_MAX);
  const [maxDist, setMaxDist] = useState(DIST_MAX);
  const [multiDayOnly, setMultiDayOnly] = useState(false);
  const [hideBooked, setHideBooked] = useState(true);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [tagsOpen, setTagsOpen] = useState(false);
  const [handled, setHandled] = useState<Set<string>>(new Set()); // optimistic removals
  const [notice, setNotice] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const act = (id: string, status: 'approved' | 'modified' | 'dismissed') => {
    setHandled((prev) => new Set(prev).add(id)); // hide immediately
    startTransition(async () => {
      try {
        const res = await setOpportunityStatus(id, status);
        setNotice(res.message);
        if (!res.ok)
          setHandled((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
      } catch (err) {
        setNotice(`Action failed: ${(err as Error).message}`);
        setHandled((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  };

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of opportunities)
      for (const t of o.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [opportunities]);

  const toggleTag = (t: string) =>
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const { columns, flat, hiddenNoLocation, hiddenBooked } = useMemo(() => {
    const cols = new Map<string, Row[]>();
    for (const p of properties) cols.set(p.id, []);
    const all: Row[] = [];
    let noLoc = 0;
    let booked = 0;

    for (const o of opportunities) {
      if (handled.has(o.id)) continue;
      const daysOut = daysUntil(o.startDate);
      if (daysOut < 0) continue;
      if (maxDays < DAYS_MAX && daysOut > maxDays) continue;
      if (multiDayOnly && o.endDate <= o.startDate) continue;
      if (hideBooked && o.bookedOut) {
        booked++;
        continue;
      }
      if (activeTags.size > 0 && !o.tags.some((t) => activeTags.has(t))) continue;

      const columnId = columnFor(o, properties);
      const prop = properties.find((p) => p.id === columnId);
      if (!prop || !cols.has(columnId)) continue;

      const distanceKm =
        o.lat != null && o.lon != null ? haversineKm(prop.lat, prop.lon, o.lat, o.lon) : null;

      if (maxDist < DIST_MAX) {
        if (distanceKm === null) {
          noLoc++;
          continue;
        }
        if (distanceKm > maxDist) continue;
      }

      const row: Row = { ...o, daysOut, distanceKm, columnId, columnScore: o.scores[columnId]?.total ?? 0 };
      cols.get(columnId)!.push(row);
      all.push(row);
    }

    const rank = (r: Row) =>
      (isGolden(r) ? 2 : 0) + (isHot(r) ? 1 : 0);
    for (const list of cols.values())
      list.sort((a, b) => rank(b) - rank(a) || a.startDate.localeCompare(b.startDate));

    return { columns: cols, flat: all, hiddenNoLocation: noLoc, hiddenBooked: booked };
  }, [opportunities, properties, maxDays, maxDist, multiDayOnly, hideBooked, activeTags, handled]);

  const topPicks = useMemo(
    () =>
      flat
        .filter((o) => isGolden(o) || (isHot(o) && o.columnScore >= 60))
        .sort((a, b) => b.columnScore + (b.demand ?? 0) - (a.columnScore + (a.demand ?? 0)))
        .slice(0, 6),
    [flat],
  );

  const visibleCount = flat.length;
  const nameOf = (pid: string) => properties.find((p) => p.id === pid)?.name ?? pid;

  return (
    <>
      {/* ─── Controls ─── */}
      <section className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: '12px 24px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* view toggle */}
          <div style={{ display: 'inline-flex', padding: 3, borderRadius: 'var(--r-pill)', background: 'var(--canvas-soft)', border: '1px solid var(--hairline)' }}>
            {(
              [
                ['list', 'Board'],
                ['calendar', 'Calendar'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className="caption"
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 14px',
                  borderRadius: 'var(--r-pill)',
                  background: view === v ? 'var(--canvas)' : 'transparent',
                  color: view === v ? 'var(--ink)' : 'var(--ink-mute)',
                  boxShadow: view === v ? 'var(--shadow-1)' : 'none',
                  fontWeight: view === v ? 500 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <label style={{ flex: '1 1 170px', maxWidth: 240 }}>
            <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 4 }}>
              Days out · {maxDays >= DAYS_MAX ? 'any' : `≤ ${maxDays}`}
            </div>
            <input type="range" min={7} max={DAYS_MAX} step={1} value={maxDays} onChange={(e) => setMaxDays(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
          </label>

          <label style={{ flex: '1 1 170px', maxWidth: 240 }}>
            <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 4 }}>
              Distance · {maxDist >= DIST_MAX ? 'any' : `≤ ${maxDist} km`}
            </div>
            <input type="range" min={5} max={DIST_MAX} step={5} value={maxDist} onChange={(e) => setMaxDist(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
          </label>

          {(
            [
              ['Multi-day', multiDayOnly, () => setMultiDayOnly((v) => !v)],
              ['Hide booked-out', hideBooked, () => setHideBooked((v) => !v)],
              [`Tags${activeTags.size ? ` (${activeTags.size})` : ''}`, tagsOpen, () => setTagsOpen((v) => !v)],
            ] as const
          ).map(([label, on, toggle]) => (
            <button
              key={label}
              type="button"
              onClick={toggle}
              className="caption"
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--r-pill)',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: on ? 'var(--primary)' : 'var(--hairline)',
                background: on ? 'var(--primary)' : 'var(--canvas)',
                color: on ? 'var(--on-primary)' : 'var(--ink-secondary)',
              }}
            >
              {label}
            </button>
          ))}

          <button type="button" className="pill-primary" style={{ fontSize: 12, padding: '7px 14px', marginLeft: 'auto' }} onClick={() => setLogOpen((v) => !v)}>
            {logOpen ? 'Close' : '+ Log a signal'}
          </button>
        </div>

        {tagsOpen && allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 12 }}>
            {allTags.map((t) => {
              const on = activeTags.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className="micro-cap"
                  style={{
                    cursor: 'pointer',
                    padding: '4px 10px',
                    borderRadius: 'var(--r-pill)',
                    border: '1px solid',
                    borderColor: on ? 'var(--primary)' : 'transparent',
                    background: on ? 'var(--primary)' : 'var(--primary-subdued)',
                    color: on ? 'var(--on-primary)' : 'var(--primary-deep)',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}

        <div className="caption tnum" style={{ marginTop: 10, color: 'var(--ink-mute)' }}>
          {visibleCount} of {opportunities.length} showing
          {hiddenBooked > 0 && ` · ${hiddenBooked} hidden (dates already booked)`}
          {hiddenNoLocation > 0 && ` · ${hiddenNoLocation} hidden (no location data)`}
          {(maxDays < DAYS_MAX || maxDist < DIST_MAX || activeTags.size > 0 || multiDayOnly || !hideBooked) && (
            <button
              type="button"
              onClick={() => {
                setMaxDays(DAYS_MAX);
                setMaxDist(DIST_MAX);
                setActiveTags(new Set());
                setMultiDayOnly(false);
                setHideBooked(true);
              }}
              className="caption"
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginLeft: 8 }}
            >
              reset
            </button>
          )}
          {notice && <span style={{ color: 'var(--primary-deep)' }}> · {notice}</span>}
        </div>

        {logOpen && (
          <form
            style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--hairline)' }}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const form = e.currentTarget;
              startTransition(async () => {
                const res = await logSignal({
                  kind: String(f.get('kind') ?? 'other'),
                  title: String(f.get('title') ?? ''),
                  start: String(f.get('start') ?? ''),
                  end: String(f.get('end') ?? '') || undefined,
                  venue: String(f.get('venue') ?? '') || undefined,
                  propertyId: String(f.get('property') ?? '') || undefined,
                  notes: String(f.get('notes') ?? '') || undefined,
                });
                setNotice(res.message);
                if (res.ok) {
                  form.reset();
                  setLogOpen(false);
                  router.refresh();
                }
              });
            }}
          >
            <SignalField label="What is it">
              <select name="kind" defaultValue="wedding" style={fieldStyle}>
                <option value="wedding">Wedding</option>
                <option value="funeral">Funeral</option>
                <option value="corporate">Corporate / crew in town</option>
                <option value="construction">Construction project</option>
                <option value="sports">Sporting event</option>
                <option value="other">Other</option>
              </select>
            </SignalField>
            <SignalField label="Name it" grow>
              <input name="title" placeholder="e.g. Wedding at Ghost Rock — 120 guests" required style={fieldStyle} />
            </SignalField>
            <SignalField label="Date">
              <input name="start" type="date" required style={fieldStyle} />
            </SignalField>
            <SignalField label="End (optional)">
              <input name="end" type="date" style={fieldStyle} />
            </SignalField>
            <SignalField label="Where">
              <input name="venue" placeholder="venue / locality" style={fieldStyle} />
            </SignalField>
            <SignalField label="Best property">
              <select name="property" defaultValue="" style={fieldStyle}>
                <option value="">Auto</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </SignalField>
            <SignalField label="Notes" grow>
              <input name="notes" placeholder="who told you, expected numbers, anything useful" style={fieldStyle} />
            </SignalField>
            <button type="submit" className="pill-primary" style={{ fontSize: 12, padding: '9px 18px' }}>
              Add to feed
            </button>
          </form>
        )}
      </section>

      {/* ─── Top picks: the ones actually worth running with ─── */}
      {topPicks.length > 0 && view === 'list' && (
        <section style={{ marginBottom: 24 }}>
          <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 10 }}>
            Top picks · school holidays, big dates and near, high-scoring events
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {topPicks.map((o) => (
              <article
                key={o.id}
                className="card"
                style={{ padding: 18, borderLeft: `3px solid ${PROPERTY_HUES[o.columnId] ?? 'var(--primary)'}` }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <span className="micro-cap" style={{ background: '#d4a017', color: '#fff', padding: '3px 9px', borderRadius: 'var(--r-pill)' }}>
                    Top pick
                  </span>
                  <span className="micro-cap" style={{ color: PROPERTY_HUES[o.columnId] }}>{nameOf(o.columnId)}</span>
                  <span className="caption tnum" style={{ marginLeft: 'auto', color: 'var(--ink-mute)' }}>in {o.daysOut}d</span>
                </div>
                <h3 style={{ fontSize: 15.5, fontWeight: 500, lineHeight: 1.3, marginBottom: 4 }}>{o.title}</h3>
                <p className="caption" style={{ color: 'var(--ink-mute)', marginBottom: 10 }}>
                  {fmtDate(o.startDate)}
                  {o.endDate !== o.startDate ? ` – ${fmtDate(o.endDate)}` : ''}
                  {o.venue ? ` · ${o.venue}` : o.locality ? ` · ${o.locality}` : ''}
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button type="button" onClick={() => act(o.id, 'approved')} className="pill-primary" style={{ fontSize: 12, padding: '6px 14px' }}>
                    Approve
                  </button>
                  <button type="button" onClick={() => act(o.id, 'dismissed')} className="caption" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)' }}>
                    Dismiss
                  </button>
                  <span className="caption tnum" style={{ marginLeft: 'auto', color: 'var(--primary-deep)' }}>score {o.columnScore}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {view === 'calendar' ? (
        <OpportunityCalendar rows={flat} nameOf={nameOf} act={act} />
      ) : (
        /* ─── Three property columns ─── */
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
          {properties.map((p) => {
            const list = columns.get(p.id) ?? [];
            return (
              <div key={p.id} style={{ display: 'grid', gap: 10 }}>
                <div
                  className="card"
                  style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderTop: `3px solid ${PROPERTY_HUES[p.id] ?? 'var(--primary)'}` }}
                >
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 500 }}>{p.name}</div>
                    <div className="micro-cap" style={{ color: 'var(--ink-mute)' }}>{p.locality}</div>
                  </div>
                  <span
                    className="tnum caption"
                    style={{ marginLeft: 'auto', background: 'var(--canvas-soft)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-pill)', padding: '3px 10px' }}
                  >
                    {list.length}
                  </span>
                </div>

                {list.length === 0 ? (
                  <div className="caption" style={{ padding: 22, textAlign: 'center', border: '1px dashed var(--hairline)', borderRadius: 'var(--r-lg)', color: 'var(--ink-mute)' }}>
                    Nothing matches the current filters.
                  </div>
                ) : (
                  list.map((o) => {
                    const score = o.scores[p.id];
                    const link = o.url ?? o.sourceUrl;
                    const golden = isGolden(o);
                    const hot = isHot(o);
                    return (
                      <article
                        key={o.id}
                        className="card"
                        style={{
                          padding: 16,
                          borderLeft: golden || hot ? `3px solid ${golden ? '#d4a017' : PROPERTY_HUES[p.id] ?? 'var(--primary)'}` : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          {(golden || hot) && (
                            <span className="micro-cap" style={{ color: golden ? '#a87d0d' : PROPERTY_HUES[p.id], fontWeight: 500 }}>
                              {golden ? 'Top pick' : 'Big date'}
                            </span>
                          )}
                          <span className="caption tnum" style={{ color: 'var(--ink-mute)' }}>
                            {fmtDate(o.startDate)}
                            {o.endDate !== o.startDate ? ` – ${fmtDate(o.endDate)}` : ''} · in {o.daysOut}d
                            {o.distanceKm != null && ` · ${Math.round(o.distanceKm)} km`}
                          </span>
                        </div>

                        <h3 style={{ fontSize: 15.5, fontWeight: 500, letterSpacing: '-0.1px', lineHeight: 1.3, marginBottom: 2 }}>
                          {link ? (
                            <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{o.title}</a>
                          ) : (
                            o.title
                          )}
                        </h3>
                        {(o.venue || o.locality) && (
                          <p className="caption" style={{ color: 'var(--ink-mute)', marginBottom: 6 }}>
                            {[o.venue, o.locality].filter(Boolean).join(' · ')}
                          </p>
                        )}

                        {o.summary && (
                          <p className="caption" style={{ color: 'var(--ink-secondary)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {o.summary}
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }} className="caption tnum">
                          {score && <span style={{ color: 'var(--primary-deep)' }}>score {score.total}</span>}
                          {o.demand != null && <span style={{ color: 'var(--ink-mute)' }}>demand {o.demand}</span>}
                          {o.availabilityBadge && (
                            <span style={{ color: o.bookedOut ? 'var(--ruby)' : 'var(--ink-mute)' }}>
                              {o.bookedOut ? 'booked out' : o.availabilityBadge}
                            </span>
                          )}
                          {o.tags.slice(0, 3).map((t) => (
                            <span key={t} className="micro-cap" style={{ background: 'var(--canvas-soft)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-pill)', padding: '2px 8px', color: 'var(--ink-mute)' }}>
                              {t}
                            </span>
                          ))}
                        </div>

                        {score && score.rationale.length > 0 && (
                          <details style={{ marginBottom: 10 }}>
                            <summary className="caption" style={{ cursor: 'pointer', color: 'var(--primary)' }}>Why here?</summary>
                            <ul style={{ margin: '6px 0 0 16px' }}>
                              {score.rationale.map((r, i) => (
                                <li key={i} className="caption" style={{ marginBottom: 3 }}>{r}</li>
                              ))}
                            </ul>
                          </details>
                        )}

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          <button type="button" onClick={() => act(o.id, 'approved')} className="pill-primary" style={{ fontSize: 12, padding: '6px 14px' }}>
                            Approve
                          </button>
                          <button type="button" onClick={() => act(o.id, 'modified')} className="caption" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                            Modify
                          </button>
                          <button type="button" onClick={() => act(o.id, 'dismissed')} className="caption" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)' }}>
                            Dismiss
                          </button>
                          {(o.url || o.sourceUrl) && (
                            <a href={(o.url ?? o.sourceUrl)!} target="_blank" rel="noopener noreferrer" className="caption" style={{ marginLeft: 'auto', color: 'var(--ink-mute)' }}>
                              {o.source ?? 'source'} ↗
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

/* ─── Month calendar of demand ─── */
function OpportunityCalendar({
  rows,
  nameOf,
  act,
}: {
  rows: Row[];
  nameOf: (pid: string) => string;
  act: (id: string, status: 'approved' | 'modified' | 'dismissed') => void;
}) {
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthLabel = month.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  const firstDow = (month.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const iso = (d: number) =>
    `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const eventsOn = (date: string) => rows.filter((r) => r.startDate <= date && r.endDate >= date);
  const todayIso = today.toISOString().slice(0, 10);
  const dayList = selectedDay ? eventsOn(selectedDay) : [];

  return (
    <section>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button type="button" className="caption" style={navBtn} onClick={() => { setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); setSelectedDay(null); }}>
            ‹
          </button>
          <span style={{ fontSize: 16, fontWeight: 500, minWidth: 150, textAlign: 'center' }}>{monthLabel}</span>
          <button type="button" className="caption" style={navBtn} onClick={() => { setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); setSelectedDay(null); }}>
            ›
          </button>
          <span className="caption" style={{ marginLeft: 'auto', color: 'var(--ink-mute)' }}>
            Coloured bars are demand signals; click a day for details.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="micro-cap" style={{ textAlign: 'center', color: 'var(--ink-mute)', padding: '4px 0' }}>{d}</div>
          ))}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`pad${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const date = iso(d);
            const evs = eventsOn(date);
            const isToday = date === todayIso;
            const isSel = date === selectedDay;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDay(isSel ? null : date)}
                style={{
                  minHeight: 76,
                  padding: 6,
                  textAlign: 'left',
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: isSel ? 'var(--primary)' : 'var(--hairline)',
                  background: isSel ? 'var(--primary-subdued)' : 'var(--canvas)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  overflow: 'hidden',
                }}
              >
                <span
                  className="caption tnum"
                  style={{
                    fontWeight: isToday ? 600 : 400,
                    color: isToday ? 'var(--on-primary)' : 'var(--ink-mute)',
                    background: isToday ? 'var(--primary)' : 'transparent',
                    borderRadius: 'var(--r-pill)',
                    padding: isToday ? '1px 7px' : 0,
                    alignSelf: 'flex-start',
                  }}
                >
                  {d}
                </span>
                {evs.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    title={e.title}
                    style={{
                      fontSize: 10,
                      lineHeight: 1.2,
                      padding: '2px 5px',
                      borderRadius: 4,
                      background: `${PROPERTY_HUES[e.columnId] ?? '#666'}22`,
                      color: PROPERTY_HUES[e.columnId] ?? 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}
                  >
                    {e.title}
                  </span>
                ))}
                {evs.length > 3 && (
                  <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>+{evs.length - 3} more</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          <div className="micro-cap" style={{ color: 'var(--ink-mute)' }}>
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
            {dayList.length === 0 && ' · no demand signals'}
          </div>
          {dayList.map((o) => (
            <article key={o.id} className="card" style={{ padding: 16, borderLeft: `3px solid ${PROPERTY_HUES[o.columnId] ?? 'var(--primary)'}` }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14.5, fontWeight: 500 }}>{o.title}</strong>
                <span className="caption" style={{ color: 'var(--ink-mute)' }}>
                  {nameOf(o.columnId)} · {fmtDate(o.startDate)}
                  {o.endDate !== o.startDate ? ` – ${fmtDate(o.endDate)}` : ''}
                  {o.venue ? ` · ${o.venue}` : ''}
                </span>
                <span style={{ flex: 1 }} />
                <button type="button" onClick={() => act(o.id, 'approved')} className="pill-primary" style={{ fontSize: 11, padding: '5px 12px' }}>
                  Approve
                </button>
                <button type="button" onClick={() => act(o.id, 'dismissed')} className="caption" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)' }}>
                  Dismiss
                </button>
              </div>
              {o.summary && <p className="caption" style={{ color: 'var(--ink-secondary)', marginTop: 6 }}>{o.summary}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const navBtn: React.CSSProperties = {
  border: '1px solid var(--hairline)',
  background: 'var(--canvas)',
  borderRadius: 8,
  width: 30,
  height: 30,
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
};

const fieldStyle: React.CSSProperties = {
  border: '1px solid var(--hairline)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  background: 'var(--canvas)',
  color: 'var(--ink)',
  width: '100%',
};

function SignalField({ label, grow, children }: { label: string; grow?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4, flex: grow ? '1 1 220px' : '0 1 auto', minWidth: grow ? 220 : 130 }}>
      <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      {children}
    </label>
  );
}
