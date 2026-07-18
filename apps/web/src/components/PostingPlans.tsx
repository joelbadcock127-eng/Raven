'use client';

import { useState, useTransition } from 'react';
import { savePlan, setPlanActive, deletePlan, draftPost, type PlanInput } from '@/app/(admin)/social/actions';

export interface Plan {
  id: string;
  property_id: string;
  name: string;
  format: 'post' | 'reel' | 'story' | 'carousel';
  platform: 'instagram' | 'facebook' | 'both';
  every_days: number;
  direction: string | null;
  reuse_cooldown_days: number;
  allow_reuse: boolean;
  also_story: boolean;
  folder_id: string | null;
  max_clips: number;
  active: boolean;
  next_run_at: string;
}

export interface FolderRef {
  id: string;
  property_id: string | null;
  name: string;
}

const PROPERTIES = [
  { id: 'ten-fifty-bakers', name: 'Ten Fifty Bakers' },
  { id: 'prescription-pad', name: 'The Prescription Pad' },
  { id: 'annie-may', name: 'Annie May' },
];

const inputStyle: React.CSSProperties = {
  font: 'inherit',
  fontSize: 13,
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid var(--hairline-input)',
  background: 'var(--canvas)',
};

export default function PostingPlans({ plans, folders }: { plans: Plan[]; folders: FolderRef[] }) {
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<PlanInput>({
    propertyId: 'ten-fifty-bakers',
    name: '',
    format: 'post',
    platform: 'both',
    everyDays: 3,
    direction: '',
    reuseCooldownDays: 60,
    allowReuse: true,
    alsoStory: false,
    folderId: null,
    maxClips: 5,
  });

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setNotice(res.message);
      if (res.ok) setShowForm(false);
    });

  return (
    <section className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <h2 className="heading-md">Posting plans</h2>
        <span className="caption">the schedule Raven drafts to — every draft still waits for your approval</span>
        <button
          type="button"
          className="pill-primary"
          style={{ fontSize: 12, padding: '6px 12px', marginLeft: 'auto' }}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Close' : 'New plan'}
        </button>
        {notice && <span className="caption">{notice}</span>}
      </div>

      {showForm && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--hairline)' }}>
          <select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} style={inputStyle}>
            {PROPERTIES.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as PlanInput['format'] })} style={inputStyle}>
            <option value="post">Post</option>
            <option value="reel">Reel</option>
            <option value="story">Story</option>
            <option value="carousel">Carousel</option>
          </select>
          <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as PlanInput['platform'] })} style={inputStyle}>
            <option value="both">Instagram + Facebook</option>
            <option value="instagram">Instagram only</option>
            <option value="facebook">Facebook only</option>
          </select>
          <label className="caption" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            every
            <input
              type="number"
              min={1}
              max={30}
              value={form.everyDays}
              onChange={(e) => setForm({ ...form, everyDays: Number(e.target.value) })}
              style={{ ...inputStyle, width: 60 }}
            />
            day(s)
          </label>
          <label className="caption" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={form.allowReuse}
              onChange={(e) => setForm({ ...form, allowReuse: e.target.checked })}
            />
            allow reuse after
            <input
              type="number"
              min={0}
              max={365}
              value={form.reuseCooldownDays}
              onChange={(e) => setForm({ ...form, reuseCooldownDays: Number(e.target.value) })}
              style={{ ...inputStyle, width: 64 }}
            />
            days
          </label>
          {form.format !== 'story' && (
            <label className="caption" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={form.alsoStory ?? false}
                onChange={(e) => setForm({ ...form, alsoStory: e.target.checked })}
              />
              also post to story
            </label>
          )}
          <select
            value={form.folderId ?? ''}
            onChange={(e) => setForm({ ...form, folderId: e.target.value || null })}
            style={inputStyle}
          >
            <option value="">Whole property library</option>
            {folders
              .filter((f) => !f.property_id || f.property_id === form.propertyId)
              .map((f) => (
                <option key={f.id} value={f.id}>folder: {f.name}</option>
              ))}
          </select>
          {form.format === 'reel' && (
            <label className="caption" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              max
              <input
                type="number"
                min={1}
                max={8}
                value={form.maxClips ?? 5}
                onChange={(e) => setForm({ ...form, maxClips: Number(e.target.value) })}
                style={{ ...inputStyle, width: 56 }}
              />
              clips
            </label>
          )}
          <input
            value={form.direction ?? ''}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
            placeholder="Style direction (optional): e.g. golden-hour, calm, couples focus"
            style={{ ...inputStyle, flex: '1 1 240px' }}
          />
          <button
            type="button"
            disabled={pending}
            className="pill-primary"
            style={{ fontSize: 12, padding: '7px 14px' }}
            onClick={() =>
              run(() =>
                savePlan({
                  ...form,
                  name:
                    form.name ||
                    `${PROPERTIES.find((p) => p.id === form.propertyId)?.name} · ${form.format} every ${form.everyDays}d`,
                }),
              )
            }
          >
            Save plan
          </button>
        </div>
      )}

      {plans.length === 0 && !showForm && (
        <p className="caption">
          No plans yet — the default regular (one post per property every 3 days) applies. Create a
          plan to take control: e.g. daily story for Ten Fifty, a reel every 5 days for Annie May.
        </p>
      )}

      {plans.map((p) => (
        <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid var(--hairline)' }}>
          <span
            aria-hidden
            style={{ width: 8, height: 8, borderRadius: '50%', background: p.active ? '#2f9e63' : 'var(--ink-mute)' }}
          />
          <span style={{ fontSize: 14 }}>{p.name}</span>
          <span className="caption tnum">
            {p.format}
            {p.also_story ? ' + story' : ''} · {p.platform} · every {p.every_days}d
            {p.folder_id ? ` · ${folders.find((f) => f.id === p.folder_id)?.name ?? 'folder'}` : ''}
            {p.format === 'reel' ? ` · ≤${p.max_clips} clips` : ''} · next {p.next_run_at}
            {p.direction ? ` · “${p.direction}”` : ''}
          </span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            disabled={pending}
            className="caption"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
            onClick={() =>
              run(() =>
                draftPost(p.property_id, p.format, {
                  platform: p.platform,
                  direction: p.direction ?? undefined,
                  reuseCooldownDays: p.reuse_cooldown_days,
                  allowReuse: p.allow_reuse,
                  alsoStory: p.also_story,
                  folderId: p.folder_id ?? undefined,
                }),
              )
            }
          >
            draft now
          </button>
          <button
            type="button"
            disabled={pending}
            className="caption"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)' }}
            onClick={() => run(() => setPlanActive(p.id, !p.active))}
          >
            {p.active ? 'pause' : 'resume'}
          </button>
          <button
            type="button"
            disabled={pending}
            className="caption"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ruby)' }}
            onClick={() => window.confirm('Delete this plan?') && run(() => deletePlan(p.id))}
          >
            delete
          </button>
        </div>
      ))}
    </section>
  );
}
