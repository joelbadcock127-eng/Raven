'use client';

import { useState, useTransition } from 'react';
import { updatePost, setPostStatus, publishPost, renderReel, setPostMedia } from '@/app/(admin)/social/actions';
import ImageEditor from '@/components/ImageEditor';

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
  kind: 'image' | 'video' | 'audio';
  public_url: string;
  property_id?: string | null;
  tags?: string[] | null;
  file_name?: string | null;
  caption?: string | null;
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
  const [editImg, setEditImg] = useState<{ postId: string; mediaId: string; propertyId: string | null } | null>(null);
  const [reelFor, setReelFor] = useState<string | null>(null);

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
        <span className="caption" style={{ color: 'var(--ink-mute)' }}>New posts start in Posting plans above (recurring or one-off)</span>
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
                        <div key={m.id} style={{ position: 'relative' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.public_url} alt="" style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                          {p.status !== 'published' && (
                            <button
                              type="button"
                              onClick={() => setEditImg({ postId: p.id, mediaId: m.id, propertyId: p.property_id })}
                              className="caption"
                              style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 9px', cursor: 'pointer' }}
                            >
                              edit
                            </button>
                          )}
                        </div>
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
                          style={{ fontSize: 12, padding: '6px 14px', background: reelFor === p.id ? 'var(--primary)' : 'var(--canvas)', color: reelFor === p.id ? 'var(--on-primary)' : 'var(--primary)', border: '1px solid var(--primary)' }}
                          onClick={() => setReelFor(reelFor === p.id ? null : p.id)}
                        >
                          {reelFor === p.id ? 'Close reel builder' : 'Build reel'}
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

                {reelFor === p.id && (
                  <ReelBuilder
                    pending={pending}
                    defaultCaption={p.caption.split('\n')[0] ?? ''}
                    clipPool={media.filter(
                      (m) =>
                        m.property_id === p.property_id &&
                        (m.kind === 'image' || m.kind === 'video') &&
                        !(m.tags ?? []).includes('rendered-reel') &&
                        !(m.tags ?? []).includes('music'),
                    )}
                    musicPool={media.filter(
                      (m) =>
                        (m.tags ?? []).includes('music') &&
                        (m.property_id === p.property_id || m.property_id == null),
                    )}
                    onRender={(opts) => {
                      setReelFor(null);
                      run(() => renderReel(p.id, opts));
                    }}
                    onClose={() => setReelFor(null)}
                  />
                )}

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

      {editImg && (
        <ImageEditor
          asset={{ id: editImg.mediaId, property_id: editImg.propertyId, file_name: 'post-image' }}
          onClose={() => setEditImg(null)}
          onSaved={(newId) => {
            const post = posts.find((p) => p.id === editImg.postId);
            const nextIds = (post?.media_ids ?? []).map((id) => (id === editImg.mediaId ? newId : id));
            setEditImg(null);
            startTransition(async () => {
              const res = await setPostMedia(editImg.postId, nextIds);
              setNotice(res.message);
            });
          }}
        />
      )}
    </div>
  );
}

type ReelOpts = {
  source: 'auto' | 'videos' | 'photos';
  filter?: 'warm' | 'cool' | 'mono' | 'punchy' | 'none';
  clipCount: number;
  clipSeconds: number;
  transition: 'cut' | 'fade';
  aspect: '9:16' | '1:1' | '4:5';
  caption?: string;
  captionPosition: 'top' | 'middle' | 'bottom';
  captionSize: 'small' | 'medium' | 'large';
  captionTiming: 'whole' | 'intro';
  musicHint?: string;
  musicAssetId?: string;
  noMusic?: boolean;
  mediaIds?: string[];
};

/**
 * Inline reel builder. Auto mode picks least-used clips; Pick mode lets the
 * owner choose the exact clips and their play order. Grade defaults to the
 * property's style guide; transitions, aspect, clip length, caption styling
 * and the music track are all editable.
 */
function ReelBuilder({
  pending,
  defaultCaption,
  clipPool,
  musicPool,
  onRender,
  onClose,
}: {
  pending: boolean;
  defaultCaption: string;
  clipPool: MediaRef[];
  musicPool: MediaRef[];
  onRender: (opts: ReelOpts) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'auto' | 'pick'>('auto');
  const [source, setSource] = useState<'auto' | 'videos' | 'photos'>('auto');
  const [picked, setPicked] = useState<string[]>([]);
  const [filter, setFilter] = useState<'guide' | 'warm' | 'cool' | 'mono' | 'punchy' | 'none'>('guide');
  const [clipCount, setClipCount] = useState(5);
  const [clipSeconds, setClipSeconds] = useState(2.8);
  const [transition, setTransition] = useState<'cut' | 'fade'>('fade');
  const [aspect, setAspect] = useState<'9:16' | '1:1' | '4:5'>('9:16');
  const [caption, setCaption] = useState(defaultCaption);
  const [captionPosition, setCaptionPosition] = useState<'top' | 'middle' | 'bottom'>('bottom');
  const [captionSize, setCaptionSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [captionTiming, setCaptionTiming] = useState<'whole' | 'intro'>('whole');
  const [musicMode, setMusicMode] = useState<string>('auto'); // auto | none | asset id
  const [musicHint, setMusicHint] = useState('');

  const togglePick = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 10 ? cur : [...cur, id]));

  const seg = (val: string, cur: string, on: () => void, label: string) => (
    <button
      key={val}
      type="button"
      onClick={on}
      className="caption"
      style={{
        padding: '5px 12px', borderRadius: 'var(--r-pill)', cursor: 'pointer', border: '1px solid',
        borderColor: cur === val ? 'var(--primary)' : 'var(--hairline)',
        background: cur === val ? 'var(--primary)' : 'var(--canvas)',
        color: cur === val ? 'var(--on-primary)' : 'var(--ink-secondary)',
      }}
    >
      {label}
    </button>
  );

  const row = (label: string, children: React.ReactNode) => (
    <div>
      <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </div>
  );

  const trackName = (m: MediaRef) => m.caption || m.file_name || 'track';

  return (
    <div className="card" style={{ padding: 16, background: 'var(--canvas-soft)', display: 'grid', gap: 12 }}>
      {row('Clips', (
        <>
          {seg('auto', mode, () => setMode('auto'), 'Auto-pick')}
          {seg('pick', mode, () => setMode('pick'), `Choose clips${picked.length ? ` (${picked.length})` : ''}`)}
        </>
      ))}

      {mode === 'auto' ? (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'end' }}>
          {row('Build from', (
            <>
              {seg('auto', source, () => setSource('auto'), 'Video + photos')}
              {seg('videos', source, () => setSource('videos'), 'Videos only')}
              {seg('photos', source, () => setSource('photos'), 'Photos only (Ken Burns)')}
            </>
          ))}
          <label className="caption" style={{ display: 'grid', gap: 4 }}>
            <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Clips (max)</span>
            <input type="number" min={2} max={10} value={clipCount} onChange={(e) => setClipCount(Math.max(2, Math.min(10, Number(e.target.value) || 5)))} style={{ ...builderField, width: 70 }} />
          </label>
        </div>
      ) : clipPool.length === 0 ? (
        <p className="caption" style={{ color: 'var(--ink-mute)' }}>No source clips in the library for this property.</p>
      ) : (
        <div>
          <p className="caption" style={{ color: 'var(--ink-mute)', marginBottom: 8 }}>
            Click clips in the order they should play — the number is the play order. Click again to remove.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxHeight: 240, overflowY: 'auto' }}>
            {clipPool.map((m) => {
              const idx = picked.indexOf(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => togglePick(m.id)}
                  style={{ position: 'relative', padding: 0, border: idx >= 0 ? '2px solid var(--primary)' : '2px solid transparent', borderRadius: 10, cursor: 'pointer', background: 'none' }}
                >
                  {m.kind === 'video' ? (
                    <video src={m.public_url} muted preload="metadata" style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 8, display: 'block', background: '#000' }} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.public_url} alt="" style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                  )}
                  {m.kind === 'video' && (
                    <span className="micro-cap" style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,.6)', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>▶</span>
                  )}
                  {idx >= 0 && (
                    <span style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'var(--primary)', color: 'var(--on-primary)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600 }}>
                      {idx + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {row('Grade', (
        <>
          {seg('guide', filter, () => setFilter('guide'), 'Style guide')}
          {(['warm', 'cool', 'mono', 'punchy', 'none'] as const).map((f) => seg(f, filter, () => setFilter(f), f))}
        </>
      ))}

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        {row('Transition', (
          <>
            {seg('fade', transition, () => setTransition('fade'), 'Crossfade')}
            {seg('cut', transition, () => setTransition('cut'), 'Hard cut')}
          </>
        ))}
        {row('Aspect', (
          <>
            {seg('9:16', aspect, () => setAspect('9:16'), '9:16 reel')}
            {seg('4:5', aspect, () => setAspect('4:5'), '4:5 portrait')}
            {seg('1:1', aspect, () => setAspect('1:1'), '1:1 square')}
          </>
        ))}
        <label className="caption" style={{ display: 'grid', gap: 4 }}>
          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Seconds per clip</span>
          <input type="number" min={1.5} max={6} step={0.5} value={clipSeconds} onChange={(e) => setClipSeconds(Math.max(1.5, Math.min(6, Number(e.target.value) || 2.8)))} style={{ ...builderField, width: 80 }} />
        </label>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <label className="caption" style={{ display: 'grid', gap: 4 }}>
          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>On-screen text (optional, line breaks kept)</span>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} placeholder="short lines burned onto the video" style={{ ...builderField, resize: 'vertical' }} />
        </label>
        {caption.trim() && (
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {row('Text position', (
              <>
                {seg('top', captionPosition, () => setCaptionPosition('top'), 'Top')}
                {seg('middle', captionPosition, () => setCaptionPosition('middle'), 'Middle')}
                {seg('bottom', captionPosition, () => setCaptionPosition('bottom'), 'Bottom')}
              </>
            ))}
            {row('Text size', (
              <>
                {seg('small', captionSize, () => setCaptionSize('small'), 'Small')}
                {seg('medium', captionSize, () => setCaptionSize('medium'), 'Medium')}
                {seg('large', captionSize, () => setCaptionSize('large'), 'Large')}
              </>
            ))}
            {row('Text timing', (
              <>
                {seg('whole', captionTiming, () => setCaptionTiming('whole'), 'Whole reel')}
                {seg('intro', captionTiming, () => setCaptionTiming('intro'), 'First 3.5s')}
              </>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'end' }}>
        <label className="caption" style={{ display: 'grid', gap: 4, flex: '0 1 260px' }}>
          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Music</span>
          <select value={musicMode} onChange={(e) => setMusicMode(e.target.value)} style={builderField}>
            <option value="auto">Auto match (style guide / vibe)</option>
            <option value="none">No music</option>
            {musicPool.map((m) => (
              <option key={m.id} value={m.id}>{trackName(m)}</option>
            ))}
          </select>
        </label>
        {musicMode === 'auto' && (
          <label className="caption" style={{ display: 'grid', gap: 4, flex: '1 1 180px' }}>
            <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Music vibe (optional)</span>
            <input value={musicHint} onChange={(e) => setMusicHint(e.target.value)} placeholder="e.g. calm piano, upbeat" style={builderField} />
          </label>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="caption" style={{ color: 'var(--ink-mute)' }}>Renders on GitHub Actions, usually 2-5 min. It attaches itself when done.</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="caption" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)' }} onClick={onClose}>cancel</button>
        <button
          type="button"
          disabled={pending || (mode === 'pick' && picked.length < 2)}
          className="pill-primary"
          style={{ fontSize: 12, padding: '7px 16px' }}
          onClick={() =>
            onRender({
              source,
              filter: filter === 'guide' ? undefined : filter,
              clipCount,
              clipSeconds,
              transition,
              aspect,
              caption: caption.trim() || undefined,
              captionPosition,
              captionSize,
              captionTiming,
              musicHint: musicHint.trim() || undefined,
              musicAssetId: musicMode !== 'auto' && musicMode !== 'none' ? musicMode : undefined,
              noMusic: musicMode === 'none',
              mediaIds: mode === 'pick' ? picked : undefined,
            })
          }
        >
          {mode === 'pick' && picked.length < 2 ? 'Pick at least 2 clips' : 'Render reel'}
        </button>
      </div>
    </div>
  );
}

const builderField: React.CSSProperties = {
  font: 'inherit', fontSize: 13, padding: '7px 10px', borderRadius: 8,
  border: '1px solid var(--hairline-input)', background: 'var(--canvas)', width: '100%',
};

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
