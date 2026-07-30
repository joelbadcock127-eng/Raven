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
        if (editable) e.stopPropagation();
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
            <img src={s.imageUrl} alt="" className="ldg-hero-img" fetchPriority="high" decoding="async" />
          )}
          <div className="ldg-hero-shade" />
          <div className="ldg-hero-copy">
            {s.kicker !== undefined && (
              <EditableText editable={editable} sid={s.id} path="kicker" value={s.kicker} className="ldg-kicker ldg-kicker-light rvt rv-1" as="p" />
            )}
            <EditableText as="h1" editable={editable} sid={s.id} path="headline" value={s.headline} className="ldg-display rvt rv-2" />
            {s.subheadline !== undefined && (
              <EditableText as="p" editable={editable} sid={s.id} path="subheadline" value={s.subheadline} className="ldg-hero-sub rvt rv-3" />
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
        <div className={`ldg-fullbleed${s.height === 'full' ? ' ldg-fullbleed-full' : ''}`}>
          {s.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imageUrl} alt="" className="ldg-fullbleed-img plx" />
          )}
          <div className="ldg-fullbleed-shade" />
          <div className="ldg-fullbleed-copy">
            {s.kicker !== undefined && (editable || s.kicker !== '') && (
              <EditableText editable={editable} sid={s.id} path="kicker" value={s.kicker} className="ldg-kicker ldg-kicker-light rvt" as="p" />
            )}
            {s.headline !== undefined && (
              <EditableText as="h2" editable={editable} sid={s.id} path="headline" value={s.headline} className="ldg-display-sm rvt rv-2" />
            )}
            {s.body !== undefined && (editable || s.body !== '') && (
              <EditableText as="p" editable={editable} sid={s.id} path="body" value={s.body} className="ldg-fullbleed-body rvt rv-3" />
            )}
            {s.ctaText && (
              <div className="rv rv-4" style={{ marginTop: 26 }}>
                <LodgeButton href={resolve(s.ctaHref)} light editable={editable}>
                  <EditableText editable={editable} sid={s.id} path="ctaText" value={s.ctaText} />
                </LodgeButton>
              </div>
            )}
          </div>
        </div>
      );

    case 'split': {
      const imgRight = (s.align ?? 'right') === 'right';
      const aspect = s.imageAspect === 'portrait' ? '3/4' : s.imageAspect === 'landscape' ? '4/3' : s.imageAspect === 'square' ? '1/1' : undefined;
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
            <div className="ldg-split-media ldg-tilt rvm rv-2">
              {s.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.imageUrl} alt="" loading="lazy" decoding="async" className="ldg-zoomable" style={aspect ? { aspectRatio: aspect } : undefined} onClick={(e) => { if (!editable) { e.stopPropagation(); onZoom(s.imageUrl!, s.heading); } }} />
              )}
            </div>
          </div>
        </div>
      );
    }

    case 'strip':
      return (
        <div className="ldg-strip-band">
          {(editable || s.kicker || s.heading) && (
            <div className="ldg-strip-head">
              {s.kicker !== undefined && (editable || s.kicker !== '') && (
                <EditableText editable={editable} sid={s.id} path="kicker" value={s.kicker} className="ldg-kicker rv" as="p" />
              )}
              {s.heading !== undefined && (editable || s.heading !== '') && (
                <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} className="ldg-h2 rv rv-2" />
              )}
            </div>
          )}
          <div className={s.images.length >= 4 && !editable ? 'ldg-pin' : undefined}>
            <div className="ldg-pin-viewport">
              <div className="ldg-strip rv rv-2" data-track>
                {s.images.map((img, i) => (
                  <figure key={i} className="ldg-strip-cell">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.alt ?? ''} loading="lazy" decoding="async" className="ldg-zoomable" onClick={(e) => { if (!editable) { e.stopPropagation(); onZoom(img.url, img.alt ?? ''); } }} />
                  </figure>
                ))}
                {s.images.length === 0 && (
                  <div style={{ padding: 40, border: '1px dashed rgba(0,0,0,.2)', fontSize: 13, opacity: 0.6, margin: '0 auto' }}>
                    No images yet — attach from the media library in the builder
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );

    case 'mosaic': {
      const imgs = s.images.slice(0, 3);
      return (
        <div className="ldg-pad">
          <div className="ldg-wide">
            {(editable || s.kicker || s.heading || s.body) && (
              <div className="ldg-mosaic-copy rv">
                {s.kicker !== undefined && (editable || s.kicker !== '') && (
                  <EditableText editable={editable} sid={s.id} path="kicker" value={s.kicker} className="ldg-kicker" as="p" />
                )}
                {s.heading !== undefined && (editable || s.heading !== '') && (
                  <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} className="ldg-h2" />
                )}
                {s.body !== undefined && (editable || s.body !== '') && (
                  <EditableText as="p" editable={editable} sid={s.id} path="body" value={s.body} className="ldg-body" />
                )}
              </div>
            )}
            <div className="ldg-mosaic">
              {imgs.map((img, i) => (
                <figure key={i} className={`ldg-mosaic-cell ldg-mosaic-${i + 1} ldg-tilt rvm rv-${i + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ?? ''} loading="lazy" decoding="async" className="ldg-zoomable" onClick={(e) => { if (!editable) { e.stopPropagation(); onZoom(img.url, img.alt ?? ''); } }} />
                </figure>
              ))}
              {imgs.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', border: '1px dashed rgba(0,0,0,.2)', fontSize: 13, opacity: 0.6, gridColumn: '1/-1' }}>
                  No images yet — attach from the media library in the builder
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    case 'marquee':
      return (
        <div className="ldg-pad ldg-marquee-band">
          <div className="ldg-wide">
            <EditableText as="p" editable={editable} sid={s.id} path="text" value={s.text} className="ldg-marquee rv" />
          </div>
        </div>
      );

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

    case 'gallery': {
      const masonry = s.layout === 'masonry';
      return (
        <div className="ldg-pad ldg-gallery-band">
          <div className="ldg-wide">
            {s.heading !== undefined && (
              <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} className="ldg-h2 ldg-center rv" style={{ marginBottom: 34 }} />
            )}
            <div className={masonry ? 'ldg-masonry' : 'ldg-grid'}>
              {s.images.map((img, i) => (
                <figure key={i} className={masonry ? 'ldg-mcell rvm' : `ldg-cell rvm rv-${(i % 3) + 1}${i % 7 === 0 ? ' ldg-cell-wide' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ?? ''} loading="lazy" decoding="async" className="ldg-zoomable" onClick={(e) => { if (!editable) { e.stopPropagation(); onZoom(img.url, img.alt ?? ''); } }} />
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
    }

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
                    <div className="ldg-feature-media rvm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt="" loading="lazy" decoding="async" className="ldg-zoomable" onClick={(e) => { if (!editable) { e.stopPropagation(); onZoom(item.imageUrl!, item.title); } }} />
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
        <div className={`ldg-pad ldg-cta-band${s.imageUrl ? ' ldg-cta-img' : ''}`}>
          {s.imageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.imageUrl} alt="" className="ldg-cta-bg" loading="lazy" />
              <div className="ldg-cta-shade" />
            </>
          )}
          <div className="ldg-prose ldg-center rv" style={{ position: 'relative' }}>
            <EditableText as="h2" editable={editable} sid={s.id} path="heading" value={s.heading} className="ldg-h2" />
            {s.body !== undefined && s.body !== '' && (
              <EditableText as="p" editable={editable} sid={s.id} path="body" value={s.body} className="ldg-body" style={{ marginTop: 14 }} />
            )}
            <div style={{ marginTop: 30 }}>
              <LodgeButton href={resolve(s.buttonHref)} light={Boolean(s.imageUrl)} editable={editable}>
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
  const [deep, setDeep] = useState(false); // past the first viewport → mobile book bar
  const [zoom, setZoom] = useState<{ url: string; alt: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editable) window.parent.postMessage({ type: 'v2-nav', slug: page?.slug ?? 'home' }, '*');
  }, [editable, page?.slug]);

  // Motion runtime: scroll reveals (text masks + image curtains), header state,
  // hero scroll parallax + scale, fullbleed parallax, pinned horizontal
  // galleries and cursor-aware imagery. All of it degrades: reduced-motion
  // gets instant, calm content; no JS gets visible content and native scroll.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 },
    );
    root.querySelectorAll('.rv, .rvt, .rvm').forEach((el) => io.observe(el));

    // pinned horizontal galleries — desktop only, and only when they overflow
    const layoutPins = () => {
      root.querySelectorAll<HTMLElement>('.ldg-pin').forEach((pin) => {
        const viewport = pin.querySelector<HTMLElement>('.ldg-pin-viewport');
        const track = pin.querySelector<HTMLElement>('[data-track]');
        if (!viewport || !track) return;
        const want = !reduced && window.innerWidth >= 900;
        const dist = track.scrollWidth - viewport.clientWidth;
        if (want && dist > 80) {
          pin.classList.add('pin-on');
          pin.style.height = `${dist + window.innerHeight}px`;
        } else {
          pin.classList.remove('pin-on');
          pin.style.height = '';
          track.style.transform = '';
        }
      });
    };
    layoutPins();
    const imgs = root.querySelectorAll<HTMLImageElement>('.ldg-strip-cell img');
    imgs.forEach((img) => { if (!img.complete) img.addEventListener('load', layoutPins, { once: true }); });
    window.addEventListener('resize', layoutPins);

    let raf = 0;
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      setDeep(window.scrollY > window.innerHeight * 0.7);
      if (reduced) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // hero: scroll-driven parallax + settle-down scale
        root.querySelectorAll<HTMLElement>('.ldg-hero-img').forEach((el) => {
          const y = window.scrollY;
          const p = Math.min(y / window.innerHeight, 1);
          el.style.transform = `translate3d(0, ${y * 0.26}px, 0) scale(${1.12 - p * 0.1})`;
        });
        // fullbleed: centre-weighted drift
        root.querySelectorAll<HTMLElement>('.plx').forEach((el) => {
          const r = el.parentElement!.getBoundingClientRect();
          const mid = r.top + r.height / 2 - window.innerHeight / 2;
          el.style.transform = `translateY(${mid * -0.08}px) scale(1.18)`;
        });
        // pinned galleries: translate the track through the sticky window
        root.querySelectorAll<HTMLElement>('.ldg-pin.pin-on').forEach((pin) => {
          const viewport = pin.querySelector<HTMLElement>('.ldg-pin-viewport');
          const track = pin.querySelector<HTMLElement>('[data-track]');
          if (!viewport || !track) return;
          const range = pin.offsetHeight - window.innerHeight;
          if (range <= 0) return;
          const progress = Math.min(1, Math.max(0, -pin.getBoundingClientRect().top / range));
          const dist = track.scrollWidth - viewport.clientWidth;
          track.style.transform = `translate3d(${-progress * dist}px, 0, 0)`;
        });
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // cursor-aware imagery — fine pointers only
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let tiltRaf = 0;
    const onMove = (e: PointerEvent) => {
      const cell = (e.target as HTMLElement).closest<HTMLElement>('.ldg-tilt');
      cancelAnimationFrame(tiltRaf);
      tiltRaf = requestAnimationFrame(() => {
        root.querySelectorAll<HTMLElement>('.ldg-tilt img').forEach((img) => {
          if (!cell || !cell.contains(img)) img.style.transform = '';
        });
        if (!cell) return;
        const img = cell.querySelector<HTMLElement>('img');
        if (!img) return;
        const r = cell.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        img.style.transform = `translate3d(${dx * -14}px, ${dy * -14}px, 0) scale(1.06)`;
      });
    };
    if (fine && !reduced && !editable) root.addEventListener('pointermove', onMove);

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', layoutPins);
      if (fine && !reduced && !editable) root.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(tiltRaf);
    };
  }, [page?.slug, editable]);

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
      if (s.type === 'fullbleed' && s.ctaHref && s.ctaHref !== '#') bookHref = bookHref ?? s.ctaHref;
    }

  const firstIsImage = page.sections[0]?.type === 'hero' || page.sections[0]?.type === 'fullbleed';
  const headerSolid = scrolled || !firstIsImage;

  const css = `
  .ldg-root { background:${theme.bg}; color:${theme.ink}; font-family:${theme.bodyFont}; font-weight:300; min-height:100vh; overflow-x:clip; }
  .ldg-root ::selection { background:${theme.accent}; color:#fff; }
  .ldg-root img { display:block; }
  .ldg-root a { color:inherit; text-decoration:none; }

  /* type system */
  .ldg-kicker { font-size:11px; letter-spacing:.32em; text-transform:uppercase; font-weight:400; color:${theme.accent}; font-family:${theme.bodyFont}; }
  .ldg-kicker-light { color:#fff; opacity:.9; }
  .ldg-display { font-family:${theme.headingFont}; font-weight:300; font-size:clamp(42px, 8vw, 100px); line-height:1.03; letter-spacing:.005em; margin-top:18px; text-wrap:balance; }
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

  /* reveal system — rv: rise+fade · rvt: text mask rise · rvm: image curtain */
  .rv { opacity:0; transform:translateY(26px); transition:opacity 1s cubic-bezier(.22,.61,.36,1), transform 1s cubic-bezier(.22,.61,.36,1); }
  .rvt { opacity:0; clip-path:inset(0 0 100% 0); transform:translateY(34px); transition:opacity .9s cubic-bezier(.22,.61,.36,1), transform .9s cubic-bezier(.22,.61,.36,1), clip-path .9s cubic-bezier(.22,.61,.36,1); }
  .rvt.in { opacity:1; clip-path:inset(-4% 0 -12% 0); transform:none; }
  .rvm { opacity:0; clip-path:inset(10% 5% 10% 5% round ${theme.radius}px); transition:opacity 1.1s cubic-bezier(.22,.61,.36,1), clip-path 1.15s cubic-bezier(.22,.61,.36,1); }
  .rvm.in { opacity:1; clip-path:inset(0 0 0 0 round ${theme.radius}px); }
  .rvm img { transition:transform 1.3s cubic-bezier(.22,.61,.36,1); }
  .rvm:not(.in) img { transform:scale(1.1); }
  .rv-2 { transition-delay:.12s; } .rv-3 { transition-delay:.24s; } .rv-4 { transition-delay:.36s; }
  .rv.in { opacity:1; transform:none; }
  [data-edit] .rv, [data-edit] .rvt, [data-edit] .rvm { opacity:1; transform:none; clip-path:none; transition:none; }
  @media (prefers-reduced-motion: reduce) {
    .rv, .rvt, .rvm { clip-path:none; transform:none; transition:opacity .6s ease; }
    .rv.in, .rvt.in, .rvm.in { opacity:1; }
    .rvm:not(.in) img { transform:none; }
    .ldg-scrollcue { animation:none; opacity:.5; transform:scaleY(1); }
  }

  /* page transitions (progressive enhancement — Chromium) */
  @view-transition { navigation: auto; }
  ::view-transition-old(root) { animation:ldg-vt-out .4s cubic-bezier(.22,.61,.36,1) both; }
  ::view-transition-new(root) { animation:ldg-vt-in .55s cubic-bezier(.22,.61,.36,1) both; }
  @keyframes ldg-vt-out { to { opacity:0; transform:translateY(-14px); } }
  @keyframes ldg-vt-in { from { opacity:0; transform:translateY(18px); } }
  @media (prefers-reduced-motion: reduce) {
    ::view-transition-old(root), ::view-transition-new(root) { animation-duration:.01s; }
  }

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

  /* hero — image is scroll-driven (parallax + settle scale) from the runtime */
  .ldg-hero { position:relative; min-height:100svh; display:flex; align-items:center; justify-content:center; text-align:center; overflow:hidden; background:${theme.ink}; }
  .ldg-hero-img { position:absolute; inset:-1px 0; width:100%; height:112%; object-fit:cover; transform:scale(1.12); will-change:transform; }
  @media (prefers-reduced-motion: reduce) { .ldg-hero-img { transform:none; height:100%; } }
  .ldg-hero-shade { position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,.30), rgba(0,0,0,.12) 40%, rgba(0,0,0,.42)); }
  .ldg-hero-copy { position:relative; color:#fff; padding:120px 22px 90px; max-width:900px; }
  .ldg-hero-sub { font-size:clamp(14.5px, 1.8vw, 17px); line-height:1.8; font-weight:300; margin:22px auto 0; max-width:560px; opacity:.94; }
  .ldg-scrollcue { position:absolute; bottom:0; left:50%; width:1px; height:72px; background:rgba(255,255,255,.75); transform-origin:top;
    animation:ldg-cue 2.4s ease-in-out infinite; }
  @keyframes ldg-cue { 0% { transform:scaleY(0); } 45% { transform:scaleY(1); } 100% { transform:scaleY(1); opacity:0; } }

  /* fullbleed */
  .ldg-fullbleed { position:relative; min-height:74vh; display:flex; align-items:flex-end; overflow:hidden; background:${theme.ink}; }
  .ldg-fullbleed-full { min-height:100svh; }
  .ldg-fullbleed-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transform:scale(1.18); will-change:transform; }
  .ldg-fullbleed-shade { position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,.5), transparent 55%); }
  .ldg-fullbleed-copy { position:relative; color:#fff; padding:clamp(36px, 6vw, 72px) clamp(20px, 5vw, 48px); max-width:1240px; margin:0 auto; width:100%; }
  .ldg-fullbleed-body { font-size:clamp(14.5px, 1.7vw, 16.5px); line-height:1.85; font-weight:300; margin-top:16px; max-width:52ch; opacity:.94; white-space:pre-line; }

  /* strip — edge-to-edge film strip; upgrades to a pinned scroll gallery on
     desktop (sticky viewport, track translated by scroll progress) */
  .ldg-strip-band { padding:clamp(56px, 9vw, 110px) 0; }
  .ldg-strip-head { max-width:1240px; margin:0 auto; padding:0 clamp(20px, 5vw, 48px) 34px; }
  .ldg-pin-viewport { overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; scroll-snap-type:x proximity; }
  .ldg-pin-viewport::-webkit-scrollbar { display:none; }
  .ldg-strip { display:flex; gap:clamp(8px, 1.2vw, 14px); padding:0 clamp(20px, 5vw, 48px); width:max-content; cursor:grab; }
  .ldg-pin.pin-on { position:relative; }
  .ldg-pin.pin-on .ldg-pin-viewport { position:sticky; top:0; height:100svh; display:flex; align-items:center; overflow:hidden; }
  .ldg-pin.pin-on .ldg-strip { will-change:transform; cursor:default; }
  .ldg-strip-cell { margin:0; flex:0 0 auto; scroll-snap-align:center; overflow:hidden; border-radius:${theme.radius}px; }
  .ldg-strip-cell img { height:min(68vh, 600px); width:auto; max-width:88vw; object-fit:cover; display:block;
    transition:transform 1.2s cubic-bezier(.22,.61,.36,1); }
  .ldg-strip-cell:hover img { transform:scale(1.03); }
  @media (max-width: 640px) { .ldg-strip-cell img { height:54vh; } }

  /* mosaic — offset editorial collage */
  .ldg-mosaic-copy { max-width:660px; margin-bottom:clamp(30px, 4vw, 54px); }
  .ldg-mosaic { display:grid; grid-template-columns:repeat(12, 1fr); gap:clamp(10px, 1.8vw, 22px); align-items:start; }
  .ldg-mosaic-cell { margin:0; overflow:hidden; border-radius:${theme.radius}px; }
  .ldg-mosaic-cell img { width:100%; height:100%; object-fit:cover; transition:transform 1.3s cubic-bezier(.22,.61,.36,1); }
  .ldg-mosaic-cell:hover img { transform:scale(1.04); }
  .ldg-mosaic-1 { grid-column:1 / 8; } .ldg-mosaic-1 img { aspect-ratio:4/4.6; }
  .ldg-mosaic-2 { grid-column:8 / 13; margin-top:clamp(48px, 9vw, 130px); } .ldg-mosaic-2 img { aspect-ratio:3/3.8; }
  .ldg-mosaic-3 { grid-column:3 / 9; margin-top:clamp(-60px, -4vw, -20px); } .ldg-mosaic-3 img { aspect-ratio:16/9; }
  @media (max-width: 720px) {
    .ldg-mosaic-1, .ldg-mosaic-2, .ldg-mosaic-3 { grid-column:1 / -1; margin-top:0; }
    .ldg-mosaic-1 img, .ldg-mosaic-2 img { aspect-ratio:4/4.2; } .ldg-mosaic-3 img { aspect-ratio:4/3; }
  }

  /* marquee — oversized statement */
  .ldg-marquee-band { padding-top:clamp(40px, 7vw, 90px); padding-bottom:clamp(40px, 7vw, 90px); }
  .ldg-marquee { font-family:${theme.headingFont}; font-weight:300; font-size:clamp(38px, 7vw, 110px); line-height:1.06;
    letter-spacing:.005em; max-width:none; white-space:pre-line; }

  /* split */
  .ldg-split { max-width:1240px; margin:0 auto; display:grid; grid-template-columns:minmax(0,5fr) minmax(0,6fr); gap:clamp(28px, 5vw, 76px); align-items:center; }
  .ldg-split-rev { grid-template-columns:minmax(0,6fr) minmax(0,5fr); }
  .ldg-split-rev .ldg-split-copy { order:2; }
  .ldg-split-rev .ldg-split-media { order:1; }
  .ldg-split-media { overflow:hidden; border-radius:${theme.radius}px; }
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
  .ldg-cell { margin:0; overflow:hidden; border-radius:${theme.radius}px; }
  .ldg-cell img { width:100%; height:100%; aspect-ratio:4/3; object-fit:cover; transition:transform 1.2s cubic-bezier(.22,.61,.36,1); }
  .ldg-cell:hover img { transform:scale(1.05); }
  .ldg-cell-wide { grid-column:span 2; }
  .ldg-cell-wide img { aspect-ratio:8/4.1; }
  @media (max-width: 560px) { .ldg-cell-wide { grid-column:span 1; } .ldg-cell-wide img { aspect-ratio:4/3; } }
  .ldg-zoomable { cursor:${editable ? 'pointer' : 'zoom-in'}; }

  /* gallery masonry — natural aspect ratios, big prints */
  .ldg-masonry { columns:3; column-gap:10px; }
  .ldg-mcell { margin:0 0 10px; overflow:hidden; break-inside:avoid; border-radius:${theme.radius}px; }
  .ldg-mcell img { width:100%; height:auto; display:block; transition:transform 1.2s cubic-bezier(.22,.61,.36,1); }
  .ldg-mcell:hover img { transform:scale(1.03); }
  @media (max-width: 900px) { .ldg-masonry { columns:2; } }
  @media (max-width: 560px) { .ldg-masonry { columns:1; } }

  /* features */
  .ldg-features { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap:clamp(26px, 3.4vw, 44px); }
  .ldg-feature-media { overflow:hidden; margin-bottom:18px; border-radius:${theme.radius}px; }
  .ldg-feature-media img { width:100%; aspect-ratio:3/2.1; object-fit:cover; transition:transform 1.2s cubic-bezier(.22,.61,.36,1); }
  .ldg-feature:hover .ldg-feature-media img { transform:scale(1.05); }
  .ldg-feature-title { font-family:${theme.headingFont}; font-size:clamp(18px, 2vw, 21px); font-weight:400; line-height:1.3; }

  /* quote */
  .ldg-quote-band { background:${theme.soft}; }
  .ldg-quote-mark { font-family:${theme.headingFont}; font-size:84px; line-height:.4; opacity:.28; margin-bottom:26px; }
  .ldg-quote { font-family:${theme.headingFont}; font-style:italic; font-weight:300; font-size:clamp(21px, 3vw, 30px); line-height:1.5; }

  /* faq */
  .ldg-faq { border-bottom:1px solid ${theme.ink}24; }
  .ldg-faq summary { display:flex; align-items:center; justify-content:space-between; gap:16px; list-style:none; cursor:pointer;
    padding:20px 0; font-family:${theme.headingFont}; font-size:clamp(17px, 2vw, 20px); font-weight:400; }
  .ldg-faq summary::-webkit-details-marker { display:none; }
  .ldg-faq-plus { font-size:20px; font-weight:300; opacity:.5; transition:transform .35s ease; }
  .ldg-faq[open] .ldg-faq-plus { transform:rotate(45deg); }

  /* buttons + cta */
  .ldg-btn { display:inline-block; font-size:11px; letter-spacing:.26em; text-transform:uppercase; font-weight:400;
    border:1px solid ${theme.ink}; color:${theme.ink}; padding:15px 34px; border-radius:${theme.radius}px;
    transition:background .35s, color .35s, border-color .35s; cursor:pointer; }
  .ldg-btn:hover { background:${theme.accent}; border-color:${theme.accent}; color:${theme.accentInk}; }
  .ldg-btn-light { border-color:#fff; color:#fff; }
  .ldg-btn-light:hover { background:#fff; border-color:#fff; color:#111; }
  .ldg-cta-band { background:${theme.ink}; color:${theme.bg}; }
  .ldg-cta-band .ldg-btn { border-color:${theme.bg}; color:${theme.bg}; }
  .ldg-cta-band .ldg-btn:hover { background:${theme.bg}; color:${theme.ink}; }
  .ldg-cta-img { position:relative; overflow:hidden; }
  .ldg-cta-img .ldg-cta-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .ldg-cta-shade { position:absolute; inset:0; background:rgba(10,9,7,.52); }
  .ldg-cta-img .ldg-prose { color:#fff; }
  .ldg-cta-img .ldg-btn-light { border-color:#fff; color:#fff; }
  .ldg-cta-img .ldg-btn-light:hover { background:#fff; color:#111; }

  /* footer */
  .ldg-footer { padding:clamp(48px, 7vw, 80px) 24px 42px; text-align:center; border-top:1px solid ${theme.ink}16; }
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

  /* mobile booking bar — the booking path never leaves the screen */
  .ldg-root .ldg-bookbar { position:fixed; left:14px; right:14px; bottom:calc(14px + env(safe-area-inset-bottom)); z-index:70;
    display:none; align-items:center; justify-content:center; gap:10px; padding:16px 20px;
    background:${theme.ink}; color:${theme.bg}; font-size:12px; letter-spacing:.24em; text-transform:uppercase;
    border-radius:${Math.max(theme.radius, 4)}px; box-shadow:0 12px 34px rgba(0,0,0,.28);
    transform:translateY(140%); transition:transform .5s cubic-bezier(.22,.61,.36,1); }
  .ldg-root .ldg-bookbar.show { transform:none; }
  @media (max-width: 760px) { .ldg-root .ldg-bookbar { display:flex; } }
  @media (prefers-reduced-motion: reduce) { .ldg-root .ldg-bookbar { transition:none; } }

  /* keyboard focus */
  .ldg-root a:focus-visible, .ldg-root summary:focus-visible, .ldg-root button:focus-visible {
    outline:2px solid ${theme.accent}; outline-offset:3px; border-radius:2px; }

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
        <nav className="ldg-nav">
          {pages.map((p) => (
            <a
              key={p.slug}
              href={hrefFor(p.slug)}
              className={p.slug === page.slug ? 'active' : undefined}
              onClick={(e) => {
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
            <a href={editable ? undefined : bookHref} className="ldg-book" target={standalone ? undefined : '_blank'} rel="noreferrer">
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

      {bookHref && !editable && (
        <a href={bookHref} className={`ldg-bookbar${deep ? ' show' : ''}`} target={standalone ? undefined : '_blank'} rel="noreferrer">
          Check availability
        </a>
      )}

      {zoom && (
        <figure className="ldg-lightbox" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.url} alt={zoom.alt} />
          {zoom.alt && <figcaption>{zoom.alt}</figcaption>}
        </figure>
      )}
    </div>
  );
}
