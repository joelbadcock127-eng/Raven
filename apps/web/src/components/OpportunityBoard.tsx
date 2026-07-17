'use client';

import { useMemo, useState, useTransition } from 'react';
import { setOpportunityStatus } from '@/app/(admin)/actions';

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
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
const PRIORITY_DOT = { high: 'var(--ruby)', medium: 'var(--primary-soft)', low: 'var(--ink-mute)' } as const;

const DAYS_MAX = 180; // slider right edge = no limit
const DIST_MAX = 200; // km; slider right edge = no limit

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
 * A "golden" opportunity: close to the property, lands in the campaign
 * sweet spot (enough lead time to market, near enough to feel urgent),
 * and scores strongly for the column's property or shows high AI demand.
 * Example: a horse-riding event at Bakers Beach in two months → Ten Fifty.
 */
function isGolden(
  o: BoardOpportunity & { daysOut: number; distanceKm: number | null; columnScore?: number },
): boolean {
  if (o.daysOut < 14 || o.daysOut > 130) return false;
  if (o.distanceKm == null || o.distanceKm > 30) return false;
  const score = o.columnScore ?? 0;
  return score >= 70 || (o.demand ?? 0) >= 70;
}

function fmtDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  });
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
  const [maxDays, setMaxDays] = useState(DAYS_MAX);
  const [maxDist, setMaxDist] = useState(DIST_MAX);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [handled, setHandled] = useState<Set<string>>(new Set()); // optimistic removals
  const [notice, setNotice] = useState('');
  const [, startTransition] = useTransition();

  const act = (id: string, status: 'approved' | 'modified' | 'dismissed') => {
    setHandled((prev) => new Set(prev).add(id)); // hide immediately
    startTransition(async () => {
      try {
        const res = await setOpportunityStatus(id, status);
        setNotice(res.message);
        if (!res.ok) setHandled((prev) => {
          const next = new Set(prev);
          next.delete(id); // bring the card back on failure
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

  // Assign each opportunity to its column, then filter per-column so the
  // distance limit is measured from that column's property.
  const { columns, hiddenNoLocation } = useMemo(() => {
    const cols = new Map<
      string,
      (BoardOpportunity & { daysOut: number; distanceKm: number | null; columnScore: number })[]
    >();
    for (const p of properties) cols.set(p.id, []);
    let noLoc = 0;

    for (const o of opportunities) {
      if (handled.has(o.id)) continue;
      const daysOut = daysUntil(o.startDate);
      if (daysOut < 0) continue;
      if (maxDays < DAYS_MAX && daysOut > maxDays) continue;
      if (activeTags.size > 0 && !o.tags.some((t) => activeTags.has(t))) continue;

      const colId = columnFor(o, properties);
      const prop = properties.find((p) => p.id === colId);
      if (!prop || !cols.has(colId)) continue;

      const distanceKm =
        o.lat != null && o.lon != null ? haversineKm(prop.lat, prop.lon, o.lat, o.lon) : null;

      if (maxDist < DIST_MAX) {
        if (distanceKm === null) {
          noLoc++;
          continue;
        }
        if (distanceKm > maxDist) continue;
      }

      cols.get(colId)!.push({ ...o, daysOut, distanceKm, columnScore: o.scores[colId]?.total ?? 0 });
    }

    for (const list of cols.values())
      list.sort(
        (a, b) =>
          Number(isGolden(b)) - Number(isGolden(a)) ||
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
          a.startDate.localeCompare(b.startDate),
      );

    return { columns: cols, hiddenNoLocation: noLoc };
  }, [opportunities, properties, maxDays, maxDist, activeTags, handled]);

  const visibleCount = [...columns.values()].reduce((n, l) => n + l.length, 0);

  return (
    <>
      {/* ─── Filter bar ─── */}
      <section className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ minWidth: 220 }}>
            <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 6 }}>
              Days out · {maxDays >= DAYS_MAX ? 'any' : `≤ ${maxDays} days`}
            </div>
            <input
              type="range"
              min={7}
              max={DAYS_MAX}
              step={1}
              value={maxDays}
              onChange={(e) => setMaxDays(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
          </label>

          <label style={{ minWidth: 220 }}>
            <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 6 }}>
              Distance from property · {maxDist >= DIST_MAX ? 'any' : `≤ ${maxDist} km`}
            </div>
            <input
              type="range"
              min={5}
              max={DIST_MAX}
              step={5}
              value={maxDist}
              onChange={(e) => setMaxDist(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
          </label>

          <div className="caption tnum" style={{ paddingBottom: 4 }}>
            {visibleCount} of {opportunities.length} showing
            {hiddenNoLocation > 0 && ` · ${hiddenNoLocation} hidden (no location data)`}
            {notice && <span style={{ color: 'var(--primary-deep)' }}> · {notice}</span>}
          </div>

          {(maxDays < DAYS_MAX || maxDist < DIST_MAX || activeTags.size > 0) && (
            <button
              type="button"
              onClick={() => {
                setMaxDays(DAYS_MAX);
                setMaxDist(DIST_MAX);
                setActiveTags(new Set());
              }}
              className="caption"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                paddingBottom: 4,
              }}
            >
              Reset filters
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
            {allTags.map((t) => {
              const on = activeTags.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className="tag-soft"
                  style={{
                    cursor: 'pointer',
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
      </section>

      {/* ─── Three property columns ─── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {properties.map((p) => {
          const list = columns.get(p.id) ?? [];
          return (
            <div key={p.id} style={{ display: 'grid', gap: 12 }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--brand-dark-900)',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 400 }}>{p.name}</div>
                  <div className="micro-cap" style={{ color: 'var(--primary-subdued)' }}>
                    {p.locality}
                  </div>
                </div>
                <span className="tnum" style={{ fontSize: 20 }}>{list.length}</span>
              </div>

              {list.length === 0 ? (
                <div
                  className="caption"
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    border: '1px dashed var(--hairline)',
                    borderRadius: 'var(--r-lg)',
                  }}
                >
                  Nothing matches the current filters.
                </div>
              ) : (
                list.map((o) => {
                  const score = o.scores[p.id];
                  const link = o.url ?? o.sourceUrl;
                  const golden = isGolden(o);
                  return (
                    <article
                      key={o.id}
                      className="card"
                      style={{ padding: 20, borderColor: golden ? '#d4a017' : undefined, boxShadow: golden ? '0 0 0 1px #d4a017' : undefined }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        {golden && (
                          <span className="micro-cap" style={{ background: '#d4a017', color: '#fff', padding: '3px 8px', borderRadius: 'var(--r-pill)' }}>
                            ★ golden
                          </span>
                        )}
                        <span
                          aria-hidden
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: PRIORITY_DOT[o.priority],
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                        <span className="caption tnum">
                          {fmtDate(o.startDate)}
                          {o.endDate !== o.startDate ? ` – ${fmtDate(o.endDate)}` : ''} · in {o.daysOut}d
                        </span>
                        {o.distanceKm != null && (
                          <span className="caption tnum">{Math.round(o.distanceKm)} km away</span>
                        )}
                      </div>

                      <h3 style={{ fontSize: 16, fontWeight: 400, letterSpacing: '-0.16px', marginBottom: 2 }}>
                        {link ? (
                          <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                            {o.title}
                          </a>
                        ) : (
                          o.title
                        )}
                      </h3>
                      <p className="caption" style={{ marginBottom: 8 }}>
                        {[o.venue, o.locality].filter(Boolean).join(' · ')}
                      </p>

                      {o.summary && (
                        <p className="caption" style={{ color: 'var(--ink-secondary)', marginBottom: 10 }}>
                          {o.summary}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }} className="caption tnum">
                        {score && <span style={{ color: 'var(--primary-deep)' }}>score {score.total}</span>}
                        {o.demand != null && <span>demand {o.demand}/100</span>}
                        {o.availabilityBadge && <span>{o.availabilityBadge}</span>}
                      </div>

                      {o.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                          {o.tags.map((t) => (
                            <span key={t} className="tag-soft">{t}</span>
                          ))}
                        </div>
                      )}

                      {score && score.rationale.length > 0 && (
                        <details style={{ marginBottom: 12 }}>
                          <summary className="caption" style={{ cursor: 'pointer', color: 'var(--primary)' }}>
                            Why here?
                          </summary>
                          <ul style={{ margin: '6px 0 0 16px' }}>
                            {score.rationale.map((r, i) => (
                              <li key={i} className="caption" style={{ marginBottom: 3 }}>{r}</li>
                            ))}
                          </ul>
                        </details>
                      )}

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button type="button" onClick={() => act(o.id, 'approved')} className="pill-primary" style={{ fontSize: 12, padding: '6px 12px' }}>
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => act(o.id, 'modified')}
                          className="pill-primary"
                          style={{ fontSize: 12, padding: '6px 12px', background: 'var(--canvas)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                        >
                          Modify
                        </button>
                        <button
                          type="button"
                          onClick={() => act(o.id, 'dismissed')}
                          className="pill-primary"
                          style={{ fontSize: 12, padding: '6px 12px', background: 'var(--canvas)', color: 'var(--ink-mute)', border: '1px solid var(--hairline)' }}
                        >
                          Dismiss
                        </button>
                        {o.sourceUrl && (
                          <a
                            href={o.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="caption"
                            style={{ marginLeft: 'auto' }}
                          >
                            Source{o.source ? `: ${o.source}` : ''} ↗
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
    </>
  );
}
