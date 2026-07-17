'use client';

import { useState, useTransition } from 'react';
import { updatePost, setPostStatus, publishPost, draftPost } from '@/app/(admin)/social/actions';

export interface SocialPost {
  id: string;
  campaign_id: string | null;
  property_id: string | null;
  kind: string;
  platform: string;
  caption: string;
  media_ids: string[];
  scheduled_for: string | null;
  status: string;
  external_url: string | null;
  error: string | null;
  created_at: string;
}

export interface MediaRef {
  id: string;
  kind: 'image' | 'video';
  public_url: string;
}

const PROPERTIES = [
  { id: 'ten-fifty-bakers', name: 'Ten Fifty Bakers' },
  { id: 'prescription-pad', name: 'The Prescription Pad' },
  { id: 'annie-may', name: 'Annie May' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--primary-soft)',
  approved: 'var(--primary)',
  publishing: 'var(--primary-deep)',
  published: '#2f9e63',
  failed: 'var(--ruby)',
  dismissed: 'var(--ink-mute)',
};

export default function SocialQueue({
  posts,
  media,
  metaConnected,
}: {
  posts: SocialPost[];
  media: MediaRef[];
  metaConnected: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');

  const mediaById = new Map(media.map((m) => [m.id, m]));

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setNotice(res.message);
    });

  const active = posts.filter((p) => !['dismissed'].includes(p.status));

  return (
    <div>
      {/* ── Controls ── */}
      <section className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="caption">Draft one now:</span>
          {PROPERTIES.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={pending}
              onClick={() => run(() => draftPost(p.id, 'post'))}
              className="pill-primary"
              style={{ fontSize: 12, padding: '6px 12px', background: 'var(--canvas)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
            >
              {p.name}
            </button>
          ))}
          {notice && <span className="caption">{notice}</span>}
        </div>
        <p className="caption" style={{ marginTop: 10 }}>
          The social regular also runs automatically every 3 days — it drafts a post (or a reel when
          an unused video exists) per property and waits here for your approval.{' '}
          {metaConnected
            ? 'Meta API connected: approving then publishing goes straight to Instagram.'
            : 'Meta API not connected yet — approved posts show everything to copy across manually until META_ACCESS_TOKEN and IG_USER_ID are set.'}
        </p>
      </section>

      {/* ── Queue ── */}
      {active.length === 0 ? (
        <section className="card" style={{ padding: 32, maxWidth: 560 }}>
          <h2 className="heading-md">Queue is empty</h2>
          <p className="caption">Draft a post above, or wait for the 3-day regular.</p>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {active.map((p) => {
            const items = p.media_ids.map((id) => mediaById.get(id)).filter(Boolean) as MediaRef[];
            const isEditing = editing === p.id;
            return (
              <article key={p.id} className="card" style={{ padding: 24, display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span
                    className="micro-cap"
                    style={{
                      color: '#fff',
                      background: STATUS_COLORS[p.status] ?? 'var(--ink-mute)',
                      padding: '3px 8px',
                      borderRadius: 'var(--r-pill)',
                    }}
                  >
                    {p.status}
                  </span>
                  <span className="caption" style={{ color: 'var(--ink-secondary)' }}>
                    {PROPERTIES.find((x) => x.id === p.property_id)?.name ?? 'shared'} · {p.kind} ·{' '}
                    {p.platform}
                    {p.campaign_id ? ' · campaign' : ' · regular'}
                  </span>
                  {p.scheduled_for && <span className="caption tnum">for {p.scheduled_for}</span>}
                  {p.external_url && (
                    <a href={p.external_url} target="_blank" rel="noopener noreferrer" className="caption">
                      view live ↗
                    </a>
                  )}
                </div>

                {p.error && (
                  <p className="caption" style={{ color: 'var(--ruby)' }}>{p.error}</p>
                )}

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {/* media strip */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {items.map((m) =>
                      m.kind === 'video' ? (
                        <video key={m.id} src={m.public_url} controls preload="metadata" style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 8, background: '#000' }} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={m.id} src={m.public_url} alt="" style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 8 }} />
                      ),
                    )}
                    {items.length === 0 && (
                      <div className="caption" style={{ width: 140, height: 140, display: 'grid', placeItems: 'center', border: '1px dashed var(--hairline)', borderRadius: 8 }}>
                        no media
                      </div>
                    )}
                  </div>

                  {/* caption */}
                  <div style={{ flex: 1, minWidth: 260 }}>
                    {isEditing ? (
                      <>
                        <textarea
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          rows={6}
                          style={{ width: '100%', font: 'inherit', fontSize: 14, padding: 10, borderRadius: 8, border: '1px solid var(--hairline-input)', resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button
                            type="button"
                            className="pill-primary"
                            style={{ fontSize: 12, padding: '6px 12px' }}
                            onClick={() => {
                              setEditing(null);
                              run(() => updatePost(p.id, { caption: draftText }));
                            }}
                          >
                            Save caption
                          </button>
                          <button type="button" className="caption" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)' }} onClick={() => setEditing(null)}>
                            cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5 }}>
                        {p.caption || <span className="caption">No caption yet.</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {p.status === 'draft' && (
                    <>
                      <button type="button" disabled={pending} className="pill-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => run(() => setPostStatus(p.id, 'approved'))}>
                        Approve
                      </button>
                      <button
                        type="button"
                        className="pill-primary"
                        style={{ fontSize: 12, padding: '6px 14px', background: 'var(--canvas)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                        onClick={() => {
                          setEditing(p.id);
                          setDraftText(p.caption);
                        }}
                      >
                        Edit caption
                      </button>
                    </>
                  )}
                  {p.status === 'approved' && (
                    <button type="button" disabled={pending} className="pill-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => run(() => publishPost(p.id))}>
                      {metaConnected ? (pending ? 'Publishing…' : 'Publish now') : 'Publish (needs Meta API)'}
                    </button>
                  )}
                  {p.status === 'failed' && (
                    <button type="button" disabled={pending} className="pill-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => run(() => publishPost(p.id))}>
                      Retry publish
                    </button>
                  )}
                  {['draft', 'approved', 'failed'].includes(p.status) && (
                    <button
                      type="button"
                      disabled={pending}
                      className="pill-primary"
                      style={{ fontSize: 12, padding: '6px 14px', background: 'var(--canvas)', color: 'var(--ink-mute)', border: '1px solid var(--hairline)' }}
                      onClick={() => run(() => setPostStatus(p.id, 'dismissed'))}
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
