'use client';

import { useState, useTransition } from 'react';
import { setCampaignStatus, recordRevenue } from '@/app/campaigns/actions';

export interface CampaignRow {
  id: string;
  status: string;
  assets: Record<string, string>;
  revenue: number;
  bookings: number;
  started_at: string | null;
  stopped_at: string | null;
  created_at: string;
  property: { name: string } | null;
  event: {
    title: string;
    start_date: string;
    end_date: string;
    venue_name: string | null;
    locality: string | null;
    organiser: string | null;
    ticket_url: string | null;
    url: string | null;
  } | null;
}

const PIPELINE: Array<{ key: string; label: string }> = [
  { key: 'discovered', label: 'Event discovered' },
  { key: 'availability', label: 'Availability checked' },
  { key: 'property', label: 'Property selected' },
  { key: 'page', label: 'Event page' },
  { key: 'content', label: 'Reel · posts · email · outreach' },
  { key: 'approval', label: 'Owner approval' },
  { key: 'publish', label: 'Published' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'wrap', label: 'Stopped · revenue recorded' },
];

/** How far along the 9-step pipeline a campaign is, from its status + assets. */
function stepIndex(c: CampaignRow): number {
  switch (c.status) {
    case 'preparing': {
      const started = Object.values(c.assets ?? {}).some((v) => v !== 'todo');
      return started ? 4 : 3; // building page/content
    }
    case 'ready_for_approval':
      return 5;
    case 'approved':
      return 6;
    case 'live':
      return c.bookings > 0 ? 7 : 6;
    case 'stopped':
    case 'completed':
      return 8;
    default:
      return 3;
  }
}

const NEXT_ACTIONS: Record<string, Array<{ status: string; label: string }>> = {
  preparing: [{ status: 'ready_for_approval', label: 'Mark ready for approval' }],
  ready_for_approval: [{ status: 'approved', label: 'Approve campaign' }],
  approved: [{ status: 'live', label: 'Set live' }],
  live: [{ status: 'stopped', label: 'Stop campaign' }],
  stopped: [{ status: 'completed', label: 'Mark completed' }],
};

export default function CampaignBoard({ campaigns }: { campaigns: CampaignRow[] }) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState('');

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setNotice(res.message);
    });

  const editRevenue = (c: CampaignRow) => {
    const rev = window.prompt('Revenue recorded for this campaign (AUD)', String(c.revenue));
    if (rev === null) return;
    const book = window.prompt('Number of bookings', String(c.bookings));
    if (book === null) return;
    run(() => recordRevenue(c.id, Number(rev) || 0, Number(book) || 0));
  };

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
    <div style={{ display: 'grid', gap: 16 }}>
      {notice && <p className="caption">{notice}</p>}
      {campaigns.map((c) => {
        const step = stepIndex(c);
        const actions = NEXT_ACTIONS[c.status] ?? [];
        return (
          <article key={c.id} className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 6 }}>
              <h2 className="heading-md">{c.event?.title ?? 'Unknown event'}</h2>
              <span className="caption">
                {c.property?.name ?? 'no property'} ·{' '}
                {c.event?.start_date}
                {c.event && c.event.end_date !== c.event.start_date ? ` – ${c.event.end_date}` : ''}
              </span>
            </div>
            <p className="caption" style={{ marginBottom: 14 }}>
              {[c.event?.venue_name, c.event?.locality, c.event?.organiser ? `organiser: ${c.event.organiser}` : null]
                .filter(Boolean)
                .join(' · ')}
              {c.event?.ticket_url && (
                <>
                  {' · '}
                  <a href={c.event.ticket_url} target="_blank" rel="noopener noreferrer">tickets ↗</a>
                </>
              )}
            </p>

            {/* pipeline strip */}
            <ol style={{ display: 'flex', gap: 4, flexWrap: 'wrap', listStyle: 'none', margin: '0 0 14px' }}>
              {PIPELINE.map((s, i) => {
                const done = i <= step;
                return (
                  <li
                    key={s.key}
                    className="micro-cap"
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--r-pill)',
                      background: done ? 'var(--primary)' : 'var(--canvas-soft)',
                      color: done ? 'var(--on-primary)' : 'var(--ink-mute)',
                      border: `1px solid ${done ? 'var(--primary)' : 'var(--hairline)'}`,
                    }}
                  >
                    {i + 1}. {s.label}
                  </li>
                );
              })}
            </ol>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="caption tnum">
                revenue ${Number(c.revenue).toFixed(2)} · {c.bookings} booking{c.bookings === 1 ? '' : 's'}
              </span>
              <button type="button" className="caption" onClick={() => editRevenue(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                record revenue
              </button>
              <span style={{ flex: 1 }} />
              {actions.map((a) => (
                <button
                  key={a.status}
                  type="button"
                  disabled={pending}
                  className="pill-primary"
                  style={{ fontSize: 12, padding: '6px 14px' }}
                  onClick={() => run(() => setCampaignStatus(c.id, a.status))}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
