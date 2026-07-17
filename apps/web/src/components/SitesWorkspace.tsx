'use client';

import { useState, useTransition } from 'react';
import type { SiteBlock, SiteDef, SitePage } from '@/lib/sites';
import { saveSitePage, resetSitePage } from '@/app/sites/actions';

export interface WorkspaceSite {
  def: SiteDef;
  pages: SitePage[]; // merged: DB override where present, else scrape seed
  seedPages: SitePage[]; // original scrape, for revert
}

type PageKey = string; // `${propertyId}/${slug}`

function deepCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function emptyBlock(type: SiteBlock['type']): SiteBlock {
  switch (type) {
    case 'heading':
      return { type: 'heading', level: 2, text: 'New heading' };
    case 'text':
      return { type: 'text', text: 'New paragraph…' };
    case 'image':
      return { type: 'image', src: '', alt: '' };
    case 'button':
      return { type: 'button', text: 'Button', href: '#' };
  }
}

export default function SitesWorkspace({ sites }: { sites: WorkspaceSite[] }) {
  const [activeSiteId, setActiveSiteId] = useState(sites[0]?.def.propertyId ?? '');
  const [activeSlug, setActiveSlug] = useState('home');
  const [editMode, setEditMode] = useState(false);
  // local working copy of every page, keyed by property/slug
  const [drafts, setDrafts] = useState<Record<PageKey, SitePage>>(() => {
    const d: Record<PageKey, SitePage> = {};
    for (const s of sites)
      for (const p of s.pages) d[`${s.def.propertyId}/${p.slug}`] = deepCopy(p);
    return d;
  });
  const [dirty, setDirty] = useState<Set<PageKey>>(new Set());
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();

  const site = sites.find((s) => s.def.propertyId === activeSiteId) ?? sites[0];
  if (!site) return null;
  const t = site.def.theme;
  const key: PageKey = `${site.def.propertyId}/${activeSlug}`;
  const page = drafts[key] ?? drafts[`${site.def.propertyId}/home`];
  if (!page) return null;

  const markDirty = (k: PageKey) =>
    setDirty((prev) => new Set(prev).add(k));

  const updateBlocks = (blocks: SiteBlock[]) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], blocks } }));
    markDirty(key);
  };

  const updateBlock = (i: number, patch: Partial<SiteBlock>) => {
    const blocks = page.blocks.map((b, j) => (j === i ? ({ ...b, ...patch } as SiteBlock) : b));
    updateBlocks(blocks);
  };

  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= page.blocks.length) return;
    const blocks = [...page.blocks];
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    updateBlocks(blocks);
  };

  const removeBlock = (i: number) => updateBlocks(page.blocks.filter((_, j) => j !== i));

  const addBlock = (type: SiteBlock['type']) => updateBlocks([...page.blocks, emptyBlock(type)]);

  const save = () =>
    startTransition(async () => {
      const res = await saveSitePage(
        site.def.propertyId,
        page.slug,
        page.navLabel,
        page.title,
        page.blocks,
      );
      setNotice(res.message);
      if (res.ok)
        setDirty((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
    });

  const revert = () =>
    startTransition(async () => {
      const res = await resetSitePage(site.def.propertyId, page.slug);
      if (res.ok) {
        const seed = site.seedPages.find((p) => p.slug === page.slug);
        if (seed) setDrafts((prev) => ({ ...prev, [key]: deepCopy(seed) }));
        setDirty((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
      setNotice(res.message);
    });

  /** Map a scraped href to an internal page slug when it points at this site. */
  const internalSlug = (href: string): string | null => {
    try {
      const u = new URL(href, `https://${site.def.domain}`);
      if (!u.hostname.includes(site.def.domain.replace('www.', ''))) return null;
      const path = u.pathname.replace(/\/+$/, '').replace(/^\/+/, '');
      const slug = path === '' ? 'home' : path;
      return site.pages.some((p) => p.slug === slug) ? slug : null;
    } catch {
      return null;
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    font: 'inherit',
    color: 'inherit',
    background: 'rgba(255,255,255,0.7)',
    border: '1px dashed var(--primary)',
    borderRadius: 6,
    padding: '6px 10px',
  };

  return (
    <div>
      {/* ── Property tabs + edit toggle ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {sites.map((s) => {
          const on = s.def.propertyId === site.def.propertyId;
          return (
            <button
              key={s.def.propertyId}
              type="button"
              onClick={() => {
                setActiveSiteId(s.def.propertyId);
                setActiveSlug('home');
              }}
              className="pill-primary"
              style={{
                background: on ? 'var(--primary)' : 'var(--canvas)',
                color: on ? 'var(--on-primary)' : 'var(--ink-secondary)',
                border: `1px solid ${on ? 'var(--primary)' : 'var(--hairline)'}`,
              }}
            >
              {s.def.name}
            </button>
          );
        })}

        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <span className="caption">Edit mode</span>
          <span
            role="switch"
            aria-checked={editMode}
            onClick={() => setEditMode((v) => !v)}
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              background: editMode ? 'var(--primary)' : 'var(--hairline)',
              position: 'relative',
              transition: 'background .15s',
              display: 'inline-block',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: editMode ? 20 : 2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left .15s',
                boxShadow: 'var(--shadow-1)',
              }}
            />
          </span>
        </label>

        {editMode && (
          <>
            <button
              className="pill-primary"
              type="button"
              disabled={pending || !dirty.has(key)}
              onClick={save}
              style={{ opacity: pending || !dirty.has(key) ? 0.5 : 1 }}
            >
              {pending ? 'Saving…' : dirty.has(key) ? 'Save page' : 'Saved'}
            </button>
            <button
              type="button"
              className="pill-primary"
              disabled={pending}
              onClick={revert}
              style={{ background: 'var(--canvas)', color: 'var(--ink-mute)', border: '1px solid var(--hairline)' }}
            >
              Revert to live
            </button>
          </>
        )}
        {notice && <span className="caption">{notice}</span>}
      </div>

      {/* ── The cloned site, in a browser-like frame ── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* faux browser bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderBottom: '1px solid var(--hairline)',
            background: 'var(--canvas-soft)',
          }}
        >
          <span style={{ display: 'flex', gap: 5 }}>
            {['#ea2261', '#f5b83d', '#3ecf8e'].map((c) => (
              <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
            ))}
          </span>
          <span className="caption tnum" style={{ marginLeft: 8 }}>
            {site.def.domain}/{page.slug === 'home' ? '' : page.slug + '/'}
          </span>
          <a
            href={`https://${site.def.domain}/${page.slug === 'home' ? '' : page.slug + '/'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="caption"
            style={{ marginLeft: 'auto' }}
          >
            Open live ↗
          </a>
        </div>

        {/* site header + nav (the clone's own navigation) */}
        <div style={{ background: t.headerBg, color: t.headerInk, padding: '20px 32px' }}>
          <div
            style={{
              maxWidth: 960,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontFamily: t.headingFont, fontSize: 22, letterSpacing: '0.5px' }}>
              {site.def.name}
            </span>
            <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {site.pages.map((p) => {
                const on = p.slug === page.slug;
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => setActiveSlug(p.slug)}
                    style={{
                      fontFamily: t.bodyFont,
                      fontSize: 13,
                      padding: '6px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      border: 'none',
                      background: on ? t.accent : 'transparent',
                      color: on ? t.accentInk : t.headerInk,
                    }}
                  >
                    {p.navLabel}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* page body */}
        <div style={{ background: t.bg, color: t.ink, fontFamily: t.bodyFont, padding: '48px 32px 64px' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 20 }}>
            {page.blocks.map((b, i) => {
              const controls = editMode && (
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginBottom: 4 }}>
                  {(['heading', 'text', 'image', 'button'] as const).includes(b.type) && (
                    <span className="micro-cap" style={{ marginRight: 'auto', color: 'var(--ink-mute)' }}>
                      {b.type}
                    </span>
                  )}
                  <button type="button" onClick={() => moveBlock(i, -1)} style={ctlStyle} title="Move up">↑</button>
                  <button type="button" onClick={() => moveBlock(i, 1)} style={ctlStyle} title="Move down">↓</button>
                  <button type="button" onClick={() => removeBlock(i)} style={{ ...ctlStyle, color: 'var(--ruby)' }} title="Delete">✕</button>
                </div>
              );

              if (b.type === 'heading') {
                const size = b.level === 1 ? 40 : b.level === 2 ? 28 : 20;
                return (
                  <div key={i}>
                    {controls}
                    {editMode ? (
                      <input
                        value={b.text}
                        onChange={(e) => updateBlock(i, { text: e.target.value })}
                        style={{ ...inputStyle, fontFamily: t.headingFont, fontSize: size, fontWeight: 500 }}
                      />
                    ) : (
                      <div style={{ fontFamily: t.headingFont, fontSize: size, fontWeight: 500, lineHeight: 1.2 }}>
                        {b.text}
                      </div>
                    )}
                  </div>
                );
              }

              if (b.type === 'text') {
                return (
                  <div key={i}>
                    {controls}
                    {editMode ? (
                      <textarea
                        value={b.text}
                        onChange={(e) => updateBlock(i, { text: e.target.value })}
                        rows={Math.max(2, Math.ceil(b.text.length / 80))}
                        style={{ ...inputStyle, lineHeight: 1.6, resize: 'vertical' }}
                      />
                    ) : (
                      <p style={{ lineHeight: 1.7, fontSize: 16 }}>{b.text}</p>
                    )}
                  </div>
                );
              }

              if (b.type === 'image') {
                return (
                  <div key={i}>
                    {controls}
                    {b.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.src}
                        alt={b.alt}
                        style={{ width: '100%', borderRadius: 10, display: 'block' }}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        style={{
                          padding: 40,
                          textAlign: 'center',
                          border: '1px dashed var(--hairline-input)',
                          borderRadius: 10,
                        }}
                        className="caption"
                      >
                        No image URL yet
                      </div>
                    )}
                    {editMode && (
                      <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                        <input
                          value={b.src}
                          placeholder="Image URL"
                          onChange={(e) => updateBlock(i, { src: e.target.value })}
                          style={{ ...inputStyle, fontSize: 12 }}
                        />
                        <input
                          value={b.alt}
                          placeholder="Alt text"
                          onChange={(e) => updateBlock(i, { alt: e.target.value })}
                          style={{ ...inputStyle, fontSize: 12 }}
                        />
                      </div>
                    )}
                  </div>
                );
              }

              // button
              const slug = internalSlug(b.href);
              return (
                <div key={i}>
                  {controls}
                  {editMode ? (
                    <div style={{ display: 'grid', gap: 6, maxWidth: 420 }}>
                      <input
                        value={b.text}
                        onChange={(e) => updateBlock(i, { text: e.target.value })}
                        style={inputStyle}
                      />
                      <input
                        value={b.href}
                        placeholder="Link URL"
                        onChange={(e) => updateBlock(i, { href: e.target.value })}
                        style={{ ...inputStyle, fontSize: 12 }}
                      />
                    </div>
                  ) : slug ? (
                    <button
                      type="button"
                      onClick={() => setActiveSlug(slug)}
                      style={{
                        fontFamily: t.bodyFont,
                        background: t.accent,
                        color: t.accentInk,
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 24px',
                        fontSize: 15,
                        cursor: 'pointer',
                      }}
                    >
                      {b.text}
                    </button>
                  ) : (
                    <a
                      href={b.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        fontFamily: t.bodyFont,
                        background: t.accent,
                        color: t.accentInk,
                        borderRadius: 8,
                        padding: '12px 24px',
                        fontSize: 15,
                      }}
                    >
                      {b.text}
                    </a>
                  )}
                </div>
              );
            })}

            {editMode && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  padding: 16,
                  border: '1px dashed var(--primary-subdued)',
                  borderRadius: 10,
                }}
              >
                <span className="caption" style={{ alignSelf: 'center' }}>Add block:</span>
                {(['heading', 'text', 'image', 'button'] as const).map((ty) => (
                  <button
                    key={ty}
                    type="button"
                    onClick={() => addBlock(ty)}
                    className="tag-soft"
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    + {ty}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* site footer */}
        <div
          style={{
            background: t.headerBg,
            color: t.headerInk,
            fontFamily: t.bodyFont,
            textAlign: 'center',
            padding: '20px 32px',
            fontSize: 13,
            opacity: 0.9,
          }}
        >
          © {site.def.name} · {site.def.domain}
        </div>
      </div>
    </div>
  );
}

const ctlStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 6,
  border: '1px solid var(--hairline)',
  background: 'var(--canvas)',
  color: 'var(--ink-secondary)',
  cursor: 'pointer',
  fontSize: 12,
  lineHeight: 1,
};
