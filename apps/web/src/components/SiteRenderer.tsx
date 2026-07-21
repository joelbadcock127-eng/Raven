'use client';

import { useEffect, useRef, useState } from 'react';
import type { Section, SiteTheme, SitePageV2 } from '@/lib/siteBuilder';

/**
 * Renders a v2 site page from section data — lodge-style: image-led,
 * quiet serif typography, scroll-reveal animation, fixed header that
 * turns solid past the hero.
 * In edit mode (?edit=1, inside the builder iframe) sections become
 * selectable entities and text fields are editable in place; changes and
 * selections are reported to the parent via postMessage:
 *   { type:'v2-select', sectionId }
 *   { type:'v2-text-edit', sectionId, path, value }
 *   { type:'v2-goto', slug }
 */

function EditableText({
  editable,
  sid,
  path,
  value,
  style,
  className,
  as: Tag = 'span',
}: {
  editable: boolean;
  sid: string;
  path: string;
  value: string;
  style?: React.CSSProperties;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
}) {
  return (
    <Tag
      style={style}
      className={className}
      suppressContentEditableWarning
      contentEditable={editable}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        if (!editable) return;
        const next = e.currentTarget.textContent ?? '';
        if (next !== value)
          window.parent.postMessage({ type: 'v2-text-edit', sectionId: sid, path, value: next }, '*');
      }}
      onClick={(e) => {
        if (editable) {
          e.stopPropagation();
          window.parent.postMessage({ type: 'v2-select', sectionId: sid }, '*');
        }
      }}
    >
      {value}
    </Tag>
  );
}

/* premium outlined button — uppercase, tracked, fills on hover */
function LodgeButton({
  href,
  children,
  light,
  editable,
}: {
  href?: string;
  children: React.ReactNode;
  light?: boolean;
  editable?: boolean;
}) {
  return (
    <a href={editable ? undefined : href} className={`ldg-btn${light ? ' ldg-btn-light' : ''}`}>
      {children}
    </a>
  );
}

function SectionView({
  section,
  theme,
  editable,
  selected,
  onZoom,
  resolve,
}: {
  section: Section;
  theme: SiteTheme;
  editable: boolean;
  selected: boolean;
  onZoom: (url: string, alt: string) => void;
  resolve: (href?: string) => string | undefined;
}) {
  const s = section;

  switch (s.type) {
    case 'hero':
      return (
        <div className="ldg-hero">
          {s.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imageUrl} alt="" className="ldg-hero-img" />
          )}
          <div className="ldg-hero-shade" />
          <div className="ldg-hero-copy">
            {s.kicker !== undefined && (
              <EditableText editable={editable} sid={s.id} path="kicker" value={s.kicker} className="ldg-kicker ldg-kicker-light rv rv-1" as="p" />
            )}
            <EditableText as="h1" editable={editable} sid={s.id} path="headline" value={s.headline} className="ldg-display rv rv-2" />
            {s.subheadline !== undefined && (
              <EditableText as="p" editable={editable} sid={s.id} path="subheadline" value={s.subheadline} className="ldg-hero-sub rv rv-3" />
            )}
            {s.ctaText && (
              <div className="rv rv-4" style={{ marginTop: 34 }}>
                <LodgeButton href={resolve(s.ctaHref)} light editable={editable}>
                  <EditableText editable={editable} sid={s.id} path="ctaText" value={s.ctaText} />
                </LodgeButton>
              </div>
            )}
          </div>
          <div className="ldg-scrollcue" aria-hidden />
        </div>
      );

    case 'fullbleed':
      return (
        <div className="ldg-fullbleed">
          {s.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imageUrl} alt="" className="ldg-fullbleed-img plx" />
          )}
          <div className="ldg-fullbleed-shade" />
          <div className="ldg-fullbleed-copy">
            {s.kicker !== undefined && s.kicker !== '' && (
              <EditableText editable={editable} sid={s.id} path="kicker" value={s.kicker} className="ldg-kicker ldg-kicker-light rv" as="p" />
            )}
            {s.headline !== undefined && (
              <EditableText as="h2" editable={editable} sid={s.id} path="headline" value={s.headline} className="ldg-display-sm rv rv-2" />
            )}
          </div>
        </div>
      );

    case 'split': {
      const imgRight = (s.align ?? 'right') === 'right';
      return (
        <div className="ldg-pad">
          <div className={`ldg-split${imgRight ? '' : ' ldg-split-rev'}`}>
            <div className="ldg-split-copy rv">
              {s.kicker !== undefined && (
                <EditableText editable={editable} sid={s.id} path="kicker" value={s.kicker} className="ldg-kicker" as="p" />
              )}
              <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} className="ldg-h2" />
              <EditableText as="p" editable={editable} sid={s.id} path="body" value={s.body} className="ldg-body" />
              {s.ctaText && (
                <div style={{ marginTop: 26 }}>
                  <LodgeButton href={resolve(s.ctaHref)} editable={editable}>
                    <EditableText editable={editable} sid={s.id} path="ctaText" value={s.ctaText} />
                  </LodgeButton>
                </div>
              )}
            </div>
            <div className="ldg-split-media rv rv-2">
              {s.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.imageUrl} alt="" loading="lazy" className="ldg-zoomable" onClick={(e) => { if (!editable) { e.stopPropagation(); onZoom(s.imageUrl!, s.heading); } }} />
              )}
            </div>
          </div>
        </div>
      );
    }

    case 'stats':
      return (
        <div className="ldg-pad ldg-stats-band">
          <div className="ldg-stats">
            {s.items.map((item, i) => (
              <div key={i} className={`ldg-stat rv rv-${(i % 4) + 1}`}>
                <EditableText editable={editable} sid={s.id} path={`items.${i}.value`} value={item.value} className="ldg-stat-value" as="div" />
                <EditableText editable={editable} sid={s.id} path={`items.${i}.label`} value={item.label} className="ldg-kicker" as="div" />
              </div>
            ))}
          </div>
        </div>
      );

    case 'text':
      return (
        <div className="ldg-pad">
          <div className="ldg-prose rv">
            {s.heading !== undefined && (
              <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} className="ldg-h2" />
            )}
            <EditableText as="p" editable={editable} sid={s.id} path="body" value={s.body} className="ldg-body" />
          </div>
        </div>
      );

    case 'gallery':
      return (
        <div className="ldg-pad ldg-gallery-band">
          <div className="ldg-wide">
            {s.heading !== undefined && (
              <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} className="ldg-h2 ldg-center rv" style={{ marginBottom: 34 }} />
            )}
            <div className="ldg-grid">
              {s.images.map((img, i) => (
                <figure key={i} className={`ldg-cell rv rv-${(i % 3) + 1}${i % 7 === 0 ? ' ldg-cell-wide' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ?? ''} loading="lazy" className="ldg-zoomable" onClick={(e) => { if (!editable) { e.stopPropagation(); onZoom(img.url, img.alt ?? ''); } }} />
                </figure>
              ))}
              {s.images.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', border: '1px dashed rgba(0,0,0,.2)', fontSize: 13, opacity: 0.6, gridColumn: '1/-1' }}>
                  No images yet — attach from the media library in the builder
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case 'features':
      return (
        <div className="ldg-pad">
          <div className="ldg-wide">
            {s.heading !== undefined && (
              <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} className="ldg-h2 ldg-center rv" style={{ marginBottom: 40 }} />
            )}
            <div className="ldg-features">
              {s.items.map((item, i) => (
                <div key={i} className={`ldg-feature rv rv-${(i % 3) + 1}`}>
                  {item.imageUrl && (
                    <div className="ldg-feature-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt="" loading="lazy" className="ldg-zoomable" onClick={(e) => { if (!editable) { e.stopPropagation(); onZoom(item.imageUrl!, item.title); } }} />
                    </div>
                  )}
                  <EditableText as="h3" editable={editable} sid={s.id} path={`items.${i}.title`} value={item.title} className="ldg-feature-title" />
                  <EditableText as="p" editable={editable} sid={s.id} path={`items.${i}.body`} value={item.body} className="ldg-body ldg-body-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'quote':
      return (
        <div className="ldg-pad ldg-quote-band">
          <div className="ldg-prose ldg-center rv">
            <div className="ldg-quote-mark" aria-hidden>“</div>
            <EditableText as="p" editable={editable} sid={s.id} path="text" value={s.text} className="ldg-quote" />
            {s.attribution !== undefined && (
              <EditableText as="p" editable={editable} sid={s.id} path="attribution" value={s.attribution} className="ldg-kicker" style={{ marginTop: 22 }} />
            )}
          </div>
        </div>
      );

    case 'faq':
      return (
        <div className="ldg-pad">
          <div className="ldg-prose rv">
            {s.heading !== undefined && (
              <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} className="ldg-h2" style={{ marginBottom: 26 }} />
            )}
            {s.items.map((item, i) => (
              <details key={i} className="ldg-faq" open={editable}>
                <summary>
                  <EditableText editable={editable} sid={s.id} path={`items.${i}.q`} value={item.q} />
                  <span className="ldg-faq-plus" aria-hidden>+</span>
                </summary>
                <EditableText as="p" editable={editable} sid={s.id} path={`items.${i}.a`} value={item.a} className="ldg-body ldg-body-sm" style={{ paddingBottom: 18 }} />
              </details>
            ))}
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="ldg-pad ldg-cta-band">
          <div className="ldg-prose ldg-center rv">
            <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} className="ldg-h2" />
            {s.body !== undefined && s.body !== '' && (
              <EditableText as="p" editable={editable} sid={s.id} path="body" value={s.body} className="ldg-body" style={{ marginTop: 14 }} />
            )}
            <div style={{ marginTop: 30 }}>
              <LodgeButton href={resolve(s.buttonHref)} editable={editable}>
                <EditableText editable={editable} sid={s.id} path="buttonText" value={s.buttonText} />
              </LodgeButton>
            </div>
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
  versionParam,
}: {
  propertyName: string;
  pages: SitePageV2[];
  currentSlug: string;
  theme: SiteTheme;
  editable: boolean;
  selectedId?: string | null;
  standalone: boolean; // true on a custom domain (real links), false in builder iframe / preview tab
  versionParam?: string | null; // preserved across links so a draft preview stays on the draft
}) {
  const page = pages.find((p) => p.slug === currentSlug) ?? pages[0];
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [zoom, setZoom] = useState<{ url: string; alt: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const zoomImages = Array.from(
    new Map(
      (page?.sections ?? [])
        .flatMap((section) => {
          if (section.type === 'split' && section.imageUrl)
            return [{ url: section.imageUrl, alt: section.heading }];
          if (section.type === 'gallery')
            return section.images.map((image) => ({ url: image.url, alt: image.alt ?? '' }));
          if (section.type === 'features')
            return section.items
              .filter((item) => item.imageUrl)
              .map((item) => ({ url: item.imageUrl!, alt: item.title }));
          return [];
        })
        .map((image) => [image.url, image]),
    ).values(),
  );

  useEffect(() => {
    if (editable) window.parent.postMessage({ type: 'v2-nav', slug: page?.slug ?? 'home' }, '*');
    setMenuOpen(false);
  }, [editable, page?.slug]);

  // scroll-reveal + header state + gentle parallax on fullbleed imagery
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 },
    );
    root.querySelectorAll('.rv').forEach((el) => io.observe(el));

    let raf = 0;
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.querySelectorAll<HTMLElement>('.plx').forEach((el) => {
          const r = el.parentElement!.getBoundingClientRect();
          const mid = r.top + r.height / 2 - window.innerHeight / 2;
          el.style.transform = `translateY(${mid * -0.08}px) scale(1.18)`;
        });
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [page?.slug]);

  useEffect(() => {
    if (!zoom) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoom(null);
      if (zoomImages.length < 2) return;
      const current = Math.max(0, zoomImages.findIndex((image) => image.url === zoom.url));
      if (event.key === 'ArrowLeft')
        setZoom(zoomImages[(current - 1 + zoomImages.length) % zoomImages.length]);
      if (event.key === 'ArrowRight')
        setZoom(zoomImages[(current + 1) % zoomImages.length]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoom, zoomImages]);

  if (!page) return <p style={{ padding: 40 }}>No pages yet.</p>;

  const hrefFor = (slug: string) => {
    if (standalone) return slug === 'home' ? '/' : `/${slug}`;
    return `?page=${slug}${versionParam ? `&version=${versionParam}` : ''}`;
  };
  // section CTAs store internal links as '?page=<slug>' — normalize per context
  const resolve = (href?: string) =>
    href?.startsWith('?page=') ? hrefFor(href.slice(6).split('&')[0]) : href;

  // header "Book" button: first booking link found anywhere in the version
  let bookHref: string | undefined;
  for (const p of pages)
    for (const s of p.sections) {
      if (s.type === 'cta' && s.buttonHref && s.buttonHref !== '#') bookHref = bookHref ?? s.buttonHref;
      if (s.type === 'hero' && s.ctaHref && s.ctaHref !== '#') bookHref = bookHref ?? s.ctaHref;
    }

  const firstIsImage = page.sections[0]?.type === 'hero' || page.sections[0]?.type === 'fullbleed';
  const headerSolid = scrolled || !firstIsImage || menuOpen;

  const css = `
  .ldg-root { background:${theme.bg}; color:${theme.ink}; font-family:${theme.bodyFont}; font-weight:300; min-height:100vh; overflow-x:clip; }
  .ldg-root ::selection { background:${theme.accent}; color:#fff; }
  .ldg-root img { display:block; }
  .ldg-root a { color:inherit; text-decoration:none; }

  /* type system */
  .ldg-kicker { font-size:11px; letter-spacing:.32em; text-transform:uppercase; font-weight:400; opacity:.72; font-family:${theme.bodyFont}; }
  .ldg-kicker-light { opacity:.9; }
  .ldg-display { font-family:${theme.headingFont}; font-weight:300; font-size:clamp(40px, 7.4vw, 86px); line-height:1.04; letter-spacing:.01em; margin-top:18px; }
  .ldg-display-sm { font-family:${theme.headingFont}; font-weight:300; font-size:clamp(30px, 4.6vw, 56px); line-height:1.1; margin-top:14px; }
  .ldg-h2 { font-family:${theme.headingFont}; font-weight:300; font-size:clamp(28px, 3.6vw, 46px); line-height:1.12; margin-top:14px; }
  .ldg-body { font-size:clamp(15px, 1.7vw, 16.5px); line-height:1.9; font-weight:300; margin-top:18px; white-space:pre-line; max-width:60ch; }
  .ldg-body-sm { font-size:14.5px; line-height:1.8; margin-top:10px; }
  .ldg-center { text-align:center; }
  .ldg-center .ldg-body { margin-left:auto; margin-right:auto; }

  /* layout */
  .ldg-pad { padding:clamp(56px, 9vw, 110px) clamp(20px, 5vw, 48px); }
  .ldg-prose { max-width:660px; margin:0 auto; }
  .ldg-wide { max-width:1240px; margin:0 auto; }

  /* reveal animation */
  .rv { opacity:0; transform:translateY(26px); transition:opacity 1s cubic-bezier(.22,.61,.36,1), transform 1s cubic-bezier(.22,.61,.36,1); }
  .rv-2 { transition-delay:.12s; } .rv-3 { transition-delay:.24s; } .rv-4 { transition-delay:.36s; }
  .rv.in { opacity:1; transform:none; }
  [data-edit] .rv { opacity:1; transform:none; transition:none; }
  @media (prefers-reduced-motion: reduce) { .rv { opacity:1; transform:none; transition:none; } .ldg-hero-img { animation:none; } }

  /* header */
  .ldg-header { position:fixed; top:0; left:0; right:0; z-index:60; display:flex; align-items:center; gap:20px;
    padding:0 clamp(18px, 4vw, 40px); height:76px; transition:background .45s ease, color .45s ease, box-shadow .45s ease, height .45s ease; }
  .ldg-header.solid { background:${theme.bg}f2; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); color:${theme.ink}; height:64px; box-shadow:0 1px 0 rgba(0,0,0,.07); }
  .ldg-header.overlay { background:linear-gradient(to bottom, rgba(0,0,0,.36), transparent); color:#fff; }
  .ldg-wordmark { font-family:${theme.headingFont}; font-weight:400; font-size:clamp(17px, 2.4vw, 21px); letter-spacing:.08em; white-space:nowrap; }
  .ldg-nav { margin-left:auto; display:flex; gap:clamp(10px, 2.4vw, 30px); align-items:center; overflow-x:auto; scrollbar-width:none; }
  .ldg-nav::-webkit-scrollbar { display:none; }
  .ldg-nav a { font-size:11px; letter-spacing:.24em; text-transform:uppercase; font-weight:400; opacity:.82; padding:6px 0; border-bottom:1px solid transparent; transition:opacity .3s, border-color .3s; white-space:nowrap; }
  .ldg-nav a:hover { opacity:1; }
  .ldg-nav a.active { opacity:1; border-bottom-color:currentColor; }
  .ldg-book { font-size:11px; letter-spacing:.24em; text-transform:uppercase; border:1px solid currentColor; padding:10px 18px; transition:background .3s, color .3s; white-space:nowrap; }
  .ldg-header.solid .ldg-book:hover { background:${theme.ink}; color:${theme.bg}; }
  .ldg-header.overlay .ldg-book:hover { background:#fff; color:#111; }
  .ldg-menu-toggle { display:none; margin-left:auto; border:0; background:none; color:inherit; width:42px; height:42px; padding:10px; cursor:pointer; }
  .ldg-menu-toggle span { display:block; height:1px; background:currentColor; margin:6px 0; transition:transform .3s, opacity .3s; }
  .ldg-menu-toggle.open span:first-child { transform:translateY(3.5px) rotate(45deg); }
  .ldg-menu-toggle.open span:last-child { transform:translateY(-3.5px) rotate(-45deg); }
  @media (max-width: 760px) {
    .ldg-header { height:64px; }
    .ldg-menu-toggle { display:block; }
    .ldg-nav { display:none; position:absolute; top:64px; left:0; right:0; margin:0; padding:26px 22px 30px; background:${theme.bg}; color:${theme.ink};
      flex-direction:column; align-items:flex-start; gap:18px; box-shadow:0 14px 30px rgba(0,0,0,.12); overflow:visible; }
    .ldg-nav.open { display:flex; }
    .ldg-nav a { font-size:12px; width:100%; padding:4px 0 10px; }
    .ldg-nav .ldg-book { width:auto; padding:11px 18px; }
  }

  /* hero */
  .ldg-hero { position:relative; min-height:100svh; display:flex; align-items:center; justify-content:center; text-align:center; overflow:hidden; background:${theme.ink}; }
  .ldg-hero-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; animation:ldg-kenburns 14s ease-out forwards; }
  @keyframes ldg-kenburns { from { transform:scale(1.12); } to { transform:scale(1.0); } }
  .ldg-hero-shade { position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,.30), rgba(0,0,0,.12) 40%, rgba(0,0,0,.42)); }
  .ldg-hero-copy { position:relative; color:#fff; padding:120px 22px 90px; max-width:900px; }
  .ldg-hero-sub { font-size:clamp(14.5px, 1.8vw, 17px); line-height:1.8; font-weight:300; margin:22px auto 0; max-width:560px; opacity:.94; }
  .ldg-scrollcue { position:absolute; bottom:0; left:50%; width:1px; height:72px; background:rgba(255,255,255,.75); transform-origin:top;
    animation:ldg-cue 2.4s ease-in-out infinite; }
  @keyframes ldg-cue { 0% { transform:scaleY(0); } 45% { transform:scaleY(1); } 100% { transform:scaleY(1); opacity:0; } }

  /* fullbleed */
  .ldg-fullbleed { position:relative; min-height:74vh; display:flex; align-items:flex-end; overflow:hidden; background:${theme.ink}; }
  .ldg-fullbleed-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transform:scale(1.18); will-change:transform; }
  .ldg-fullbleed-shade { position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,.5), transparent 55%); }
  .ldg-fullbleed-copy { position:relative; color:#fff; padding:clamp(36px, 6vw, 72px) clamp(20px, 5vw, 48px); max-width:1240px; margin:0 auto; width:100%; }

  /* split */
  .ldg-split { max-width:1240px; margin:0 auto; display:grid; grid-template-columns:minmax(0,5fr) minmax(0,6fr); gap:clamp(28px, 5vw, 76px); align-items:center; }
  .ldg-split-rev { grid-template-columns:minmax(0,6fr) minmax(0,5fr); }
  .ldg-split-rev .ldg-split-copy { order:2; }
  .ldg-split-rev .ldg-split-media { order:1; }
  .ldg-split-media { overflow:hidden; }
  .ldg-split-media img { width:100%; aspect-ratio:4/4.4; object-fit:cover; transition:transform 1.4s cubic-bezier(.22,.61,.36,1); }
  .ldg-split-media:hover img { transform:scale(1.045); }
  @media (max-width: 780px) {
    .ldg-split, .ldg-split-rev { grid-template-columns:1fr; }
    .ldg-split-rev .ldg-split-copy { order:1; }
    .ldg-split-rev .ldg-split-media { order:2; }
    .ldg-split-media img { aspect-ratio:4/3.4; }
  }

  /* stats */
  .ldg-stats-band { background:${theme.soft}; }
  .ldg-stats { max-width:1100px; margin:0 auto; display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:30px; text-align:center; }
  .ldg-stat-value { font-family:${theme.headingFont}; font-weight:300; font-size:clamp(38px, 5vw, 64px); line-height:1; margin-bottom:12px; }

  /* gallery */
  .ldg-gallery-band { background:${theme.soft}; }
  .ldg-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(230px, 44vw), 1fr)); gap:6px; }
  .ldg-cell { margin:0; overflow:hidden; }
  .ldg-cell img { width:100%; height:100%; aspect-ratio:4/3; object-fit:cover; transition:transform 1.2s cubic-bezier(.22,.61,.36,1); }
  .ldg-cell:hover img { transform:scale(1.05); }
  .ldg-cell-wide { grid-column:span 2; }
  .ldg-cell-wide img { aspect-ratio:8/4.1; }
  @media (max-width: 560px) { .ldg-cell-wide { grid-column:span 1; } .ldg-cell-wide img { aspect-ratio:4/3; } }
  .ldg-zoomable { cursor:${editable ? 'pointer' : 'zoom-in'}; }

  /* features */
  .ldg-features { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap:clamp(26px, 3.4vw, 44px); }
  .ldg-feature-media { overflow:hidden; margin-bottom:18px; }
  .ldg-feature-media img { width:100%; aspect-ratio:3/2.1; object-fit:cover; transition:transform 1.2s cubic-bezier(.22,.61,.36,1); }
  .ldg-feature:hover .ldg-feature-media img { transform:scale(1.05); }
  .ldg-feature-title { font-family:${theme.bodyFont}; font-size:12px; letter-spacing:.26em; text-transform:uppercase; font-weight:400; }

  /* quote */
  .ldg-quote-band { background:${theme.soft}; }
  .ldg-quote-mark { font-family:${theme.headingFont}; font-size:84px; line-height:.4; opacity:.28; margin-bottom:26px; }
  .ldg-quote { font-family:${theme.headingFont}; font-style:italic; font-weight:300; font-size:clamp(21px, 3vw, 30px); line-height:1.5; }

  /* faq */
  .ldg-faq { border-bottom:1px solid rgba(0,0,0,.13); }
  .ldg-faq summary { display:flex; align-items:center; justify-content:space-between; gap:16px; list-style:none; cursor:pointer;
    padding:20px 0; font-family:${theme.headingFont}; font-size:clamp(17px, 2vw, 20px); font-weight:400; }
  .ldg-faq summary::-webkit-details-marker { display:none; }
  .ldg-faq-plus { font-size:20px; font-weight:300; opacity:.5; transition:transform .35s ease; }
  .ldg-faq[open] .ldg-faq-plus { transform:rotate(45deg); }

  /* buttons + cta */
  .ldg-btn { display:inline-block; font-size:11px; letter-spacing:.26em; text-transform:uppercase; font-weight:400;
    border:1px solid ${theme.ink}; color:${theme.ink}; padding:15px 34px; transition:background .35s, color .35s; cursor:pointer; }
  .ldg-btn:hover { background:${theme.ink}; color:${theme.bg}; }
  .ldg-btn-light { border-color:#fff; color:#fff; }
  .ldg-btn-light:hover { background:#fff; color:#111; }
  .ldg-cta-band { background:${theme.ink}; color:${theme.bg}; }
  .ldg-cta-band .ldg-btn { border-color:${theme.bg}; color:${theme.bg}; }
  .ldg-cta-band .ldg-btn:hover { background:${theme.bg}; color:${theme.ink}; }

  /* footer */
  .ldg-footer { padding:clamp(48px, 7vw, 80px) 24px 42px; text-align:center; border-top:1px solid rgba(0,0,0,.08); }
  .ldg-footer-mark { font-family:${theme.headingFont}; font-size:26px; letter-spacing:.1em; }
  .ldg-footer-nav { display:flex; gap:22px; justify-content:center; flex-wrap:wrap; margin-top:22px; }
  .ldg-footer-nav a { font-size:10.5px; letter-spacing:.26em; text-transform:uppercase; opacity:.62; transition:opacity .3s; }
  .ldg-footer-nav a:hover { opacity:1; }
  .ldg-footer-fine { margin-top:26px; font-size:11.5px; opacity:.5; letter-spacing:.04em; }

  /* lightbox */
  .ldg-lightbox { position:fixed; inset:0; z-index:90; background:rgba(12,10,7,.94); display:flex; align-items:center; justify-content:center;
    padding:4vw; cursor:zoom-out; animation:ldg-fade .35s ease; }
  @keyframes ldg-fade { from { opacity:0; } to { opacity:1; } }
  .ldg-lightbox img { max-width:100%; max-height:100%; object-fit:contain; box-shadow:0 30px 80px rgba(0,0,0,.5); }
  .ldg-lightbox figcaption { position:absolute; bottom:22px; left:0; right:0; text-align:center; color:#fff; font-size:11px; letter-spacing:.22em; text-transform:uppercase; opacity:.7; }
  .ldg-lightbox-nav { position:absolute; top:50%; transform:translateY(-50%); border:0; background:rgba(255,255,255,.08); color:#fff;
    width:48px; height:64px; font:300 30px/1 ${theme.headingFont}; cursor:pointer; transition:background .25s; }
  .ldg-lightbox-nav:hover { background:rgba(255,255,255,.18); }
  .ldg-lightbox-prev { left:18px; } .ldg-lightbox-next { right:18px; }
  .ldg-lightbox-close { position:absolute; top:18px; right:22px; border:0; background:none; color:#fff; font-size:28px; font-weight:200; cursor:pointer; opacity:.76; }
  @media (max-width: 640px) { .ldg-lightbox-nav { width:38px; height:54px; } .ldg-lightbox-prev { left:6px; } .ldg-lightbox-next { right:6px; } }

  /* edit affordances */
  [data-edit] section { outline:1px dashed rgba(83,58,253,.3); outline-offset:-2px; cursor:pointer; }
  [data-edit] section.sel { outline:2px solid #533afd; }
  `;

  return (
    <div ref={rootRef} className="ldg-root" data-edit={editable ? '' : undefined}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header className={`ldg-header ${headerSolid ? 'solid' : 'overlay'}`}>
        <a href={hrefFor('home')} className="ldg-wordmark" onClick={(e) => { if (editable) { e.preventDefault(); window.parent.postMessage({ type: 'v2-goto', slug: 'home' }, '*'); } }}>
          {propertyName}
        </a>
        <button
          type="button"
          className={`ldg-menu-toggle${menuOpen ? ' open' : ''}`}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
        <nav className={`ldg-nav${menuOpen ? ' open' : ''}`}>
          {pages.map((p) => (
            <a
              key={p.slug}
              href={hrefFor(p.slug)}
              className={p.slug === page.slug ? 'active' : undefined}
              onClick={(e) => {
                setMenuOpen(false);
                if (editable) {
                  e.preventDefault();
                  window.parent.postMessage({ type: 'v2-goto', slug: p.slug }, '*');
                }
              }}
            >
              {p.nav_label}
            </a>
          ))}
          {bookHref && (
            <a href={editable ? undefined : bookHref} className="ldg-book" target={standalone ? undefined : '_blank'} rel="noreferrer" onClick={() => setMenuOpen(false)}>
              Book
            </a>
          )}
        </nav>
      </header>

      {page.sections.map((s) => (
        <section
          key={s.id}
          data-sid={s.id}
          className={selectedId === s.id ? 'sel' : undefined}
          onClick={() => {
            if (editable) window.parent.postMessage({ type: 'v2-select', sectionId: s.id }, '*');
          }}
        >
          <SectionView section={s} theme={theme} editable={editable} selected={selectedId === s.id} onZoom={(url, alt) => setZoom({ url, alt })} resolve={resolve} />
        </section>
      ))}

      <footer className="ldg-footer">
        <div className="ldg-footer-mark">{propertyName}</div>
        <nav className="ldg-footer-nav">
          {pages.map((p) => (
            <a key={p.slug} href={hrefFor(p.slug)}>{p.nav_label}</a>
          ))}
        </nav>
        <div className="ldg-footer-fine">© {propertyName} · Book direct with the owners</div>
      </footer>

      {zoom && (
        <figure className="ldg-lightbox" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.url} alt={zoom.alt} />
          <button type="button" className="ldg-lightbox-close" aria-label="Close gallery" onClick={() => setZoom(null)}>×</button>
          {zoomImages.length > 1 && (
            <>
              <button
                type="button"
                className="ldg-lightbox-nav ldg-lightbox-prev"
                aria-label="Previous image"
                onClick={(event) => {
                  event.stopPropagation();
                  const current = Math.max(0, zoomImages.findIndex((image) => image.url === zoom.url));
                  setZoom(zoomImages[(current - 1 + zoomImages.length) % zoomImages.length]);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="ldg-lightbox-nav ldg-lightbox-next"
                aria-label="Next image"
                onClick={(event) => {
                  event.stopPropagation();
                  const current = Math.max(0, zoomImages.findIndex((image) => image.url === zoom.url));
                  setZoom(zoomImages[(current + 1) % zoomImages.length]);
                }}
              >
                ›
              </button>
            </>
          )}
          {zoom.alt && <figcaption>{zoom.alt}</figcaption>}
        </figure>
      )}
    </div>
  );
}
