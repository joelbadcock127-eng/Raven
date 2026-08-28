'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { SiteDef } from '@/lib/sites';
import { saveSiteOverrides, resetSitePage, publishSandboxPage, type MirrorOverride } from '@/app/(admin)/sites/actions';

export default function SitesWorkspace({
  sites,
  activeSiteId,
}: {
  sites: SiteDef[];
  activeSiteId: string;
}) {
  const [currentSlug, setCurrentSlug] = useState('home');
  const [editMode, setEditMode] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [dirty, setDirty] = useState<Set<string>>(new Set()); // `${pid}/${slug}`
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editModeRef = useRef(editMode);
  editModeRef.current = editMode;

  const site = sites.find((s) => s.propertyId === activeSiteId) ?? sites[0];

  // Annie May's live site is the bespoke V2 app, not a WordPress mirror.
  // Its edit bridge speaks the same protocol, with 'v2-' prefixed slugs.
  const isBespoke = (pid: string) => pid === 'annie-may';
  // Properties with a sandbox clone under public/mirror-sandbox/ (edits
  // there save under 'sandbox--' slugs and never touch the live pages).
  const hasSandbox = (pid: string) => pid === 'ten-fifty-bakers';
  const displaySlug = (slug: string) => slug.replace(/^v2-/, '').replace(/^sandbox--/, '');
  const frameSrc = (pid: string, slug: string, inSandbox = sandbox) => {
    const base = displaySlug(slug);
    if (isBespoke(pid)) return `/site/${pid}?page=${base}`;
    return inSandbox && hasSandbox(pid) ? `/mirror-sandbox/${pid}/${base}.html` : `/mirror/${pid}/${base}.html`;
  };

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
        iframeRef.current.src = frameSrc(site.propertyId, currentSlug);
      }
    });

  // property changed from the shared pill in SitesHub: reset the frame
  const shownSiteRef = useRef(activeSiteId);
  useEffect(() => {
    if (shownSiteRef.current === activeSiteId) return;
    shownSiteRef.current = activeSiteId;
    setCurrentSlug('home');
    setEditMode(false);
    setSandbox(false);
    if (iframeRef.current) iframeRef.current.src = frameSrc(activeSiteId, 'home', false);
  }, [activeSiteId]);

  return (
    <div>
      {/* ── Edit controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {hasSandbox(site.propertyId) && (
          <span style={{ display: 'inline-flex', border: '1px solid var(--hairline)', borderRadius: 999, overflow: 'hidden' }}>
            {([false, true] as const).map((sb) => (
              <button
                key={String(sb)}
                type="button"
                onClick={() => {
                  if (sandbox === sb) return;
                  setSandbox(sb);
                  setNotice('');
                  if (iframeRef.current)
                    iframeRef.current.src = frameSrc(site.propertyId, currentSlug, sb);
                }}
                style={{
                  padding: '5px 14px', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 12.5,
                  background: sandbox === sb ? 'var(--primary)' : 'transparent',
                  color: sandbox === sb ? '#fff' : 'var(--ink-mute)',
                }}
              >
                {sb ? 'Sandbox' : 'Live'}
              </button>
            ))}
          </span>
        )}
        {sandbox && (
          <>
            <span className="caption" style={{ color: 'var(--ink-mute)' }}>
              Edits here never touch the live site.
            </span>
            <button
              className="pill-primary"
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await publishSandboxPage(site.propertyId, displaySlug(currentSlug));
                  setNotice(res.message);
                })
              }
            >
              Publish page to live
            </button>
          </>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', border: '1px solid var(--hairline)', borderRadius: 999, overflow: 'hidden' }}>
          {(['desktop', 'mobile'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              style={{
                padding: '5px 14px', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 12.5,
                background: device === d ? 'var(--primary)' : 'transparent',
                color: device === d ? '#fff' : 'var(--ink-mute)',
              }}
            >
              {d === 'desktop' ? 'Desktop' : 'Mobile'}
            </button>
          ))}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
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
            {sandbox && <span style={{ color: 'var(--primary)', fontWeight: 600 }}>sandbox · </span>}
            {site.domain}/{displaySlug(currentSlug) === 'home' ? '' : displaySlug(currentSlug) + '/'}
          </span>
          {dirty.has(pageKey) && (
            <span className="caption" style={{ color: 'var(--ruby)' }}>· unsaved edits</span>
          )}
          <a
            href={`https://${site.domain}/${displaySlug(currentSlug) === 'home' ? '' : displaySlug(currentSlug) + '/'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="caption"
            style={{ marginLeft: 'auto' }}
          >
            Open live ↗
          </a>
        </div>

        <div style={device === 'mobile' ? { display: 'flex', justifyContent: 'center', background: 'var(--canvas-soft)', padding: '18px 0' } : undefined}>
          <iframe
            ref={iframeRef}
            src={frameSrc(site.propertyId, 'home', false)}
            title={`${site.name} website`}
            style={{
              width: device === 'mobile' ? 393 : '100%',
              height: '78vh',
              border: device === 'mobile' ? '1px solid var(--hairline)' : 'none',
              borderRadius: device === 'mobile' ? 18 : 0,
              display: 'block',
              background: '#fff',
            }}
          />
        </div>
      </div>
    </div>
  );
}
