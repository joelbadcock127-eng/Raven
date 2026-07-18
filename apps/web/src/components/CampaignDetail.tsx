'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  setCampaignStatus,
  recordRevenue,
  publishEventPage,
  publishCampaignGbp,
  boostCampaign,
  saveCampaignPlan,
  setDistributionStatus,
  setPlaybookDays,
} from '@/app/(admin)/campaigns/actions';
import { matchOffers, DISTRIBUTION_CHANNELS } from '@/lib/offers';

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
  property_id: string | null;
  target_start: string | null;
  target_end: string | null;
  offer: { id: string; name: string; pitch: string } | null;
  distribution: Record<string, 'todo' | 'done' | 'skipped'>;
  playbook: Record<string, number>;
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
    tags: string[] | null;
  } | null;
}

export const PIPELINE: Array<{ key: string; label: string }> = [
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
export function stepIndex(c: CampaignRow): number {
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

export default function CampaignDetail({ campaign: c }: { campaign: CampaignRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState('');
  const [preparing, setPreparing] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setNotice(res.message);
      router.refresh();
    });

  const prepare = async () => {
    setPreparing(true);
    setNotice('Generating landing page, posts, emails and outreach — 30-60 seconds…');
    try {
      const res = await fetch('/api/campaigns/prepare', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: c.id }),
      });
      const json = (await res.json()) as { ok: boolean; message: string };
      setNotice(json.message);
      if (json.ok) router.refresh();
    } catch (err) {
      setNotice(`Kit generation failed: ${(err as Error).message}`);
    } finally {
      setPreparing(false);
    }
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setNotice(`${label} copied`);
  };

  const editRevenue = () => {
    const rev = window.prompt('Revenue recorded for this campaign (AUD)', String(c.revenue));
    if (rev === null) return;
    const book = window.prompt('Number of bookings', String(c.bookings));
    if (book === null) return;
    run(() => recordRevenue(c.id, Number(rev) || 0, Number(book) || 0));
  };

  const step = stepIndex(c);
  const actions = NEXT_ACTIONS[c.status] ?? [];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ── header card: what + goal + offer ── */}
      <article className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 6 }}>
          <h2 className="heading-md">{c.event?.title ?? 'Unknown event'}</h2>
          <span className="caption">
            {c.property?.name ?? 'no property'} · {c.event?.start_date}
            {c.event && c.event.end_date !== c.event.start_date ? ` – ${c.event.end_date}` : ''}
          </span>
        </div>
        <p className="caption" style={{ marginBottom: 10 }}>
          {[c.event?.venue_name, c.event?.locality, c.event?.organiser ? `organiser: ${c.event.organiser}` : null]
            .filter(Boolean)
            .join(' · ')}
          {c.event?.ticket_url && (
            <>
              {' · '}
              <a href={c.event.ticket_url} target="_blank" rel="noopener noreferrer">tickets ↗</a>
            </>
          )}
          {c.event?.url && (
            <>
              {' · '}
              <a href={c.event.url} target="_blank" rel="noopener noreferrer">event site ↗</a>
            </>
          )}
        </p>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', background: 'var(--canvas-soft)', borderRadius: 10 }}>
          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Goal</span>
          <span className="caption tnum">
            fill{' '}
            <strong>
              {c.target_start ?? c.event?.start_date ?? '?'}
              {(c.target_end ?? c.event?.end_date) !== (c.target_start ?? c.event?.start_date)
                ? ` → ${c.target_end ?? c.event?.end_date}`
                : ''}
            </strong>
          </span>
          <button
            type="button"
            className="caption"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
            onClick={() => {
              const s = window.prompt('Target dates to fill — start (yyyy-mm-dd)', c.target_start ?? c.event?.start_date ?? '');
              if (s === null) return;
              const e2 = window.prompt('End (yyyy-mm-dd)', c.target_end ?? c.event?.end_date ?? s);
              if (e2 === null) return;
              run(() => saveCampaignPlan(c.id, { targetStart: s, targetEnd: e2 }));
            }}
          >
            edit dates
          </button>
          <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--hairline)' }} />
          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Offer</span>
          <select
            value={c.offer?.id ?? ''}
            disabled={pending}
            onChange={(e) => run(() => saveCampaignPlan(c.id, { offerId: e.target.value || null }))}
            className="caption"
            style={{ border: '1px solid var(--hairline)', borderRadius: 8, padding: '5px 8px', background: 'var(--canvas)', color: 'var(--ink)', maxWidth: 260 }}
          >
            <option value="">No offer — plain event stay</option>
            {matchOffers(c.property_id, c.event?.tags ?? []).map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          {c.offer && <span className="caption" style={{ flexBasis: '100%', color: 'var(--ink-secondary)' }}>{c.offer.pitch}</span>}
        </div>

        {/* pipeline strip */}
        <ol style={{ display: 'flex', gap: 4, flexWrap: 'wrap', listStyle: 'none', margin: '14px 0 0' }}>
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

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
          <span className="caption tnum">
            revenue ${Number(c.revenue).toFixed(2)} · {c.bookings} booking{c.bookings === 1 ? '' : 's'}
            {c.kit?.promoCode && <> · code <strong>{c.kit.promoCode}</strong></>}
          </span>
          <button type="button" className="caption" onClick={editRevenue} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
            record revenue
          </button>
          <span style={{ flex: 1 }} />
          {!c.kit?.generatedAt && (
            <button type="button" disabled={preparing} className="pill-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={prepare}>
              {preparing ? 'Generating…' : 'Prepare campaign kit'}
            </button>
          )}
          {c.kit?.generatedAt && (
            <button type="button" disabled={preparing} className="caption" style={{ background: 'none', border: '1px solid var(--hairline)', borderRadius: 'var(--r-pill)', padding: '5px 12px', cursor: 'pointer', color: 'var(--ink-secondary)' }} onClick={prepare}>
              {preparing ? 'Regenerating…' : 'Regenerate kit'}
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
        {notice && <p className="caption" style={{ marginTop: 10, color: 'var(--primary-deep)' }}>{notice}</p>}
      </article>

      {/* ── distribution playbook: cheap channels first, escalate as dates near ── */}
      <article className="card" style={{ padding: 24 }}>
        <h3 className="heading-md" style={{ marginBottom: 4 }}>Distribution playbook</h3>
        <p className="caption" style={{ marginBottom: 14 }}>
          Channels fire in sequence: free and organic first, paid last, each switching on a set
          number of days before the target date. If the dates are still open when a channel comes
          due, it lights up here. Click the days to change when a channel unlocks; click a channel
          to cycle to do → done → skipped.
        </p>
        {(() => {
          const targetStart = c.target_start ?? c.event?.start_date ?? null;
          const daysLeft = targetStart
            ? Math.round((Date.parse(targetStart) - Date.now()) / 86_400_000)
            : null;
          const rows = DISTRIBUTION_CHANNELS
            .map((ch) => ({ ...ch, daysOut: c.playbook?.[ch.id] ?? ch.daysOut }))
            .sort((a, b) => b.daysOut - a.daysOut);
          return (
            <div style={{ display: 'grid', gap: 8 }}>
              {daysLeft != null && (
                <p className="caption tnum" style={{ marginBottom: 4 }}>
                  {daysLeft >= 0 ? `${daysLeft} days until the target dates.` : 'Target dates have passed.'}
                </p>
              )}
              {rows.map((ch) => {
                const st = c.distribution?.[ch.id] ?? 'todo';
                const next = st === 'todo' ? 'done' : st === 'done' ? 'skipped' : 'todo';
                const due = st === 'todo' && daysLeft != null && daysLeft >= 0 && daysLeft <= ch.daysOut;
                const waiting = st === 'todo' && daysLeft != null && daysLeft > ch.daysOut;
                return (
                  <div
                    key={ch.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: due ? '#fff3d6' : 'transparent',
                      opacity: waiting ? 0.65 : 1,
                    }}
                  >
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => setDistributionStatus(c.id, ch.id, next))}
                      className="caption"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        width: 150,
                        padding: '6px 12px',
                        borderRadius: 'var(--r-pill)',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: st === 'done' ? 'var(--primary)' : due ? '#c99a1f' : 'var(--hairline)',
                        background: st === 'done' ? 'var(--primary-subdued)' : 'var(--canvas)',
                        color: st === 'skipped' ? 'var(--ink-mute)' : st === 'done' ? 'var(--primary-deep)' : 'var(--ink-secondary)',
                        textDecoration: st === 'skipped' ? 'line-through' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 11 }}>{st === 'done' ? '✓' : st === 'skipped' ? '–' : '○'}</span>
                      {ch.label}
                    </button>
                    <button
                      type="button"
                      className="caption tnum"
                      title="Change when this channel unlocks"
                      onClick={() => {
                        const v = window.prompt(`${ch.label}: switch on how many days before the target date?`, String(ch.daysOut));
                        if (v !== null && v.trim() !== '') run(() => setPlaybookDays(c.id, ch.id, Number(v) || ch.daysOut));
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', width: 84, textAlign: 'left' }}
                    >
                      {ch.daysOut}d out
                    </button>
                    {due && <span className="micro-cap" style={{ color: '#8a6410' }}>due now</span>}
                    {waiting && daysLeft != null && (
                      <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>unlocks in {daysLeft - ch.daysOut}d</span>
                    )}
                    <span className="caption" style={{ color: 'var(--ink-mute)', flex: 1, minWidth: 200 }}>{ch.hint}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </article>

      {/* ── kit assets ── */}
      <article className="card" style={{ padding: 24 }}>
        <h3 className="heading-md" style={{ marginBottom: 14 }}>Campaign kit</h3>
        {!c.kit?.generatedAt && (
          <p className="caption">No kit yet — Prepare campaign kit above generates the landing page, posts, reel, emails, outreach and promo code.</p>
        )}
        {c.kit?.generatedAt && (
          <div style={{ display: 'grid', gap: 14 }}>
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

            {c.kit.guestEmail && (
              <KitText
                label="Guest email"
                title={c.kit.guestEmail.subject}
                body={c.kit.guestEmail.body}
                onCopy={() => copy(`Subject: ${c.kit.guestEmail!.subject}\n\n${c.kit.guestEmail!.body}`, 'Guest email')}
              />
            )}

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
