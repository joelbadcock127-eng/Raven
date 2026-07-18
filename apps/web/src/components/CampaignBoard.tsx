'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  setCampaignStatus,
  recordRevenue,
  publishEventPage,
  publishCampaignGbp,
  boostCampaign,
} from '@/app/(admin)/campaigns/actions';

export interface CampaignKit {
  guestEmail?: { subject: string; body: string };
  organiserOutreach?: { subject: string; body: string; organiser: string | null };
  gbpPost?: string;
  promoCode?: string;
  generatedAt?: string;
}

export interface CampaignRow {
  id: string;
  status: string;
  assets: Record<string, string>;
  kit: CampaignKit;
  landing_page_slug: string | null;
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState('');
  const [preparing, setPreparing] = useState<string | null>(null);
  const [openKit, setOpenKit] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setNotice(res.message);
    });

  const prepare = async (id: string) => {
    setPreparing(id);
    setNotice('Generating landing page, posts, emails and outreach — 30-60 seconds…');
    try {
      const res = await fetch('/api/campaigns/prepare', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json()) as { ok: boolean; message: string };
      setNotice(json.message);
      if (json.ok) {
        setOpenKit(id);
        router.refresh();
      }
    } catch (err) {
      setNotice(`Kit generation failed: ${(err as Error).message}`);
    } finally {
      setPreparing(null);
    }
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setNotice(`${label} copied`);
  };

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
                {c.kit?.promoCode && <> · code <strong>{c.kit.promoCode}</strong></>}
              </span>
              <button type="button" className="caption" onClick={() => editRevenue(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                record revenue
              </button>
              <span style={{ flex: 1 }} />
              {!c.kit?.generatedAt && (
                <button
                  type="button"
                  disabled={preparing !== null}
                  className="pill-primary"
                  style={{ fontSize: 12, padding: '6px 14px' }}
                  onClick={() => prepare(c.id)}
                >
                  {preparing === c.id ? 'Generating…' : 'Prepare campaign kit'}
                </button>
              )}
              {c.kit?.generatedAt && (
                <button
                  type="button"
                  className="pill-primary"
                  style={{ fontSize: 12, padding: '6px 14px', background: 'var(--canvas)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                  onClick={() => setOpenKit(openKit === c.id ? null : c.id)}
                >
                  {openKit === c.id ? 'Hide kit' : 'View kit'}
                </button>
              )}
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

            {openKit === c.id && c.kit?.generatedAt && (
              <div style={{ marginTop: 18, display: 'grid', gap: 14, borderTop: '1px solid var(--hairline)', paddingTop: 18 }}>
                {/* landing page */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="micro-cap" style={{ width: 110, color: 'var(--ink-mute)' }}>Landing page</span>
                  {c.landing_page_slug ? (
                    <>
                      <a href={`/events/${c.landing_page_slug}`} target="_blank" rel="noopener noreferrer" className="caption">
                        /events/{c.landing_page_slug} ↗
                      </a>
                      {c.assets?.page !== 'published' && (
                        <button type="button" disabled={pending} className="pill-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => run(() => publishEventPage(c.id))}>
                          Publish page
                        </button>
                      )}
                      {c.assets?.page === 'published' && <span className="caption" style={{ color: '#2f9e63' }}>live</span>}
                    </>
                  ) : (
                    <span className="caption">not generated</span>
                  )}
                </div>

                {/* social */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="micro-cap" style={{ width: 110, color: 'var(--ink-mute)' }}>Social</span>
                  <a href="/social" className="caption">posts &amp; reel drafted → approve in the Social queue</a>
                  <button
                    type="button"
                    disabled={pending}
                    className="pill-primary"
                    style={{ fontSize: 11, padding: '4px 10px', background: 'var(--canvas)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                    onClick={() => {
                      const budget = window.prompt('Daily ad budget (AUD) — runs until the event, created paused for review', '25');
                      if (budget) run(() => boostCampaign(c.id, Number(budget) || 25));
                    }}
                  >
                    Boost on Meta
                  </button>
                </div>

                {/* guest email */}
                {c.kit.guestEmail && (
                  <KitText
                    label="Guest email"
                    title={c.kit.guestEmail.subject}
                    body={c.kit.guestEmail.body}
                    onCopy={() => copy(`Subject: ${c.kit.guestEmail!.subject}\n\n${c.kit.guestEmail!.body}`, 'Guest email')}
                  />
                )}

                {/* organiser outreach */}
                {c.kit.organiserOutreach && (
                  <KitText
                    label={`Organiser outreach${c.kit.organiserOutreach.organiser ? ` — ${c.kit.organiserOutreach.organiser}` : ''}`}
                    title={c.kit.organiserOutreach.subject}
                    body={c.kit.organiserOutreach.body}
                    onCopy={() => copy(`Subject: ${c.kit.organiserOutreach!.subject}\n\n${c.kit.organiserOutreach!.body}`, 'Outreach email')}
                    extra={
                      <a
                        className="caption"
                        href={`mailto:?subject=${encodeURIComponent(c.kit.organiserOutreach.subject)}&body=${encodeURIComponent(c.kit.organiserOutreach.body)}`}
                      >
                        open in mail ↗
                      </a>
                    }
                  />
                )}

                {/* GBP */}
                {c.kit.gbpPost && (
                  <KitText
                    label="Google Business post"
                    body={c.kit.gbpPost}
                    onCopy={() => copy(c.kit.gbpPost!, 'GBP post')}
                    extra={
                      <button type="button" disabled={pending} className="pill-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => run(() => publishCampaignGbp(c.id))}>
                        Post to GBP
                      </button>
                    }
                  />
                )}

                {c.kit.promoCode && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="micro-cap" style={{ width: 110, color: 'var(--ink-mute)' }}>Promo code</span>
                    <span className="tnum" style={{ fontSize: 15 }}><strong>{c.kit.promoCode}</strong></span>
                    <span className="caption">create this code in Lodgify so bookings are attributable to the campaign</span>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function KitText({
  label,
  title,
  body,
  onCopy,
  extra,
}: {
  label: string;
  title?: string;
  body: string;
  onCopy: () => void;
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <span className="micro-cap" style={{ width: 110, color: 'var(--ink-mute)', paddingTop: 3 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 240 }}>
        {title && <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>}
        <p className="caption" style={{ whiteSpace: 'pre-wrap', maxHeight: open ? 'none' : 40, overflow: 'hidden' }}>
          {body}
        </p>
        <button type="button" className="caption" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0 }} onClick={() => setOpen(!open)}>
          {open ? 'collapse' : 'expand'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" className="caption" style={{ background: 'none', border: '1px solid var(--hairline)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', color: 'var(--ink-secondary)' }} onClick={onCopy}>
          copy
        </button>
        {extra}
      </div>
    </div>
  );
}
