'use client';

import { useState, useTransition } from 'react';
import { updatePost, setPostStatus, publishPost, draftPost, renderReel } from '@/app/(admin)/social/actions';
import Segmented from '@/components/Segmented';

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
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<'instagram' | 'facebook'>('instagram');

  const mediaById = new Map(media.map((m) => [m.id, m]));

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setNotice(res.message);
    });

  const active = posts.filter((p) => !['dismissed'].includes(p.status));

  return (
    <div>
      {/* ── Queue toolbar ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 className="heading-md" style={{ fontSize: 17 }}>Queue</h2>
        <span
          className="caption"
          style={{
            padding: '3px 10px',
            borderRadius: 'var(--r-pill)',
            background: metaConnected ? '#e5f5ec' : 'var(--canvas-soft)',
            color: metaConnected ? '#1d7a4a' : 'var(--ink-mute)',
            border: '1px solid',
            borderColor: metaConnected ? '#bfe5d0' : 'var(--hairline)',
          }}
        >
          {metaConnected ? 'Meta connected' : 'Meta not connected — manual posting for now'}
        </span>
        <span style={{ flex: 1 }} />
        <span className="caption">Quick draft:</span>
        <Segmented
          size="sm"
          items={PROPERTIES.map((p) => ({
            id: p.id,
            label: p.name.replace('The Prescription Pad', 'Rx Pad').replace(' Bakers', ''),
          }))}
          activeId={null}
          onSelect={(id) => !pending && run(() => draftPost(id, 'post'))}
        />
        {notice && <span className="caption">{notice}</span>}
      </div>

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
                      {p.kind === 'reel' && (
                        <button
                          type="button"
                          disabled={pending}
                          className="pill-primary"
                          style={{ fontSize: 12, padding: '6px 14px', background: 'var(--canvas)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                          onClick={() => {
                            const filter = (window.prompt('Filter: warm, cool, mono, punchy or none', 'warm') ?? 'warm') as 'warm' | 'cool' | 'mono' | 'punchy' | 'none';
                            const caption = window.prompt('Overlay caption on the video (optional)') ?? undefined;
                            const max = Number(window.prompt('Max clips to use (uses fewer if fewer exist)', '5')) || 5;
                            run(() => renderReel(p.id, { filter, caption, clipCount: max }));
                          }}
                        >
                          Render multi-clip reel
                        </button>
                      )}
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
                  <button
                    type="button"
                    className="pill-primary"
                    style={{ fontSize: 12, padding: '6px 14px', background: 'var(--canvas)', color: 'var(--primary)', border: '1px solid var(--primary-subdued)', marginLeft: 'auto' }}
                    onClick={() => setPreviewing(previewing === p.id ? null : p.id)}
                  >
                    {previewing === p.id ? 'Hide preview' : 'Preview'}
                  </button>
                </div>

                {previewing === p.id && (
                  <PostPreview
                    platform={previewPlatform}
                    onPlatform={setPreviewPlatform}
                    propertyName={PROPERTIES.find((x) => x.id === p.property_id)?.name ?? 'Property'}
                    caption={p.caption}
                    media={items[0] ?? null}
                    kind={p.kind}
                  />
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Phone-framed mock of how the post will look on Instagram / Facebook. */
function PostPreview({
  platform,
  onPlatform,
  propertyName,
  caption,
  media,
  kind,
}: {
  platform: 'instagram' | 'facebook';
  onPlatform: (p: 'instagram' | 'facebook') => void;
  propertyName: string;
  caption: string;
  media: MediaRef | null;
  kind: string;
}) {
  const handle = propertyName.toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]+/g, '');
  const isReel = kind === 'reel' || kind === 'story';
  const firstLine = caption.split('\n').find((l) => l.trim()) ?? '';

  const mediaEl = media ? (
    media.kind === 'video' ? (
      <video src={media.public_url} muted loop playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={media.public_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    )
  ) : (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#999', fontSize: 12 }}>no media</div>
  );

  return (
    <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 14, display: 'grid', gap: 10, justifyItems: 'start' }}>
      {/* platform toggle */}
      <div style={{ display: 'inline-flex', padding: 3, borderRadius: 'var(--r-pill)', background: 'var(--canvas-soft)', border: '1px solid var(--hairline)' }}>
        {(['instagram', 'facebook'] as const).map((pf) => (
          <button
            key={pf}
            type="button"
            onClick={() => onPlatform(pf)}
            style={{
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: platform === pf ? 500 : 400,
              padding: '5px 14px',
              borderRadius: 'var(--r-pill)',
              background: platform === pf ? 'var(--canvas)' : 'transparent',
              color: platform === pf ? 'var(--ink)' : 'var(--ink-mute)',
              boxShadow: platform === pf ? 'var(--shadow-1)' : 'none',
            }}
          >
            {pf === 'instagram' ? 'Instagram' : 'Facebook'}
          </button>
        ))}
      </div>

      {/* phone frame */}
      <div style={{ width: 300, border: '1px solid #d8dde4', borderRadius: 18, overflow: 'hidden', background: '#fff', boxShadow: 'var(--shadow-2)' }}>
        {platform === 'instagram' ? (
          <div style={{ fontFamily: '-apple-system, system-ui, sans-serif', color: '#111' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px' }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                {propertyName[0]}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{handle}</span>
              <span style={{ marginLeft: 'auto', fontSize: 16, color: '#111', letterSpacing: 2 }}>⋯</span>
            </div>
            <div style={{ aspectRatio: isReel ? '9 / 16' : '1 / 1', background: '#000', overflow: 'hidden' }}>{mediaEl}</div>
            <div style={{ display: 'flex', gap: 12, padding: '9px 10px 4px', alignItems: 'center' }}>
              {[
                'M12 21s-7.5-4.7-9.7-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.7 12c-2.2 4.3-9.7 9-9.7 9z',
                'M21 11.5a8.5 8.5 0 1 1-3.2-6.6L21 3l-1 4.5a8.4 8.4 0 0 1 1 4z',
                'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
              ].map((d, i) => (
                <svg key={i} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={d} />
                </svg>
              ))}
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111" strokeWidth="1.8" style={{ marginLeft: 'auto' }} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12v18l-6-4-6 4V3z" />
              </svg>
            </div>
            <div style={{ padding: '0 10px 12px', fontSize: 12.5, lineHeight: 1.45 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>128 likes</div>
              <span style={{ fontWeight: 600 }}>{handle}</span>{' '}
              <span style={{ whiteSpace: 'pre-wrap' }}>{caption.length > 140 ? caption.slice(0, 140).trimEnd() + '… ' : caption}</span>
              {caption.length > 140 && <span style={{ color: '#8e8e8e' }}>more</span>}
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: '-apple-system, system-ui, sans-serif', color: '#050505' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--brand-dark-900)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                {propertyName[0]}
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{propertyName}</div>
                <div style={{ fontSize: 11, color: '#65676b' }}>Just now · 🌐</div>
              </div>
            </div>
            <div style={{ padding: '0 12px 8px', fontSize: 13.5, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
              {caption.length > 200 ? caption.slice(0, 200).trimEnd() + '… ' : caption}
              {caption.length > 200 && <span style={{ color: '#65676b' }}>See more</span>}
            </div>
            <div style={{ aspectRatio: isReel ? '9 / 16' : '4 / 3', background: '#000', overflow: 'hidden' }}>{mediaEl}</div>
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0', borderTop: '1px solid #e4e6eb', margin: '0 12px', color: '#65676b', fontSize: 12.5, fontWeight: 600 }}>
              <span>Like</span>
              <span>Comment</span>
              <span>Share</span>
            </div>
          </div>
        )}
      </div>
      <p className="caption">Preview approximation — exact rendering varies by device.</p>
    </div>
  );
}
