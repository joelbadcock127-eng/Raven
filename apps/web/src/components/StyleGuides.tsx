'use client';

import { useState, useTransition } from 'react';
import { generateStyleGuide, saveStyleGuide, saveBrandKit } from '@/app/(admin)/social/actions';
import { emptyGuide, type StyleGuide } from '@/lib/styleGuides';
import { resolveBrandKit, previewFontsHref, FONTS, type BrandKit, type FontKey } from '@/lib/brandKit';

const PROPERTIES = [
  { id: 'ten-fifty-bakers', name: 'Ten Fifty Bakers' },
  { id: 'prescription-pad', name: 'The Prescription Pad' },
  { id: 'annie-may', name: 'Annie May' },
];

const field: React.CSSProperties = {
  font: 'inherit', fontSize: 13, padding: '7px 10px', borderRadius: 8,
  border: '1px solid var(--hairline-input)', background: 'var(--canvas)', width: '100%',
};

/**
 * Per-property style guides: capture the feed's voice, vibe, look and music
 * once, and every AI caption, reel grade and music pick follows it. Guides
 * can be written by hand or distilled with AI from example captions, an
 * account description, or the property's own published posts.
 */
export default function StyleGuides({ guides }: { guides: StyleGuide[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, StyleGuide>>({});
  const [kitDrafts, setKitDrafts] = useState<Record<string, BrandKit>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [handle, setHandle] = useState('');
  const [notes, setNotes] = useState('');
  const [pasted, setPasted] = useState('');
  const [usePublished, setUsePublished] = useState(true);
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();

  const guideFor = (pid: string): StyleGuide =>
    drafts[pid] ?? guides.find((g) => g.property_id === pid) ?? emptyGuide(pid);

  const patch = (pid: string, p: Partial<StyleGuide>) =>
    setDrafts((d) => ({ ...d, [pid]: { ...guideFor(pid), ...p } }));

  const hasGuide = (pid: string) => guides.some((g) => g.property_id === pid);

  const kitFor = (pid: string): BrandKit =>
    kitDrafts[pid] ?? resolveBrandKit(pid, guides.find((g) => g.property_id === pid)?.brand);

  const patchKit = (pid: string, section: keyof BrandKit, p: object) =>
    setKitDrafts((d) => {
      const cur = kitFor(pid);
      return { ...d, [pid]: { ...cur, [section]: { ...cur[section], ...p } } };
    });

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 10 }}>
        <h2 className="heading-md" style={{ fontSize: 17 }}>Style guides</h2>
        <span className="caption" style={{ color: 'var(--ink-mute)' }}>
          the voice, vibe and look each property&apos;s feed keeps — applied to every caption and reel
        </span>
        {notice && <span className="caption">{notice}</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PROPERTIES.map((p) => {
          const isOpen = open === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className="caption"
              onClick={() => { setOpen(isOpen ? null : p.id); setImportOpen(false); }}
              style={{
                padding: '7px 16px', borderRadius: 'var(--r-pill)', cursor: 'pointer', border: '1px solid',
                borderColor: isOpen ? 'var(--primary)' : 'var(--hairline)',
                background: isOpen ? 'var(--primary)' : 'var(--canvas)',
                color: isOpen ? 'var(--on-primary)' : 'var(--ink-secondary)',
              }}
            >
              {p.name}
              <span style={{ marginLeft: 8, opacity: 0.75 }}>{hasGuide(p.id) ? '●' : '○'}</span>
            </button>
          );
        })}
      </div>

      {open && (
        <div className="card" style={{ padding: 20, marginTop: 12, display: 'grid', gap: 12, maxWidth: 860 }}>
          {(() => {
            const g = guideFor(open);
            return (
              <>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>
                    {g.source_notes || 'No guide saved yet — write one below or pull one in with AI.'}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="pill-primary"
                    style={{ fontSize: 12, padding: '6px 14px', background: 'var(--canvas)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                    onClick={() => setImportOpen(!importOpen)}
                  >
                    {importOpen ? 'Close import' : 'Pull in with AI'}
                  </button>
                </div>

                {importOpen && (
                  <div className="card" style={{ padding: 16, background: 'var(--canvas-soft)', display: 'grid', gap: 10 }}>
                    <p className="caption" style={{ color: 'var(--ink-mute)' }}>
                      Point it at the account you want to replicate. Instagram can&apos;t be scraped
                      directly, so paste a handful of captions from the account (blank line between
                      each), describe the vibe in your own words, or let it learn from posts this
                      property has already published. It distils a guide; you review and save.
                    </p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <label className="caption" style={{ display: 'grid', gap: 4, flex: '1 1 200px' }}>
                        <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Account handle (optional)</span>
                        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@anniemaybnb" style={field} />
                      </label>
                      <label className="caption" style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 18 }}>
                        <input type="checkbox" checked={usePublished} onChange={(e) => setUsePublished(e.target.checked)} />
                        learn from this property&apos;s published posts
                      </label>
                    </div>
                    <label className="caption" style={{ display: 'grid', gap: 4 }}>
                      <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Describe the theme (vibe, music, feel)</span>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. soft heritage warmth, slow mornings, film-photo tones, gentle acoustic music" style={{ ...field, resize: 'vertical' }} />
                    </label>
                    <label className="caption" style={{ display: 'grid', gap: 4 }}>
                      <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Paste example captions from the account (blank line between each)</span>
                      <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={5} style={{ ...field, resize: 'vertical' }} />
                    </label>
                    <div>
                      <button
                        type="button"
                        disabled={pending}
                        className="pill-primary"
                        style={{ fontSize: 12, padding: '7px 16px' }}
                        onClick={() =>
                          startTransition(async () => {
                            const res = await generateStyleGuide({
                              propertyId: open,
                              handle: handle.trim() || undefined,
                              notes: notes.trim() || undefined,
                              pastedExamples: pasted.trim() || undefined,
                              usePublished,
                            });
                            setNotice(res.message);
                            if (res.ok && res.guide) {
                              setDrafts((d) => ({ ...d, [open]: res.guide! }));
                              setImportOpen(false);
                            }
                          })
                        }
                      >
                        {pending ? 'Distilling…' : 'Distil style guide'}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                  <label className="caption" style={{ display: 'grid', gap: 4 }}>
                    <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Voice (how captions sound)</span>
                    <textarea value={g.voice} onChange={(e) => patch(open, { voice: e.target.value })} rows={2} style={{ ...field, resize: 'vertical' }} />
                  </label>
                  <label className="caption" style={{ display: 'grid', gap: 4 }}>
                    <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Vibe (the feed&apos;s feel)</span>
                    <textarea value={g.vibe} onChange={(e) => patch(open, { vibe: e.target.value })} rows={2} style={{ ...field, resize: 'vertical' }} />
                  </label>
                  <label className="caption" style={{ display: 'grid', gap: 4 }}>
                    <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Visual (light, colours, grading — sets the default reel grade)</span>
                    <textarea value={g.visual} onChange={(e) => patch(open, { visual: e.target.value })} rows={2} style={{ ...field, resize: 'vertical' }} />
                  </label>
                  <label className="caption" style={{ display: 'grid', gap: 4 }}>
                    <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Music (vibe keywords for reel soundtracks)</span>
                    <textarea value={g.music} onChange={(e) => patch(open, { music: e.target.value })} rows={2} placeholder="calm acoustic, soft piano" style={{ ...field, resize: 'vertical' }} />
                  </label>
                  <label className="caption" style={{ display: 'grid', gap: 4 }}>
                    <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Caption close (the CTA style)</span>
                    <input value={g.cta} onChange={(e) => patch(open, { cta: e.target.value })} style={field} />
                  </label>
                  <label className="caption" style={{ display: 'grid', gap: 4 }}>
                    <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Never (words and moves to avoid)</span>
                    <input value={g.avoid} onChange={(e) => patch(open, { avoid: e.target.value })} style={field} />
                  </label>
                </div>
                <label className="caption" style={{ display: 'grid', gap: 4 }}>
                  <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Hashtag pool (space or comma separated)</span>
                  <input
                    value={g.hashtags.join(' ')}
                    onChange={(e) =>
                      patch(open, {
                        hashtags: e.target.value.split(/[\s,]+/).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`)),
                      })
                    }
                    style={field}
                  />
                </label>
                <label className="caption" style={{ display: 'grid', gap: 4 }}>
                  <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Example captions in this style (blank line between each)</span>
                  <textarea
                    value={g.example_captions.join('\n\n')}
                    onChange={(e) => patch(open, { example_captions: e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) })}
                    rows={5}
                    style={{ ...field, resize: 'vertical' }}
                  />
                </label>
                {(() => {
                  const kit = kitFor(open);
                  const fontsHref = previewFontsHref(kit);
                  return (
                    <div className="card" style={{ padding: 16, background: 'var(--canvas-soft)', display: 'grid', gap: 12 }}>
                      {fontsHref && <link rel="stylesheet" href={fontsHref} />}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Brand kit — fonts, colours and styling burned into every reel and story</span>
                        <span style={{ flex: 1 }} />
                        <button
                          type="button"
                          className="caption"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                          onClick={() => setKitDrafts((d) => ({ ...d, [open]: resolveBrandKit(open) }))}
                        >
                          reset to property default
                        </button>
                      </div>

                      {/* live sample of the on-video text */}
                      <div
                        style={{
                          padding: '18px 16px', borderRadius: 10, textAlign: 'center', whiteSpace: 'pre-wrap', lineHeight: 1.35,
                          background: `linear-gradient(160deg, ${kit.colors.scrim} 0%, #6b6258 100%)`,
                          fontFamily: FONTS[kit.overlay.font].css,
                          color: kit.colors.text,
                          textTransform: kit.overlay.textCase === 'uppercase' ? 'uppercase' : 'none',
                          fontSize: { small: 15, medium: 18, large: 22 }[kit.overlay.size],
                          textShadow: kit.overlay.scrim === 'shadow' ? '0 2px 4px rgba(0,0,0,.5)' : 'none',
                        }}
                      >
                        {'Slow mornings.\nStay a while.'}
                        {kit.watermark.enabled && kit.watermark.text && (
                          <div style={{ fontSize: 10, letterSpacing: 2, opacity: kit.watermark.opacity, marginTop: 10 }}>{kit.watermark.text}</div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
                        <label className="caption" style={{ display: 'grid', gap: 4 }}>
                          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Overlay font</span>
                          <select value={kit.overlay.font} onChange={(e) => patchKit(open, 'overlay', { font: e.target.value as FontKey })} style={field}>
                            {(Object.keys(FONTS) as FontKey[]).map((k) => (
                              <option key={k} value={k}>{FONTS[k].label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="caption" style={{ display: 'grid', gap: 4 }}>
                          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Text treatment</span>
                          <select value={kit.overlay.scrim} onChange={(e) => patchKit(open, 'overlay', { scrim: e.target.value })} style={field}>
                            <option value="shadow">Soft shadow behind text</option>
                            <option value="band">Tinted band behind text</option>
                            <option value="none">Bare text</option>
                          </select>
                        </label>
                        <label className="caption" style={{ display: 'grid', gap: 4 }}>
                          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Letter case</span>
                          <select value={kit.overlay.textCase} onChange={(e) => patchKit(open, 'overlay', { textCase: e.target.value })} style={field}>
                            <option value="uppercase">UPPERCASE</option>
                            <option value="as-typed">As typed</option>
                          </select>
                        </label>
                        <label className="caption" style={{ display: 'grid', gap: 4 }}>
                          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Default text size · position</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <select value={kit.overlay.size} onChange={(e) => patchKit(open, 'overlay', { size: e.target.value })} style={field}>
                              {['small', 'medium', 'large'].map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={kit.overlay.position} onChange={(e) => patchKit(open, 'overlay', { position: e.target.value })} style={field}>
                              {['top', 'middle', 'bottom'].map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'end' }}>
                        {([['text', 'Text colour'], ['scrim', 'Scrim / shadow'], ['accent', 'Accent'], ['paper', 'Paper']] as const).map(([key, label]) => (
                          <label key={key} className="caption" style={{ display: 'grid', gap: 4 }}>
                            <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>{label}</span>
                            <input
                              type="color"
                              value={kit.colors[key]}
                              onChange={(e) => patchKit(open, 'colors', { [key]: e.target.value })}
                              style={{ width: 52, height: 32, padding: 2, border: '1px solid var(--hairline-input)', borderRadius: 8, background: 'var(--canvas)', cursor: 'pointer' }}
                            />
                          </label>
                        ))}
                        <label className="caption" style={{ display: 'grid', gap: 4 }}>
                          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Default grade</span>
                          <select value={kit.reel.grade} onChange={(e) => patchKit(open, 'reel', { grade: e.target.value })} style={field}>
                            {['warm', 'cool', 'mono', 'punchy', 'none'].map((g) => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </label>
                        <label className="caption" style={{ display: 'grid', gap: 4 }}>
                          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Transition</span>
                          <select value={kit.reel.transition} onChange={(e) => patchKit(open, 'reel', { transition: e.target.value })} style={field}>
                            <option value="fade">Crossfade</option>
                            <option value="cut">Hard cut</option>
                          </select>
                        </label>
                        <label className="caption" style={{ display: 'grid', gap: 4 }}>
                          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Seconds per clip</span>
                          <input
                            type="number" min={1.5} max={6} step={0.1} value={kit.reel.clipSeconds}
                            onChange={(e) => patchKit(open, 'reel', { clipSeconds: Math.max(1.5, Math.min(6, Number(e.target.value) || 2.8)) })}
                            style={{ ...field, width: 80 }}
                          />
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'end' }}>
                        <label className="caption" style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 8 }}>
                          <input type="checkbox" checked={kit.watermark.enabled} onChange={(e) => patchKit(open, 'watermark', { enabled: e.target.checked })} />
                          wordmark on reels &amp; stories
                        </label>
                        <label className="caption" style={{ display: 'grid', gap: 4, flex: '1 1 220px' }}>
                          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Wordmark text</span>
                          <input value={kit.watermark.text} onChange={(e) => patchKit(open, 'watermark', { text: e.target.value })} style={field} />
                        </label>
                        <label className="caption" style={{ display: 'grid', gap: 4 }}>
                          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Placement</span>
                          <select value={kit.watermark.position} onChange={(e) => patchKit(open, 'watermark', { position: e.target.value })} style={field}>
                            <option value="top">Top</option>
                            <option value="bottom">Bottom</option>
                          </select>
                        </label>
                        <span style={{ flex: 1 }} />
                        <button
                          type="button"
                          disabled={pending}
                          className="pill-primary"
                          style={{ fontSize: 12, padding: '7px 16px' }}
                          onClick={() =>
                            startTransition(async () => {
                              const res = await saveBrandKit(open, kitFor(open));
                              setNotice(res.message);
                            })
                          }
                        >
                          {pending ? 'Saving…' : 'Save brand kit'}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="caption" style={{ color: 'var(--ink-mute)' }}>
                    Applied automatically to every new caption, reel grade and music pick for this property.
                  </span>
                  <span style={{ flex: 1 }} />
                  <button
                    type="button"
                    disabled={pending}
                    className="pill-primary"
                    style={{ fontSize: 12, padding: '7px 18px' }}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await saveStyleGuide(guideFor(open));
                        setNotice(res.message);
                      })
                    }
                  >
                    {pending ? 'Saving…' : 'Save style guide'}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </section>
  );
}
