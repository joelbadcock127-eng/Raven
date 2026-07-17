'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { SiteDef } from '@/lib/sites';
import { saveSiteOverrides, resetSitePage, type MirrorOverride } from '@/app/sites/actions';

export default function SitesWorkspace({ sites }: { sites: SiteDef[] }) {
  const [activeSiteId, setActiveSiteId] = useState(sites[0]?.propertyId ?? '');
  const [currentSlug, setCurrentSlug] = useState('home');
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(new Set()); // `${pid}/${slug}`
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editModeRef = useRef(editMode);
  editModeRef.current = editMode;

  const site = sites.find((s) => s.propertyId === activeSiteId) ?? sites[0];

  const postToFrame = (msg: unknown) =>
    iframeRef.current?.contentWindow?.postMessage(msg, '*');

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data ?? {};
      if (d.type === 'mirror-nav') {
        // page inside iframe loaded (initial or via clicked link)
        setCurrentSlug(d.slug);
        // re-assert edit mode on the freshly loaded document
        if (editModeRef.current) postToFrame({ type: 'mirror-edit', on: true });
      } else if (d.type === 'mirror-dirty') {
        setDirty((prev) => new Set(prev).add(`${d.property}/${d.slug}`));
        setNotice('');
      } else if (d.type === 'mirror-image-request') {
        const next = window.prompt('New image URL', d.current);
        if (next && next.trim()) {
          postToFrame({ type: 'mirror-set-image', sel: d.sel, value: next.trim() });
        }
      } else if (d.type === 'mirror-overrides') {
        const overrides = (d.overrides ?? []) as MirrorOverride[];
        const property = d.property as string;
        const slug = d.slug as string;
        startTransition(async () => {
          const res = await saveSiteOverrides(property, slug, overrides);
          setNotice(res.message);
          if (res.ok)
            setDirty((prev) => {
              const nextSet = new Set(prev);
              nextSet.delete(`${property}/${slug}`);
              return nextSet;
            });
        });
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!site) return null;
  const pageKey = `${site.propertyId}/${currentSlug}`;

  const toggleEdit = () => {
    const on = !editMode;
    setEditMode(on);
    postToFrame({ type: 'mirror-edit', on });
  };

  const save = () => postToFrame({ type: 'mirror-collect' });

  const revert = () =>
    startTransition(async () => {
      const res = await resetSitePage(site.propertyId, currentSlug);
      setNotice(res.message);
      if (res.ok && iframeRef.current) {
        setDirty((prev) => {
          const next = new Set(prev);
          next.delete(pageKey);
          return next;
        });
        // reload the current page fresh
        iframeRef.current.src = `/mirror/${site.propertyId}/${currentSlug}.html`;
      }
    });

  const switchSite = (pid: string) => {
    setActiveSiteId(pid);
    setCurrentSlug('home');
    setEditMode(false);
    if (iframeRef.current) iframeRef.current.src = `/mirror/${pid}/home.html`;
  };

  return (
    <div>
      {/* ── Property tabs + edit controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {sites.map((s) => {
          const on = s.propertyId === site.propertyId;
          return (
            <button
              key={s.propertyId}
              type="button"
              onClick={() => switchSite(s.propertyId)}
              className="pill-primary"
              style={{
                background: on ? 'var(--primary)' : 'var(--canvas)',
                color: on ? 'var(--on-primary)' : 'var(--ink-secondary)',
                border: `1px solid ${on ? 'var(--primary)' : 'var(--hairline)'}`,
              }}
            >
              {s.name}
            </button>
          );
        })}

        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <span className="caption">Edit mode</span>
          <span
            role="switch"
            aria-checked={editMode}
            onClick={toggleEdit}
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
              disabled={pending || !dirty.has(pageKey)}
              onClick={save}
              style={{ opacity: pending || !dirty.has(pageKey) ? 0.5 : 1 }}
            >
              {pending ? 'Saving…' : dirty.has(pageKey) ? 'Save page' : 'Saved'}
            </button>
            <button
              type="button"
              className="pill-primary"
              disabled={pending}
              onClick={revert}
              style={{ background: 'var(--canvas)', color: 'var(--ink-mute)', border: '1px solid var(--hairline)' }}
            >
              Revert page
            </button>
          </>
        )}
        {notice && <span className="caption">{notice}</span>}
      </div>

      {editMode && (
        <p className="caption" style={{ marginBottom: 12 }}>
          Click any text to edit it in place (click away to commit). Click any image to swap its URL.
          Links are disabled while editing — turn edit mode off to browse.
        </p>
      )}

      {/* ── Browser frame around the real mirrored site ── */}
      <div className="card" style={{ overflow: 'hidden' }}>
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
            {site.domain}/{currentSlug === 'home' ? '' : currentSlug + '/'}
          </span>
          {dirty.has(pageKey) && (
            <span className="caption" style={{ color: 'var(--ruby)' }}>· unsaved edits</span>
          )}
          <a
            href={`https://${site.domain}/${currentSlug === 'home' ? '' : currentSlug + '/'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="caption"
            style={{ marginLeft: 'auto' }}
          >
            Open live ↗
          </a>
        </div>

        <iframe
          ref={iframeRef}
          src={`/mirror/${site.propertyId}/home.html`}
          title={`${site.name} website`}
          style={{ width: '100%', height: '78vh', border: 'none', display: 'block', background: '#fff' }}
        />
      </div>
    </div>
  );
}
