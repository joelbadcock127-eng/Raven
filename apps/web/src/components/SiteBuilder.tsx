'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { Section, SectionType, SitePageV2, SiteVersion } from '@/lib/siteBuilder';
import { SECTION_TYPES } from '@/lib/siteBuilder';
import {
  createVersion,
  publishVersion,
  unpublishSite,
  savePageSections,
  addPage,
  addSectionToPage,
  saveDomains,
  aiEditSection,
} from '@/app/(admin)/sites/builder-actions';

interface Props {
  propertyId: string;
  propertyName: string;
  versions: SiteVersion[];
  pagesByVersion: Record<string, SitePageV2[]>;
  liveVersionId: string | null;
  domains: string[];
}

interface ChatMsg {
  role: 'you' | 'raven';
  text: string;
}

/** Immutably set a dotted path (e.g. "items.0.title") inside a section. */
function setPath(obj: Section, path: string, value: string): Section {
  const clone = JSON.parse(JSON.stringify(obj)) as Section;
  const parts = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = clone;
  for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]];
  node[parts[parts.length - 1]] = value;
  return clone;
}

export default function SiteBuilder({
  propertyId,
  propertyName,
  versions,
  pagesByVersion,
  liveVersionId,
  domains,
}: Props) {
  const drafts = versions.filter((v) => v.status === 'draft');
  const published = versions.filter((v) => v.status !== 'draft');
  const [versionId, setVersionId] = useState<string | null>(drafts[0]?.id ?? versions[0]?.id ?? null);
  const [slug, setSlug] = useState('home');
  const [selected, setSelected] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();
  const [refresh, setRefresh] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const version = versions.find((v) => v.id === versionId) ?? null;
  const pages = versionId ? (pagesByVersion[versionId] ?? []) : [];
  const page = pages.find((p) => p.slug === slug) ?? pages[0];
  const isDraft = version?.status === 'draft';
  const selectedSection = page?.sections.find((s) => s.id === selected) ?? null;

  // messages from the preview iframe: selection, inline text edits, nav
  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      const d = e.data ?? {};
      if (d.type === 'v2-select') setSelected(d.sectionId);
      else if (d.type === 'v2-goto') setSlug(d.slug);
      else if (d.type === 'v2-text-edit' && page) {
        const idx = page.sections.findIndex((s) => s.id === d.sectionId);
        if (idx < 0) return;
        const next = [...page.sections];
        next[idx] = setPath(next[idx], d.path, d.value);
        page.sections = next; // local model
        const res = await savePageSections(page.id, next);
        setNotice(res.ok ? 'Saved' : res.message);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [page]);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, reload = true) =>
    startTransition(async () => {
      const res = await fn();
      setNotice(res.message);
      if (res.ok && reload) window.location.reload();
    });

  const sendChat = () => {
    const instruction = chatInput.trim();
    if (!instruction || !page) return;
    if (!selectedSection) {
      setChat((c) => [...c, { role: 'you', text: instruction }, { role: 'raven', text: 'Select a section in the preview first — click it, then tell me what to change.' }]);
      setChatInput('');
      return;
    }
    setChat((c) => [...c, { role: 'you', text: instruction }]);
    setChatInput('');
    startTransition(async () => {
      const res = await aiEditSection(propertyId, selectedSection, instruction);
      if (res.ok && res.section) {
        const next = page.sections.map((s) => (s.id === res.section!.id ? res.section! : s));
        page.sections = next;
        await savePageSections(page.id, next);
        setChat((c) => [...c, { role: 'raven', text: res.note ?? 'Done.' }]);
        setRefresh((n) => n + 1);
      } else {
        setChat((c) => [...c, { role: 'raven', text: res.message }]);
      }
    });
  };

  const moveSection = (dir: -1 | 1) => {
    if (!page || !selected) return;
    const idx = page.sections.findIndex((s) => s.id === selected);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= page.sections.length) return;
    const next = [...page.sections];
    [next[idx], next[j]] = [next[j], next[idx]];
    page.sections = next;
    startTransition(async () => {
      await savePageSections(page.id, next);
      setRefresh((n) => n + 1);
    });
  };

  const deleteSection = () => {
    if (!page || !selected) return;
    if (!window.confirm('Delete the selected section?')) return;
    const next = page.sections.filter((s) => s.id !== selected);
    page.sections = next;
    setSelected(null);
    startTransition(async () => {
      await savePageSections(page.id, next);
      setRefresh((n) => n + 1);
    });
  };

  const previewSrc = versionId
    ? `/site/${propertyId}?version=${versionId}&page=${slug}${isDraft ? '&edit=1' : ''}${selected ? `&section=${selected}` : ''}&r=${refresh}`
    : null;

  return (
    <div>
      {/* ── Version bar ── */}
      <section className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Versions</span>
          {versions.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setVersionId(v.id);
                setSlug('home');
                setSelected(null);
              }}
              className="pill-primary"
              style={{
                fontSize: 12,
                padding: '5px 12px',
                background: v.id === versionId ? 'var(--primary)' : 'var(--canvas)',
                color: v.id === versionId ? '#fff' : 'var(--ink-secondary)',
                border: `1px solid ${v.id === versionId ? 'var(--primary)' : 'var(--hairline)'}`,
              }}
            >
              {v.label}
              {v.id === liveVersionId ? ' · live' : v.status === 'draft' ? ' · draft' : ''}
            </button>
          ))}
          <button
            type="button"
            disabled={pending}
            className="caption"
            style={{ background: 'none', border: '1px dashed var(--primary-subdued)', borderRadius: 'var(--r-pill)', padding: '5px 12px', cursor: 'pointer', color: 'var(--primary)' }}
            onClick={() => {
              const label = window.prompt('Name for the new draft', `Redesign ${new Date().toISOString().slice(0, 10)}`);
              if (label !== null)
                run(() => createVersion(propertyId, label, versionId && window.confirm('Start from the currently selected version? (Cancel = start blank)') ? versionId : undefined));
            }}
          >
            + new draft
          </button>
          <span style={{ flex: 1 }} />
          {version && isDraft && (
            <button type="button" disabled={pending} className="pill-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => run(() => publishVersion(propertyId, version.id))}>
              Publish this version
            </button>
          )}
          {liveVersionId && (
            <button
              type="button"
              disabled={pending}
              className="pill-primary"
              style={{ fontSize: 12, padding: '6px 14px', background: 'var(--canvas)', color: 'var(--ink-mute)', border: '1px solid var(--hairline)' }}
              onClick={() => run(() => unpublishSite(propertyId))}
            >
              Revert domains to mirror
            </button>
          )}
        </div>

        {/* domains */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Domains</span>
          <span className="caption tnum">{domains.length ? domains.join(' · ') : 'none set (built-in defaults apply)'}</span>
          <button
            type="button"
            className="caption"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
            onClick={() => {
              const next = window.prompt('Domains for this property (comma separated, e.g. tenfiftybakers.com.au, www.tenfiftybakers.com.au)', domains.join(', '));
              if (next !== null) run(() => saveDomains(propertyId, next.split(',')));
            }}
          >
            edit
          </button>
          {notice && <span className="caption" style={{ marginLeft: 'auto' }}>{notice}</span>}
        </div>
      </section>

      {versions.length === 0 && (
        <section className="card" style={{ padding: 28, maxWidth: 620, marginBottom: 16 }}>
          <h2 className="heading-md" style={{ marginBottom: 8 }}>
            {propertyId === 'annie-may' ? 'Annie May’s new website is ready to create' : `No versions yet for ${propertyName}`}
          </h2>
          <p className="caption">
            {propertyId === 'annie-may'
              ? 'The complete six-page starter includes the existing story and accommodation details, the original Annie May photography, a full gallery and the direct-booking path. Every section remains editable in place and through the AI editor.'
              : 'Create a draft to start the redesign. You’ll build pages from sections, edit any text by clicking it, and use the chat to direct the AI at whichever section you select.'}
          </p>
          {propertyId === 'annie-may' && (
            <button
              type="button"
              disabled={pending}
              className="pill-primary"
              style={{ marginTop: 18 }}
              onClick={() => run(() => createVersion(propertyId, 'Annie May · New website'))}
            >
              {pending ? 'Creating…' : 'Create Annie May website'}
            </button>
          )}
        </section>
      )}

      {version && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* ── Preview ── */}
          <div className="card" style={{ flex: '1 1 480px', minWidth: 320, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--hairline)', background: 'var(--canvas-soft)', flexWrap: 'wrap' }}>
              {pages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSlug(p.slug);
                    setSelected(null);
                  }}
                  className="caption"
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--r-pill)',
                    border: 'none',
                    cursor: 'pointer',
                    background: p.slug === (page?.slug ?? 'home') ? 'var(--primary-subdued)' : 'transparent',
                    color: 'var(--ink-secondary)',
                  }}
                >
                  {p.nav_label}
                </button>
              ))}
              {isDraft && (
                <button
                  type="button"
                  className="caption"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                  onClick={() => {
                    const s = window.prompt('New page slug (e.g. accommodation)');
                    if (s) run(() => addPage(version.id, s, s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())));
                  }}
                >
                  + page
                </button>
              )}
              <a href={previewSrc ?? '#'} target="_blank" rel="noopener noreferrer" className="caption" style={{ marginLeft: 'auto' }}>
                open full ↗
              </a>
            </div>
            {previewSrc && (
              <iframe ref={iframeRef} key={previewSrc} src={previewSrc} title="Site preview" style={{ width: '100%', height: '70vh', border: 'none', display: 'block', background: '#fff' }} />
            )}
          </div>

          {/* ── Right rail: section tools + AI chat ── */}
          {isDraft && (
            <div style={{ flex: '0 1 320px', minWidth: 280, display: 'grid', gap: 12 }}>
              <div className="card" style={{ padding: 16 }}>
                <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 8 }}>
                  {selectedSection ? `Selected: ${selectedSection.type}` : 'Click a section in the preview to select it'}
                </div>
                {selectedSection && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    <button type="button" onClick={() => moveSection(-1)} className="caption" style={toolBtn}>move up</button>
                    <button type="button" onClick={() => moveSection(1)} className="caption" style={toolBtn}>move down</button>
                    <button type="button" onClick={deleteSection} className="caption" style={{ ...toolBtn, color: 'var(--ruby)' }}>delete</button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SECTION_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={pending || !page}
                      className="tag-soft"
                      style={{ cursor: 'pointer', border: 'none' }}
                      onClick={() => page && run(() => addSectionToPage(page.id, t as SectionType))}
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI chat */}
              <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', maxHeight: '46vh' }}>
                <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 8 }}>AI editor</div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: 8, marginBottom: 10 }}>
                  {chat.length === 0 && (
                    <p className="caption">
                      Select a section, then ask: &quot;rewrite this for couples&quot;, &quot;use the
                      sauna photos&quot;, &quot;make it shorter and warmer&quot;…
                    </p>
                  )}
                  {chat.map((m, i) => (
                    <div
                      key={i}
                      className="caption"
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: m.role === 'you' ? 'var(--primary-subdued)' : 'var(--canvas-soft)',
                        color: 'var(--ink-secondary)',
                        justifySelf: m.role === 'you' ? 'end' : 'start',
                        maxWidth: '90%',
                      }}
                    >
                      {m.text}
                    </div>
                  ))}
                  {pending && <span className="caption">thinking…</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    placeholder={selectedSection ? `Edit the ${selectedSection.type}…` : 'Select a section first…'}
                    style={{ flex: 1, font: 'inherit', fontSize: 13, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--hairline-input)' }}
                  />
                  <button type="button" disabled={pending} className="pill-primary" style={{ fontSize: 12, padding: '8px 14px' }} onClick={sendChat}>
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {published.length > 0 && (
        <p className="caption" style={{ marginTop: 14 }}>
          Published history: select any published version above to view it exactly as it was;
          &quot;+ new draft&quot; from it to restore-and-edit.
        </p>
      )}
    </div>
  );
}

const toolBtn: React.CSSProperties = {
  background: 'var(--canvas)',
  border: '1px solid var(--hairline)',
  borderRadius: 8,
  padding: '4px 10px',
  cursor: 'pointer',
  color: 'var(--ink-secondary)',
};
