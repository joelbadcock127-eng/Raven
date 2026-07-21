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
  mode?: 'recurring' | 'once';
}

export interface FolderRef {
  id: string;
  property_id: string | null;
  name: string;
}

const PROPERTIES = [
  { id: 'ten-fifty-bakers', name: 'Ten Fifty Bakers', short: 'Ten Fifty' },
  { id: 'prescription-pad', name: 'The Prescription Pad', short: 'Rx Pad' },
  { id: 'annie-may', name: 'Annie May', short: 'Annie May' },
];

const PLATFORM_LABEL: Record<Plan['platform'], string> = {
  both: 'IG + FB',
  instagram: 'IG',
  facebook: 'FB',
};

const field: React.CSSProperties = {
  font: 'inherit',
  fontSize: 13,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--hairline-input)',
  background: 'var(--canvas)',
  width: '100%',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4, minWidth: 0 }}>
      <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      {children}
    </label>
  );
}

export default function PostingPlans({ plans, folders }: { plans: Plan[]; folders: FolderRef[] }) {
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
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
    mode: 'recurring',
    runOn: today,
  });
  const once = form.mode === 'once';

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, close = false) =>
    startTransition(async () => {
      const res = await fn();
      setNotice(res.message);
      if (res.ok && close) setShowForm(false);
    });

  return (
    <section className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: plans.length || showForm ? '1px solid var(--hairline)' : 'none' }}>
        <h2 className="heading-md" style={{ fontSize: 17 }}>Posting plans</h2>
        <span className="caption">recurring or one-off — Raven drafts, you approve before anything goes out</span>
        <span style={{ flex: 1 }} />
        {notice && <span className="caption">{notice}</span>}
        <button type="button" className="pill-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : '+ New plan'}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', background: 'var(--canvas-soft)' }}>
          {/* Repeat vs one-off */}
          <div style={{ display: 'inline-flex', padding: 3, borderRadius: 'var(--r-pill)', background: 'var(--canvas)', border: '1px solid var(--hairline)', marginBottom: 14 }}>
            {(
              [
                ['recurring', 'Repeat on a schedule'],
                ['once', 'Just once'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setForm({ ...form, mode: m })}
                className="caption"
                style={{
                  border: 'none', cursor: 'pointer', padding: '6px 14px', borderRadius: 'var(--r-pill)',
                  background: form.mode === m ? 'var(--brand-dark-900)' : 'transparent',
                  color: form.mode === m ? '#fff' : 'var(--ink-secondary)',
                  fontWeight: form.mode === m ? 500 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
            <Field label="Property">
              <select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value, folderId: null })} style={field}>
                {PROPERTIES.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Format">
              <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as PlanInput['format'] })} style={field}>
                <option value="post">Post</option>
                <option value="reel">Reel</option>
                <option value="story">Story</option>
                <option value="carousel">Carousel</option>
              </select>
            </Field>
            <Field label="Platforms">
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as PlanInput['platform'] })} style={field}>
                <option value="both">Instagram + Facebook</option>
                <option value="instagram">Instagram only</option>
                <option value="facebook">Facebook only</option>
              </select>
            </Field>
            {once ? (
              <Field label="Date">
                <input type="date" min={today} value={form.runOn ?? today} onChange={(e) => setForm({ ...form, runOn: e.target.value })} style={field} />
              </Field>
            ) : (
              <Field label="Cadence">
                <select value={form.everyDays} onChange={(e) => setForm({ ...form, everyDays: Number(e.target.value) })} style={field}>
                  {[1, 2, 3, 5, 7, 14].map((d) => (
                    <option key={d} value={d}>{d === 1 ? 'Daily' : d === 7 ? 'Weekly' : `Every ${d} days`}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Content source">
              <select value={form.folderId ?? ''} onChange={(e) => setForm({ ...form, folderId: e.target.value || null })} style={field}>
                <option value="">Whole library</option>
                {folders
                  .filter((f) => !f.property_id || f.property_id === form.propertyId)
                  .map((f) => (
                    <option key={f.id} value={f.id}>Folder: {f.name}</option>
                  ))}
              </select>
            </Field>
            {form.format === 'reel' && (
              <Field label="Max clips (uses fewer if fewer exist)">
                <input type="number" min={1} max={8} value={form.maxClips ?? 5} onChange={(e) => setForm({ ...form, maxClips: Number(e.target.value) })} style={field} />
              </Field>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
            <Field label="Style direction (optional)">
              <input
                value={form.direction ?? ''}
                onChange={(e) => setForm({ ...form, direction: e.target.value })}
                placeholder="e.g. golden-hour, calm, couples focus"
                style={field}
              />
            </Field>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', paddingBottom: 2 }}>
              {form.format !== 'story' && (
                <label className="caption" style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={form.alsoStory ?? false} onChange={(e) => setForm({ ...form, alsoStory: e.target.checked })} />
                  + story
                </label>
              )}
              <label className="caption" style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={form.allowReuse} onChange={(e) => setForm({ ...form, allowReuse: e.target.checked })} />
                reuse after {form.reuseCooldownDays}d
              </label>
              <button
                type="button"
                disabled={pending}
                className="pill-primary"
                style={{ fontSize: 13 }}
                onClick={() =>
                  run(
                    () =>
                      savePlan({
                        ...form,
                        name:
                          form.name ||
                          (once
                            ? `${PROPERTIES.find((p) => p.id === form.propertyId)?.short} · ${form.format} · one-off`
                            : `${PROPERTIES.find((p) => p.id === form.propertyId)?.short} · ${form.format}${form.everyDays === 1 ? ' daily' : ` / ${form.everyDays}d`}`),
                      }),
                    true,
                  )
                }
              >
                {once ? (form.runOn && form.runOn <= today ? 'Draft now' : 'Schedule') : 'Save plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {plans.length === 0 && !showForm && (
        <p className="caption" style={{ padding: '14px 20px' }}>
          No plans yet. Set a recurring rhythm (a reel every 5 days for Annie May, a daily story for
          Ten Fifty) or fire off a single post with “Just once”.
        </p>
      )}

      {plans.map((p, i) => (
        <div
          key={p.id}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '12px 20px',
            borderTop: i > 0 ? '1px solid var(--hairline)' : 'none',
            opacity: p.active ? 1 : 0.55,
          }}
        >
          <span aria-hidden style={{ width: 8, height: 8, flexShrink: 0, borderRadius: '50%', background: p.active ? '#2f9e63' : 'var(--ink-mute)' }} />
          <div style={{ minWidth: 170 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{PROPERTIES.find((x) => x.id === p.property_id)?.name ?? p.property_id}</div>
            {p.direction && <div className="caption" style={{ fontStyle: 'italic' }}>“{p.direction}”</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="tag-soft" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
              {p.format}
              {p.also_story ? ' + story' : ''}
            </span>
            <span className="tag-soft" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>{PLATFORM_LABEL[p.platform]}</span>
            <span className="tag-soft" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
              {p.mode === 'once' ? `once · ${p.next_run_at}` : p.every_days === 1 ? 'daily' : `every ${p.every_days}d`}
            </span>
            {p.folder_id && (
              <span className="tag-soft" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                {folders.find((f) => f.id === p.folder_id)?.name ?? 'folder'}
              </span>
            )}
            {p.format === 'reel' && (
              <span className="tag-soft" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>≤{p.max_clips} clips</span>
            )}
          </div>
          <span className="caption tnum" style={{ marginLeft: 'auto' }}>next {p.next_run_at}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              disabled={pending}
              title="Draft one now"
              className="caption"
              style={rowBtn}
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
            <button type="button" disabled={pending} className="caption" style={rowBtn} onClick={() => run(() => setPlanActive(p.id, !p.active))}>
              {p.active ? 'pause' : 'resume'}
            </button>
            <button
              type="button"
              disabled={pending}
              className="caption"
              style={{ ...rowBtn, color: 'var(--ruby)' }}
              onClick={() => window.confirm('Delete this plan?') && run(() => deletePlan(p.id))}
            >
              delete
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

const rowBtn: React.CSSProperties = {
  background: 'var(--canvas)',
  border: '1px solid var(--hairline)',
  borderRadius: 8,
  padding: '5px 10px',
  cursor: 'pointer',
  color: 'var(--ink-secondary)',
};
