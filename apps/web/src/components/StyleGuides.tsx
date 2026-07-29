'use client';

import { useState, useTransition } from 'react';
import { generateStyleGuide, saveStyleGuide } from '@/app/(admin)/social/actions';
import { emptyGuide, type StyleGuide } from '@/lib/styleGuides';

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
