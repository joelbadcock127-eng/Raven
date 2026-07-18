'use client';

import { useEffect } from 'react';
import type { Section, SiteTheme, SitePageV2 } from '@/lib/siteBuilder';

/**
 * Renders a v2 site page from section data, themed per property.
 * In edit mode (?edit=1, inside the builder iframe) sections become
 * selectable entities and text fields are editable in place; changes and
 * selections are reported to the parent via postMessage:
 *   { type:'v2-select', sectionId }
 *   { type:'v2-text-edit', sectionId, path, value }
 *   { type:'v2-nav', slug }
 */

function EditableText({
  editable,
  sid,
  path,
  value,
  style,
  as: Tag = 'span',
}: {
  editable: boolean;
  sid: string;
  path: string;
  value: string;
  style?: React.CSSProperties;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
}) {
  return (
    <Tag
      style={style}
      suppressContentEditableWarning
      contentEditable={editable}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        if (!editable) return;
        const next = e.currentTarget.textContent ?? '';
        if (next !== value)
          window.parent.postMessage({ type: 'v2-text-edit', sectionId: sid, path, value: next }, '*');
      }}
      onClick={(e) => {
        if (editable) e.stopPropagation();
      }}
    >
      {value}
    </Tag>
  );
}

function SectionView({
  section,
  theme,
  editable,
  selected,
}: {
  section: Section;
  theme: SiteTheme;
  editable: boolean;
  selected: boolean;
}) {
  const s = section;
  const base: React.CSSProperties = {
    padding: '56px 24px',
    outline: selected ? '2px solid #533afd' : editable ? '1px dashed rgba(83,58,253,.25)' : 'none',
    outlineOffset: -2,
    cursor: editable ? 'pointer' : 'default',
  };
  const inner: React.CSSProperties = { maxWidth: 860, margin: '0 auto' };
  const h = (size: number): React.CSSProperties => ({
    fontFamily: theme.headingFont,
    fontSize: size,
    fontWeight: 500,
    lineHeight: 1.15,
    color: theme.ink,
  });

  switch (s.type) {
    case 'hero':
      return (
        <div
          style={{
            ...base,
            padding: 0,
            position: 'relative',
            minHeight: '62vh',
            display: 'flex',
            alignItems: 'flex-end',
            background: s.imageUrl ? `url(${s.imageUrl}) center/cover no-repeat` : theme.soft,
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: s.imageUrl ? 'linear-gradient(to top, rgba(0,0,0,.55), transparent 60%)' : 'none' }} />
          <div style={{ ...inner, position: 'relative', width: '100%', padding: '0 24px 56px', color: s.imageUrl ? '#fff' : theme.ink }}>
            <EditableText as="h1" editable={editable} sid={s.id} path="headline" value={s.headline} style={{ ...h(44), color: 'inherit' }} />
            {s.subheadline !== undefined && (
              <EditableText as="p" editable={editable} sid={s.id} path="subheadline" value={s.subheadline} style={{ fontSize: 19, marginTop: 12, opacity: 0.92 }} />
            )}
            {s.ctaText && (
              <a
                href={editable ? undefined : s.ctaHref}
                style={{
                  display: 'inline-block',
                  marginTop: 24,
                  padding: '14px 30px',
                  borderRadius: theme.radius,
                  background: theme.accent,
                  color: theme.accentInk,
                  fontSize: 16,
                }}
              >
                <EditableText editable={editable} sid={s.id} path="ctaText" value={s.ctaText} />
              </a>
            )}
          </div>
        </div>
      );
    case 'text':
      return (
        <div style={base}>
          <div style={{ ...inner, maxWidth: 680 }}>
            {s.heading !== undefined && (
              <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} style={{ ...h(30), marginBottom: 16 }} />
            )}
            <EditableText as="p" editable={editable} sid={s.id} path="body" value={s.body} style={{ fontSize: 17, lineHeight: 1.75 }} />
          </div>
        </div>
      );
    case 'gallery':
      return (
        <div style={{ ...base, background: theme.soft }}>
          <div style={inner}>
            {s.heading !== undefined && (
              <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} style={{ ...h(30), marginBottom: 20 }} />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {s.images.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img.url} alt={img.alt ?? ''} loading="lazy" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: theme.radius }} />
              ))}
              {s.images.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', border: '1px dashed rgba(0,0,0,.2)', borderRadius: theme.radius, fontSize: 13, opacity: 0.6 }}>
                  No images yet — attach from the media library in the builder
                </div>
              )}
            </div>
          </div>
        </div>
      );
    case 'features':
      return (
        <div style={base}>
          <div style={inner}>
            {s.heading !== undefined && (
              <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} style={{ ...h(30), marginBottom: 24 }} />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
              {s.items.map((item, i) => (
                <div key={i}>
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', borderRadius: theme.radius, marginBottom: 12 }} />
                  )}
                  <EditableText as="h3" editable={editable} sid={s.id} path={`items.${i}.title`} value={item.title} style={{ ...h(19), marginBottom: 6 }} />
                  <EditableText as="p" editable={editable} sid={s.id} path={`items.${i}.body`} value={item.body} style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.85 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case 'quote':
      return (
        <div style={{ ...base, background: theme.soft, textAlign: 'center' }}>
          <div style={{ ...inner, maxWidth: 640 }}>
            <EditableText as="p" editable={editable} sid={s.id} path="text" value={s.text} style={{ fontFamily: theme.headingFont, fontSize: 24, lineHeight: 1.45, fontStyle: 'italic' }} />
            {s.attribution !== undefined && (
              <EditableText as="p" editable={editable} sid={s.id} path="attribution" value={s.attribution} style={{ marginTop: 14, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.6 }} />
            )}
          </div>
        </div>
      );
    case 'faq':
      return (
        <div style={base}>
          <div style={{ ...inner, maxWidth: 680 }}>
            {s.heading !== undefined && (
              <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} style={{ ...h(30), marginBottom: 20 }} />
            )}
            {s.items.map((item, i) => (
              <details key={i} style={{ borderBottom: '1px solid rgba(0,0,0,.1)', padding: '14px 0' }} open={editable}>
                <summary style={{ fontWeight: 500, cursor: 'pointer', fontSize: 16 }}>
                  <EditableText editable={editable} sid={s.id} path={`items.${i}.q`} value={item.q} />
                </summary>
                <EditableText as="p" editable={editable} sid={s.id} path={`items.${i}.a`} value={item.a} style={{ paddingTop: 8, fontSize: 15, lineHeight: 1.6, opacity: 0.85 }} />
              </details>
            ))}
          </div>
        </div>
      );
    case 'cta':
      return (
        <div style={{ ...base, background: theme.accent, color: theme.accentInk, textAlign: 'center' }}>
          <div style={{ ...inner, maxWidth: 640 }}>
            <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} style={{ ...h(32), color: theme.accentInk, marginBottom: 10 }} />
            {s.body !== undefined && (
              <EditableText as="p" editable={editable} sid={s.id} path="body" value={s.body} style={{ fontSize: 16, opacity: 0.9, marginBottom: 20 }} />
            )}
            <a
              href={editable ? undefined : s.buttonHref}
              style={{ display: 'inline-block', padding: '14px 32px', borderRadius: theme.radius, background: theme.accentInk, color: theme.accent, fontSize: 16, fontWeight: 500 }}
            >
              <EditableText editable={editable} sid={s.id} path="buttonText" value={s.buttonText} />
            </a>
          </div>
        </div>
      );
  }
}

export default function SiteRenderer({
  propertyName,
  pages,
  currentSlug,
  theme,
  editable,
  selectedId,
  standalone,
}: {
  propertyName: string;
  pages: SitePageV2[];
  currentSlug: string;
  theme: SiteTheme;
  editable: boolean;
  selectedId?: string | null;
  standalone: boolean; // true on a custom domain (real links), false in builder iframe
}) {
  const page = pages.find((p) => p.slug === currentSlug) ?? pages[0];

  useEffect(() => {
    if (editable) window.parent.postMessage({ type: 'v2-nav', slug: page?.slug ?? 'home' }, '*');
  }, [editable, page?.slug]);

  if (!page) return <p style={{ padding: 40 }}>No pages yet.</p>;

  const hrefFor = (slug: string) => (standalone ? (slug === 'home' ? '/' : `/${slug}`) : `?page=${slug}`);

  return (
    <div style={{ background: theme.bg, color: theme.ink, fontFamily: theme.bodyFont, minHeight: '100vh' }}>
      {/* site nav */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', maxWidth: 960, margin: '0 auto', padding: '18px 24px' }}>
        <span style={{ fontFamily: theme.headingFont, fontSize: 20 }}>{propertyName}</span>
        <nav style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {pages.map((p) => (
            <a
              key={p.slug}
              href={hrefFor(p.slug)}
              onClick={(e) => {
                if (editable) {
                  e.preventDefault();
                  window.parent.postMessage({ type: 'v2-goto', slug: p.slug }, '*');
                }
              }}
              style={{
                padding: '7px 13px',
                borderRadius: theme.radius,
                fontSize: 14,
                color: p.slug === page.slug ? theme.accentInk : theme.ink,
                background: p.slug === page.slug ? theme.accent : 'transparent',
              }}
            >
              {p.nav_label}
            </a>
          ))}
        </nav>
      </header>

      {page.sections.map((s) => (
        <section
          key={s.id}
          data-sid={s.id}
          onClick={() => {
            if (editable) window.parent.postMessage({ type: 'v2-select', sectionId: s.id }, '*');
          }}
        >
          <SectionView section={s} theme={theme} editable={editable} selected={selectedId === s.id} />
        </section>
      ))}

      <footer style={{ textAlign: 'center', padding: '32px 24px', fontSize: 13, opacity: 0.6 }}>
        © {propertyName} · book direct with the owners
      </footer>
    </div>
  );
}
