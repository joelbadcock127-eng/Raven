'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PIPELINE, stepIndex, type CampaignRow } from '@/components/CampaignDetail';
import { DISTRIBUTION_CHANNELS, channelPlan } from '@/lib/offers';

export type { CampaignRow } from '@/components/CampaignDetail';

/**
 * Campaigns overview — a broad, scannable board. Each campaign is one row:
 * what it is, what dates it exists to fill, how far along it is, and what
 * it has earned. Click through for the full detail page.
 */

const STATUS_LABEL: Record<string, string> = {
  preparing: 'Preparing',
  ready_for_approval: 'Needs approval',
  approved: 'Approved',
  live: 'Live',
  stopped: 'Stopped',
  completed: 'Completed',
};

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  preparing: { bg: 'var(--canvas-soft)', fg: 'var(--ink-secondary)' },
  ready_for_approval: { bg: '#fff3d6', fg: '#8a6410' },
  approved: { bg: 'var(--primary-subdued)', fg: 'var(--primary-deep)' },
  live: { bg: '#def4e6', fg: '#1f7a48' },
  stopped: { bg: '#fde5ec', fg: '#a12752' },
  completed: { bg: 'var(--canvas-soft)', fg: 'var(--ink-mute)' },
};

const FILTERS: Array<{ id: string; label: string; match: (c: CampaignRow) => boolean }> = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'active', label: 'Active', match: (c) => !['stopped', 'completed'].includes(c.status) },
  { id: 'needs-action', label: 'Needs action', match: (c) => c.status === 'ready_for_approval' || !c.kit?.generatedAt },
  { id: 'live', label: 'Live', match: (c) => c.status === 'live' },
  { id: 'done', label: 'Finished', match: (c) => ['stopped', 'completed'].includes(c.status) },
];

function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  return Math.round((Date.parse(date) - Date.now()) / 86_400_000);
}

export default function CampaignBoard({ campaigns }: { campaigns: CampaignRow[] }) {
  const [filter, setFilter] = useState('active');

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter) ?? FILTERS[0];
    return campaigns.filter(f.match);
  }, [campaigns, filter]);

  const totals = useMemo(
    () => ({
      revenue: campaigns.reduce((n, c) => n + Number(c.revenue || 0), 0),
      bookings: campaigns.reduce((n, c) => n + Number(c.bookings || 0), 0),
      live: campaigns.filter((c) => c.status === 'live').length,
      needing: campaigns.filter((c) => c.status === 'ready_for_approval' || !c.kit?.generatedAt).length,
    }),
    [campaigns],
  );

  if (campaigns.length === 0)
    return (
      <section className="card" style={{ padding: 32, maxWidth: 620 }}>
        <h2 className="heading-md" style={{ marginBottom: 8 }}>No campaigns yet</h2>
        <p className="caption">
          Approve an opportunity in the Feed and it opens a campaign here: Raven prepares the event
          page, reel, posts, email and organiser outreach; you approve; Raven publishes; bookings
          come in through Lodgify; the campaign stops and the revenue is recorded.
        </p>
      </section>
    );

  return (
    <div>
      {/* summary strip */}
      <section style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          [String(campaigns.length), 'campaigns'],
          [String(totals.live), 'live now'],
          [String(totals.needing), 'need your action'],
          [`$${totals.revenue.toFixed(0)}`, `revenue · ${totals.bookings} bookings`],
        ].map(([v, l]) => (
          <div key={l} className="card" style={{ padding: '14px 20px', minWidth: 130 }}>
            <div className="tnum" style={{ fontSize: 24, fontWeight: 500, lineHeight: 1.1 }}>{v}</div>
            <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </section>

      {/* filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className="caption"
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--r-pill)',
              cursor: 'pointer',
              border: '1px solid',
              borderColor: filter === f.id ? 'var(--primary)' : 'var(--hairline)',
              background: filter === f.id ? 'var(--primary)' : 'var(--canvas)',
              color: filter === f.id ? 'var(--on-primary)' : 'var(--ink-secondary)',
            }}
          >
            {f.label} ({campaigns.filter(f.match).length})
          </button>
        ))}
      </div>

      {/* campaign rows */}
      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map((c) => {
          const step = stepIndex(c);
          const sc = STATUS_COLOR[c.status] ?? STATUS_COLOR.preparing;
          const targetStart = c.target_start ?? c.event?.start_date ?? null;
          const targetEnd = c.target_end ?? c.event?.end_date ?? null;
          const lead = daysUntil(targetStart);
          const distDone = DISTRIBUTION_CHANNELS.filter((ch) => c.distribution?.[ch.id] === 'done').length;
          const needsAction = c.status === 'ready_for_approval' || !c.kit?.generatedAt;
          // the escalation ladder's next channel that is unlocked but not done
          const dueChannel =
            lead != null && lead >= 0
              ? channelPlan(c.playbook).find(
                  (ch) => (c.distribution?.[ch.id] ?? 'todo') === 'todo' && lead <= ch.daysOut,
                )
              : undefined;

          return (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="card"
              style={{ display: 'block', padding: '16px 20px', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span
                  className="micro-cap"
                  style={{ padding: '4px 10px', borderRadius: 'var(--r-pill)', background: sc.bg, color: sc.fg }}
                >
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
                <strong style={{ fontSize: 15.5, fontWeight: 500 }}>{c.event?.title ?? 'Unknown event'}</strong>
                <span className="caption">{c.property?.name ?? 'no property'}</span>
                {needsAction && (
                  <span className="micro-cap" style={{ color: '#8a6410' }}>
                    {!c.kit?.generatedAt ? 'kit not generated' : 'awaiting approval'}
                  </span>
                )}
                <span style={{ flex: 1 }} />
                <span className="caption tnum" style={{ color: 'var(--ink-mute)' }}>open ›</span>
              </div>

              <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                <span className="caption tnum">
                  fill <strong>{targetStart ?? '?'}{targetEnd && targetEnd !== targetStart ? ` → ${targetEnd}` : ''}</strong>
                  {lead != null && lead >= 0 && <span style={{ color: 'var(--ink-mute)' }}> · in {lead}d</span>}
                  {lead != null && lead < 0 && <span style={{ color: 'var(--ink-mute)' }}> · past</span>}
                </span>
                {c.offer && <span className="caption" style={{ color: 'var(--ink-secondary)' }}>{c.offer.name}</span>}
                <span className="caption tnum" style={{ color: 'var(--ink-mute)' }}>
                  distribution {distDone}/{DISTRIBUTION_CHANNELS.length}
                </span>
                {dueChannel && (
                  <span className="micro-cap" style={{ color: '#8a6410' }}>due: {dueChannel.label}</span>
                )}
                {Number(c.revenue) > 0 && (
                  <span className="caption tnum">${Number(c.revenue).toFixed(0)} · {c.bookings} bkg</span>
                )}

                {/* mini pipeline progress */}
                <span style={{ display: 'inline-flex', gap: 3, marginLeft: 'auto' }} title={`${step + 1}/9 — ${PIPELINE[step]?.label}`}>
                  {PIPELINE.map((s, i) => (
                    <span
                      key={s.key}
                      style={{
                        width: 14,
                        height: 5,
                        borderRadius: 3,
                        background: i <= step ? 'var(--primary)' : 'var(--hairline)',
                      }}
                    />
                  ))}
                </span>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="caption" style={{ padding: 12 }}>Nothing in this view.</p>
        )}
      </div>
    </div>
  );
}
