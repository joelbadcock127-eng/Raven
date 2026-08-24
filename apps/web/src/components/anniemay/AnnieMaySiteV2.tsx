'use client';

/**
 * Annie May — bespoke site V2 (draft clone of AnnieMaySite).
 * Adds: live "right now" strip, book-direct walk offer popup, Deb intro.
 * V1 stays untouched; this renders at /site/annie-may?v=2.
 * Alma Hospitality's intimacy (centred statements, warm ivory, generous
 * air) crossed with The Largo's heritage gravity (dark story chapters,
 * roman numerals, hairline rules), finished with Relais Rossar-style
 * motion: mask reveals, curtain wipes, parallax, hover zooms.
 * Typography is the live site's own: Ginger display, Quicksand body.
 * Five pages mirroring anniemay.com.au:
 * home · accommodation · story · explore · contact.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationFrame, useInView, useReducedMotion, useScroll } from 'framer-motion';
import AnnieMayEditBridge from './AnnieMayEditBridge';
import Monogram from './Monogram';
import { CurtainImage, MaskLines, ParallaxImage, Reveal, ease, spring } from './motion';
import {
  ADDRESS,
  BOOK_URL,
  COMFORTS,
  FACEBOOK_URL,
  FAQS,
  GALLERY,
  HIGHLIGHTS,
  IMG,
  INSTAGRAM_URL,
  MAPS_EMBED_URL,
  MAPS_URL,
  NAV_PAGES,
  REVIEWS,
  ROOMS,
  WALKABLE,
} from './data';
import './anniemay.css';

/* ────────────────────────── shared bits ────────────────────────── */

function useHref(standalone: boolean) {
  return (slug: string) =>
    standalone ? (slug === 'home' ? '/' : `/${slug}`) : `/site/annie-may?v=2${slug === 'home' ? '' : `&page=${slug}`}`;
}

function BookButton({ label = 'Reserve your stay', solid = false }: { label?: string; solid?: boolean }) {
  return (
    <motion.a
      className={`am-book${solid ? ' am-book-solid' : ''}`}
      href={BOOK_URL}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={{ scale: 0.97 }}
      transition={spring}
    >
      {label}
      <span className="arrow" aria-hidden>
        →
      </span>
    </motion.a>
  );
}

function Ledger({ items, dark = false }: { items: Array<[string, string]>; dark?: boolean }) {
  return (
    <div>
      {items.map(([term, detail], i) => (
        <Reveal key={term} delay={i * 0.07} y={18}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 24,
              padding: '18px 0',
              borderTop: `1px solid ${dark ? 'var(--am-hairline-dark)' : 'var(--am-hairline)'}`,
            }}
          >
            <span style={{ fontSize: '0.92rem', fontWeight: 500 }}>{term}</span>
            {detail && (
              <span className="am-body-copy" style={{ textAlign: 'right' }}>
                {detail}
              </span>
            )}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

function SocialLinks({ size = 20, gap = 18 }: { size?: number; gap?: number }) {
  const iconStyle: React.CSSProperties = { display: 'block', width: size, height: size };
  return (
    <div style={{ display: 'flex', gap, alignItems: 'center' }}>
      <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Annie May on Instagram" className="am-social">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={iconStyle} aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </a>
      <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Annie May on Facebook" className="am-social">
        <svg viewBox="0 0 24 24" fill="currentColor" style={iconStyle} aria-hidden>
          <path d="M13.5 21v-7h2.4l.4-2.9h-2.8V9.2c0-.84.23-1.4 1.44-1.4h1.5V5.2c-.26-.03-1.15-.11-2.19-.11-2.17 0-3.65 1.32-3.65 3.75v2.27H8.2V14h2.4v7h2.9z" />
        </svg>
      </a>
    </div>
  );
}

/** Page header for the interior pages — centred, Alma-style. */
function PageIntro({ kicker, lines, lead }: { kicker: string; lines: string[]; lead?: string }) {
  return (
    <section className="am-section" style={{ paddingTop: 'clamp(150px, 20vh, 240px)', paddingBottom: 'clamp(48px, 6vw, 100px)' }}>
      <div className="am-shell am-centered">
        <p className="am-kicker">{kicker}</p>
        <MaskLines as="h1" className="am-display am-d-xl" lines={lines} style={{ maxWidth: '16em' }} />
        {lead && (
          <Reveal delay={0.4}>
            <p className="am-lead am-narrow" style={{ marginTop: 34 }}>
              {lead}
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/**
 * Breakfast as a signature experience, not a footnote — it is included in
 * every stay, so it carries value the rooms alone can't.
 */
function BreakfastSection() {
  return (
    <section className="am-section">
      <div className="am-shell">
        <div className="am-grid" style={{ rowGap: 48, alignItems: 'center' }}>
          <div className="am-frame" style={{ gridColumn: 'span 6', gridRow: 1 }}>
            <ParallaxImage src={IMG.breakfast} alt="The breakfast room at Annie May" drift={9} style={{ aspectRatio: '4 / 5' }} />
          </div>
          <div style={{ gridColumn: 'span 5 / -1', gridRow: 1 }}>
            <p className="am-kicker">Breakfast, included with every stay</p>
            <MaskLines as="h2" className="am-display am-d-lg" lines={['Mornings are', 'part of the stay.']} />
            <Reveal delay={0.3}>
              <p className="am-lead" style={{ marginTop: 28 }}>
                Breakfast is never an extra here. Every stay begins downstairs in a room full of
                morning light, with the table set and no reason to hurry away from it.
              </p>
            </Reveal>
            <Reveal delay={0.45}>
              <p className="am-body-copy" style={{ marginTop: 18 }}>
                Come down when it suits you, linger over coffee, plan the day slowly. It is the
                hour the house does best.
              </p>
            </Reveal>
            <Reveal delay={0.55}>
              <div style={{ marginTop: 32 }}>
                <BookButton label="Check availabilities" />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}


/** Concrete walkability: what is actually out her front door, with times. */
function WalkableSection() {
  return (
    <section className="am-dark am-section">
      <div className="am-shell">
        <div className="am-grid" style={{ rowGap: 40, alignItems: 'start' }}>
          <div style={{ gridColumn: 'span 5', gridRow: 1, position: 'relative' }}>
            <p className="am-kicker" style={{ color: 'var(--am-cream-mute)' }}>
              Out her front door
            </p>
            <MaskLines as="h2" className="am-display am-d-lg" lines={['Leave the car', 'where it is.']} />
            <Reveal delay={0.3}>
              <p className="am-lead" style={{ marginTop: 26 }}>
                She sits on the Mersey riverfront with the city a few blocks behind her. Dinner,
                galleries and the water are all on foot; the day trips can wait for tomorrow.
              </p>
            </Reveal>
          </div>
          <div style={{ gridColumn: 'span 6 / -1', gridRow: 1 }}>
            {WALKABLE.map((w, i) => (
              <Reveal key={w.name} delay={i * 0.07} y={18}>
                <div style={{ padding: '18px 0', borderTop: '1px solid var(--am-hairline-dark)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{w.name}</span>
                    <span className="am-numeral" style={{ whiteSpace: 'nowrap' }}>{w.time}</span>
                  </div>
                  <p className="am-body-copy" style={{ marginTop: 6, maxWidth: '30rem' }}>{w.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Guest words before the final ask — the proof that the promise holds. */
function ReviewsSection() {
  return (
    <section className="am-tint am-section">
      <div className="am-shell">
        <div className="am-centered" style={{ marginBottom: 'clamp(44px, 5vw, 80px)' }}>
          <p className="am-kicker">Kind words</p>
          <MaskLines as="h2" className="am-display am-d-lg" lines={['What her guests', 'say about her.']} />
        </div>
        <div className="am-grid" style={{ rowGap: 44 }}>
          {REVIEWS.map((r, i) => (
            <div key={r.name} style={{ gridColumn: 'span 4', minWidth: 0 }}>
              <Reveal delay={i * 0.12}>
                <blockquote style={{ margin: 0, borderTop: '1px solid var(--am-hairline)', paddingTop: 26 }}>
                  <span
                    aria-hidden
                    style={{ display: 'block', color: '#b08d3f', fontSize: '0.82rem', letterSpacing: '0.32em' }}
                  >
                    ★★★★★
                  </span>
                  <p className="am-lead" style={{ marginTop: 18, fontSize: '1.02rem' }}>
                    “{r.quote}”
                  </p>
                  <footer style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: '50%',
                        flexShrink: 0,
                        border: '1px solid var(--am-hairline)',
                        background: r.image ? undefined : 'var(--am-paper-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        fontFamily: 'var(--am-display)',
                        fontSize: '1.15rem',
                        color: 'var(--am-sage)',
                      }}
                    >
                      {r.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        r.initials
                      )}
                    </span>
                    <span style={{ display: 'grid', gap: 2 }}>
                      <cite style={{ fontStyle: 'normal', fontSize: '0.92rem', fontWeight: 500 }}>{r.name}</cite>
                      <span className="am-body-copy" style={{ fontSize: '0.78rem' }}>{r.detail}</span>
                    </span>
                  </footer>
                </blockquote>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The practical answers a guest wants before committing. */
function FaqSection({ dark = false }: { dark?: boolean }) {
  return (
    <section className={dark ? 'am-dark am-section' : 'am-tint am-section'}>
      <div className="am-shell">
        <div className="am-grid" style={{ rowGap: 40, alignItems: 'start' }}>
          <div style={{ gridColumn: 'span 4', gridRow: 1 }}>
            <p className="am-kicker" style={dark ? { color: 'var(--am-cream-mute)' } : undefined}>
              Good to know
            </p>
            <MaskLines as="h2" className="am-display am-d-md" lines={['The practical', 'questions,', 'answered.']} />
          </div>
          <div style={{ gridColumn: 'span 7 / -1', gridRow: 1 }}>
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.06} y={16}>
                <div
                  style={{
                    padding: '20px 0',
                    borderTop: `1px solid ${dark ? 'var(--am-hairline-dark)' : 'var(--am-hairline)'}`,
                  }}
                >
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 500, margin: 0 }}>{f.q}</h3>
                  <p className="am-body-copy" style={{ marginTop: 8, maxWidth: '36rem' }}>{f.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Shared closing invitation, full-bleed image. */
function ClosingCta({ heading, sub }: { heading: string[]; sub: string }) {
  return (
    <section style={{ position: 'relative', color: 'var(--am-cream)' }} className="am-on-image">
      <ParallaxImage src={IMG.windowSeat} alt="Morning light at the window seat" drift={12} style={{ height: 'clamp(500px, 88vh, 820px)' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(29, 32, 26, 0.55)' }} />
      <div
        className="am-shell am-centered"
        style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}
      >
        <MaskLines as="h2" className="am-display am-d-lg" lines={heading} />
        <Reveal delay={0.4}>
          <p className="am-lead" style={{ marginTop: 22, color: 'rgba(246, 242, 233, 0.94)', textShadow: '0 1px 14px rgba(0,0,0,0.35)', maxWidth: '30rem' }}>
            {sub}
          </p>
        </Reveal>
        <Reveal delay={0.5}>
          <p className="am-body-copy" style={{ marginTop: 18, color: 'rgba(246, 242, 233, 0.85)', textShadow: '0 1px 12px rgba(0,0,0,0.35)', fontSize: '0.82rem', letterSpacing: '0.06em' }}>
            Breakfast included · adults only · book direct with the house
          </p>
        </Reveal>
        <Reveal delay={0.55}>
          <div style={{ marginTop: 30 }}>
            <BookButton label="Check availabilities" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ────────────────── V2: live conditions + hero day cycle ────────────────── */

interface LiveWx {
  line: string;
  tempC: number;
  code: number;
  isDay: boolean;
  flourish: string;
  hourNow: number;
  sunriseH: number;
  sunsetH: number;
}

/** Fetch the live Devonport conditions once; null until they arrive. */
function useLiveWx(): LiveWx | null {
  const [wx, setWx] = useState<LiveWx | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/site/weather')
      .then((r) => r.json())
      .then((d: Partial<LiveWx> & { ok?: boolean }) => {
        if (alive && d?.ok && d.line && typeof d.hourNow === 'number') setWx(d as LiveWx);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return wx;
}

function wxEmoji(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 2) return isDay ? '🌤️' : '🌙';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 95) return '⛈️';
  return isDay ? '🌤️' : '🌙';
}

/* ────────────────── V2: the Holy Grail day-night timelapse ──────────────────
 *
 * A continuous, rAF-driven simulated timelapse over the facade photo —
 * no stepped phases, every layer interpolates smoothly along one clock.
 * The photo's LEFT edge faces EAST. Four simulated days (~24s each) play
 * out, then the sky settles back on the untouched photo.
 *
 * Realism rules learnt the hard way:
 *  - no literal sun or moon discs — the light itself tells the time of day:
 *    warm raking gradients at sunrise/sunset, a cool moonlight wash at night
 *  - stars are confined to the sky band and skip the tower's silhouette
 *  - the night tint is masked so the sky darkens fully but the house
 *    keeps its shape, and two screen-blend copies of the photo lift the
 *    lit windows (sharp) and a gentle ambient warmth (soft) out of the dark
 *  - slow clouds drift through the sky band, brighter by day, faint by night
 */

const DAY_MS = 24_000; // one simulated day
const DAY_CYCLES = 4; // then rest on the original photo
const HOLD_MS = 1_600; // opening hold on the untouched photo

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const smooth = (a: number, b: number, v: number) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};

/** Piecewise-linear read of [t, ...values] keyframe rows. */
function readStops(stops: number[][], frac: number): number[] {
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (frac >= stops[i][0] && frac <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const x = clamp01((frac - lo[0]) / span);
  return lo.map((v, i) => (i === 0 ? frac : lerp(v, hi[i], x)));
}

/** [t, brightness, saturate, nightTintOpacity] — t=0 is dusk, the photo's own
 *  light. Night stays gentle on the house; the masked tint does the sky. */
const GRADE_STOPS: number[][] = [
  [0.0, 1.0, 1.0, 0.04],
  [0.08, 0.87, 0.93, 0.3],
  [0.18, 0.78, 0.86, 0.44],
  [0.3, 0.82, 0.88, 0.36],
  [0.37, 0.92, 0.95, 0.14],
  [0.45, 1.02, 1.0, 0.05],
  [0.68, 1.13, 1.06, 0.0],
  [0.85, 1.05, 1.03, 0.0],
  [0.94, 0.99, 1.01, 0.03],
  [1.0, 1.0, 1.0, 0.04],
];

/** Daylight between these day-fractions (sun rises east = left). */
const SUN_RISE = 0.37;
const SUN_SET = 0.99;
/** Moonlight during the night, same east → west direction. */
const MOON_RISE = 0.03;
const MOON_SET = 0.345;

/** Stars: sky band only (container is the top 26% of the frame), skipping
 *  the tower silhouette that pokes into the band at centre. */
const STARS = Array.from({ length: 150 }, (_, i) => ({
  x: (i * 37.508) % 100,
  y: (i * 61.803) % 100,
  size: 0.9 + ((i * 7) % 10) / 7,
  delay: (i % 9) * 0.45,
  dur: 2.8 + (i % 5) * 0.7,
}));

/** Slow clouds for the sky band: soft blurred blobs on two drift speeds. */
const CLOUDS = [
  { top: 6, w: 340, h: 60, dur: 64, delay: 0, o: 0.9 },
  { top: 30, w: 260, h: 44, dur: 88, delay: -30, o: 0.7 },
  { top: 55, w: 420, h: 70, dur: 76, delay: -55, o: 0.8 },
];

function HolyGrailSky({ reduced, parallaxY }: { reduced: boolean | null; parallaxY: number }) {
  const img = useRef<HTMLImageElement>(null);
  const fg = useRef<HTMLImageElement>(null);
  const glowSharp = useRef<HTMLImageElement>(null);
  const glowSoft = useRef<HTMLImageElement>(null);
  const tint = useRef<HTMLDivElement>(null);
  const warmEast = useRef<HTMLDivElement>(null);
  const warmWest = useRef<HTMLDivElement>(null);
  const moonlight = useRef<HTMLDivElement>(null);
  const starsOuter = useRef<HTMLDivElement>(null);
  const starsDrift = useRef<HTMLDivElement>(null);
  const clouds = useRef<HTMLDivElement>(null);
  const startAt = useRef<number | null>(null);
  const done = useRef(false);

  useAnimationFrame((time) => {
    if (reduced || done.current) return;
    if (startAt.current === null) startAt.current = time;
    const elapsed = time - startAt.current - HOLD_MS;
    if (elapsed < 0) return;

    const tTotal = elapsed / DAY_MS;
    if (tTotal >= DAY_CYCLES) {
      // Rest exactly on the untouched photo, windows lit as shot.
      if (img.current) img.current.style.filter = 'none';
      if (fg.current) fg.current.style.filter = 'none';
      for (const r of [tint, warmEast, warmWest, moonlight, starsOuter, clouds])
        if (r.current) r.current.style.opacity = '0';
      if (glowSharp.current) glowSharp.current.style.opacity = '0';
      if (glowSoft.current) glowSoft.current.style.opacity = '0';
      done.current = true;
      return;
    }
    const frac = tTotal % 1;

    // ── grade ──
    const [, b, s, tintA] = readStops(GRADE_STOPS, frac);
    const grade = `brightness(${b.toFixed(3)}) saturate(${s.toFixed(3)})`;
    if (img.current) img.current.style.filter = grade;
    if (fg.current) fg.current.style.filter = grade;
    if (tint.current) tint.current.style.opacity = tintA.toFixed(3);

    // ── night ──
    const nightF = smooth(0.03, 0.11, frac) * (1 - smooth(0.29, 0.385, frac));
    if (starsOuter.current) starsOuter.current.style.opacity = nightF.toFixed(3);
    if (starsDrift.current)
      starsDrift.current.style.transform = `translate3d(${(-tTotal * 2.6).toFixed(3)}%, ${(tTotal * 1.1).toFixed(3)}%, 0)`;
    // windows: sharp lit-window pass strong, soft ambient lift gentle
    if (glowSharp.current) glowSharp.current.style.opacity = Math.min(1, 1.05 * nightF).toFixed(3);
    if (glowSoft.current) glowSoft.current.style.opacity = (0.34 * nightF).toFixed(3);
    // clouds: present day and night, brighter by day
    const dayF = smooth(0.37, 0.45, frac) * (1 - smooth(0.93, 0.995, frac));
    if (clouds.current) clouds.current.style.opacity = (0.1 + dayF * 0.24 + nightF * 0.04).toFixed(3);

    // ── warm raking light: from the east side mornings, west evenings ──
    const sp = (frac - SUN_RISE) / (SUN_SET - SUN_RISE);
    const lowSun = sp >= 0 && sp <= 1 ? clamp01(1.5 * (1 - Math.sin(sp * Math.PI))) : 0;
    const sunUp = sp >= 0 && sp <= 1 ? smooth(0, 0.05, sp) * smooth(1, 0.95, sp) : 0;
    if (warmEast.current) warmEast.current.style.opacity = (lowSun * (1 - sp) * sunUp * 0.85).toFixed(3);
    if (warmWest.current) warmWest.current.style.opacity = (lowSun * sp * sunUp * 0.85).toFixed(3);

    // ── cool moonlight wash, east to west across the night ──
    const mp = (frac - MOON_RISE) / (MOON_SET - MOON_RISE);
    if (moonlight.current) {
      const side = mp < 0.5 ? 'to right' : 'to left';
      moonlight.current.style.background = `linear-gradient(${side}, rgba(150,180,230,0.5), rgba(150,180,230,0) 62%)`;
      moonlight.current.style.opacity = (nightF * 0.36 * (mp >= 0 && mp <= 1 ? 1 : 0)).toFixed(3);
    }
  });

  const fullBleed: React.CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' };
  const coverImg: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };
  const glowMask = 'radial-gradient(ellipse 66% 60% at 50% 60%, black 40%, transparent 80%)';
  // The building silhouette, cut from the photo by scripts (same 4:3 frame,
  // so mask-size cover aligns pixel-perfect with the object-fit cover image).
  const matteMask: React.CSSProperties = {
    maskImage: "url('/mirror-assets/am-facade-matte.png')",
    WebkitMaskImage: "url('/mirror-assets/am-facade-matte.png')",
    maskSize: 'cover',
    WebkitMaskSize: 'cover',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  };
  const parallax = {
    initial: reduced ? false : ({ scale: 1.1 } as const),
    animate: { scale: 1 } as const,
    transition: { duration: 2.6, ease: ease.outExpo } as const,
    style: { ...fullBleed, transform: reduced ? undefined : `translateY(${parallaxY}px)`, willChange: 'transform' as const },
  };

  return (
    <>
      {/* 1 · the full photo — its sky becomes the canvas */}
      <motion.div {...parallax}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={img} src={IMG.facade} alt="Annie May at dusk, a heritage home on Formby Road, Devonport" style={coverImg} />
      </motion.div>

      {/* 2 · everything celestial lives BEHIND the house from here on */}
      {/* starfield — upper sky, fading down; the house occludes the rest */}
      <div
        ref={starsOuter}
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40%',
          opacity: 0,
          pointerEvents: 'none',
          maskImage: 'linear-gradient(180deg, black 55%, transparent 96%)',
          WebkitMaskImage: 'linear-gradient(180deg, black 55%, transparent 96%)',
        }}
      >
        <div ref={starsDrift} style={{ position: 'absolute', inset: '-14%' }}>
          {STARS.map((st, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${st.x}%`,
                top: `${st.y}%`,
                width: st.size,
                height: st.size,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 0 3px rgba(255,255,255,0.65)',
                animation: `am-twinkle ${st.dur}s ease-in-out ${st.delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* clouds — slow drifters, also behind the house */}
      <div
        ref={clouds}
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '30%',
          opacity: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          maskImage: 'linear-gradient(180deg, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, black 60%, transparent 100%)',
        }}
      >
        {CLOUDS.map((c, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: `${c.top}%`,
              left: 0,
              width: c.w,
              height: c.h,
              opacity: c.o,
              background:
                'radial-gradient(ellipse 45% 60% at 35% 55%, rgba(255,255,255,0.5), transparent 70%), radial-gradient(ellipse 55% 70% at 65% 45%, rgba(255,255,255,0.38), transparent 72%)',
              filter: 'blur(10px)',
              animation: `am-cloud-drift ${c.dur}s linear ${c.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* 3 · the house itself, matted out of the photo, in FRONT of the sky */}
      <motion.div {...parallax}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={fg} src={IMG.facade} alt="" aria-hidden style={{ ...coverImg, ...matteMask }} />
        {/* soft ambient lift so the house never goes too dark at night */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={glowSoft}
          src={IMG.facade}
          alt=""
          aria-hidden
          style={{
            ...coverImg,
            opacity: 0,
            mixBlendMode: 'screen',
            filter: 'brightness(0.9) contrast(1.25) saturate(1.35)',
            maskImage: glowMask,
            WebkitMaskImage: glowMask,
          }}
        />
        {/* sharp pass: the lit windows themselves, glowing */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={glowSharp}
          src={IMG.facade}
          alt=""
          aria-hidden
          style={{
            ...coverImg,
            opacity: 0,
            mixBlendMode: 'screen',
            filter: 'brightness(0.82) contrast(1.85) saturate(1.5)',
            maskImage: glowMask,
            WebkitMaskImage: glowMask,
          }}
        />
      </motion.div>

      {/* 4 · atmosphere over the whole scene */}
      <div
        ref={tint}
        aria-hidden
        style={{
          ...fullBleed,
          background: 'rgb(11, 17, 40)',
          mixBlendMode: 'multiply',
          opacity: 0,
          maskImage: 'radial-gradient(ellipse 72% 62% at 50% 66%, rgba(0,0,0,0.5) 30%, black 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 72% 62% at 50% 66%, rgba(0,0,0,0.5) 30%, black 80%)',
        }}
      />
      <div
        ref={warmEast}
        aria-hidden
        style={{ ...fullBleed, background: 'linear-gradient(to right, rgba(255,168,100,0.5), rgba(255,168,100,0) 58%)', mixBlendMode: 'soft-light', opacity: 0 }}
      />
      <div
        ref={warmWest}
        aria-hidden
        style={{ ...fullBleed, background: 'linear-gradient(to left, rgba(255,150,86,0.5), rgba(255,150,86,0) 58%)', mixBlendMode: 'soft-light', opacity: 0 }}
      />
      <div ref={moonlight} aria-hidden style={{ ...fullBleed, mixBlendMode: 'soft-light', opacity: 0 }} />
    </>
  );
}

/* ────────────────── V2: book-direct walk offer ────────────────── */

const OFFER_URL = 'https://www.bakerswalkingco.com.au/narawntapu';
// Bakers Walking Co's own Narawntapu photo (bakerswalkingco.com.au/narawntapu),
// resized to 1600px for the popup.
const OFFER_IMG = '/mirror-assets/am-bwc-narawntapu-walk.jpg';

/**
 * The elegant once-per-session invitation: book direct and a private
 * two-hour guided coastal walk for two with Bakers Walking Co comes with
 * the stay. Impossible to replicate on an OTA listing.
 */
function DirectOfferPopup() {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  // Waits until the visitor scrolls past the hero into the next section,
  // then counts down 7 seconds before appearing. Once per session.
  useEffect(() => {
    if (sessionStorage.getItem('am-walk-offer') === 'seen') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (timer || window.scrollY < window.innerHeight * 0.72) return;
      window.removeEventListener('scroll', onScroll);
      timer = setTimeout(() => {
        sessionStorage.setItem('am-walk-offer', 'seen');
        setOpen(true);
      }, 7000);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: ease.outQuint }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="An offer for guests who book direct"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(29, 32, 26, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(16px, 4vw, 48px)',
          }}
        >
          <motion.div
            initial={reduced ? false : { y: 96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ duration: 1.05, ease: ease.outExpo }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--am-paper, #f6f2e9)',
              color: 'var(--am-ink)',
              maxWidth: 860,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              display: 'flex',
              flexWrap: 'wrap',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 10,
                right: 12,
                zIndex: 1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
                fontSize: '0.78rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: 8,
              }}
            >
              Close ✕
            </button>
            <div style={{ flex: '1 1 320px', minHeight: 280 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={OFFER_IMG}
                alt="Walking the coastal plain at Narawntapu National Park"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left center', display: 'block' }}
              />
            </div>
            <div style={{ flex: '1 1 340px', padding: 'clamp(28px, 4vw, 44px)' }}>
              <p className="am-kicker">For guests who book direct</p>
              <h2 className="am-display am-d-md" style={{ marginTop: 6 }}>
                She’ll add the morning walk.
              </h2>
              <p className="am-body-copy" style={{ marginTop: 18 }}>
                Book direct with the house and she’ll arrange a private two hour guided coastal
                walk for two with Bakers Walking Co in Narawntapu National Park, on a morning of
                your stay. Wildlife, wide beaches and a guide who knows every track.
              </p>
              <p className="am-body-copy" style={{ marginTop: 12 }}>
                Her gift, and only when you book with her directly.
              </p>
              <div style={{ marginTop: 26, display: 'flex', gap: 22, alignItems: 'center', whiteSpace: 'nowrap' }}>
                <BookButton label="Book now" solid />
                <a href={OFFER_URL} target="_blank" rel="noopener noreferrer" className="am-link am-more">
                  Learn more
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────────── navigation ────────────────────────── */

function Nav({ current, standalone, overHero }: { current: string; standalone: boolean; overHero: boolean }) {
  const href = useHref(standalone);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => scrollY.on('change', (v) => setScrolled(v > 40)), [scrollY]);

  const light = overHero && !scrolled && !open;
  return (
    <>
      <motion.header
        initial={reduced ? false : { y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.5, ease: ease.outExpo }}
        className={scrolled ? 'am-nav-blur' : undefined}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          color: light ? 'var(--am-cream)' : 'var(--am-ink)',
          background: scrolled ? 'rgba(246,242,233,0.86)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--am-hairline)' : '1px solid transparent',
          transition: 'color .5s, background .5s, border-color .5s',
        }}
      >
        <div
          className="am-shell"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 80 }}
        >
          <a
            href={href('home')}
            style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'var(--am-display)', fontSize: '1.4rem', letterSpacing: '0.04em' }}
          >
            <Monogram size={34} />
            Annie May
          </a>

          <nav className="am-desktop-only" style={{ display: 'flex', gap: 34, alignItems: 'center' }}>
            {NAV_PAGES.map((p) => (
              <a
                key={p.slug}
                href={href(p.slug)}
                className={`am-link${current === p.slug ? ' am-link-lit' : ''}`}
                style={{ fontSize: '0.76rem', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500 }}
              >
                {p.label}
              </a>
            ))}
            <BookButton label="Check availabilities" />
          </nav>

          <button
            type="button"
            className="am-mobile-only"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.78rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              padding: 8,
            }}
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: ease.outQuint }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 49,
              background: 'var(--am-night)',
              color: 'var(--am-cream)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '0 clamp(24px, 8vw, 60px)',
            }}
          >
            {[{ slug: 'home', label: 'Home' }, ...NAV_PAGES].map((p, i) => (
              <span key={p.slug} style={{ display: 'block', overflow: 'hidden' }}>
                <motion.a
                  href={href(p.slug)}
                  initial={reduced ? false : { y: '110%' }}
                  animate={{ y: '0%' }}
                  exit={{ y: '110%' }}
                  transition={{ duration: 0.9, delay: 0.06 * i, ease: ease.outExpo }}
                  className="am-display"
                  style={{ display: 'block', fontSize: 'clamp(2.2rem, 9vw, 3.8rem)', padding: '10px 0' }}
                >
                  {p.label}
                </motion.a>
              </span>
            ))}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              style={{ marginTop: 42 }}
            >
              <BookButton />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ────────────────────────── footer ────────────────────────── */

function Footer({ standalone }: { standalone: boolean }) {
  const href = useHref(standalone);
  return (
    <footer className="am-dark">
      <div className="am-shell am-section-sm am-centered">
        <Reveal>
          <Monogram size={64} style={{ margin: '0 auto 26px', color: 'var(--am-cream)' }} />
        </Reveal>
        <p className="am-kicker" style={{ color: 'var(--am-cream-mute)' }}>
          Refined stays in a Devonport heritage guesthouse
        </p>
        <Reveal>
          <p className="am-display" style={{ fontSize: 'clamp(2.8rem, 10vw, 8rem)', color: 'var(--am-cream)' }}>
            Annie May
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="am-body-copy" style={{ marginTop: 22 }}>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="am-link">
              {ADDRESS}
            </a>
          </p>
        </Reveal>
        <Reveal delay={0.25}>
          <nav
            style={{
              marginTop: 34,
              display: 'flex',
              gap: 'clamp(18px, 3vw, 34px)',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {[{ slug: 'home', label: 'Home' }, ...NAV_PAGES].map((p) => (
              <a
                key={p.slug}
                href={href(p.slug)}
                className="am-link"
                style={{ fontSize: '0.76rem', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500 }}
              >
                {p.label}
              </a>
            ))}
            <a
              href="/events"
              className="am-link"
              style={{ fontSize: '0.76rem', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500 }}
            >
              What&apos;s on
            </a>
          </nav>
        </Reveal>
        <Reveal delay={0.3}>
          <div style={{ marginTop: 26, display: 'flex', justifyContent: 'center' }}>
            <SocialLinks size={22} gap={22} />
          </div>
        </Reveal>
        <Reveal delay={0.35}>
          <div style={{ marginTop: 38 }}>
            <BookButton label="Book direct" />
          </div>
        </Reveal>
        <p className="am-body-copy" style={{ marginTop: 'clamp(44px, 5vw, 70px)', fontSize: '0.76rem', opacity: 0.6 }}>
          © {new Date().getFullYear()} Annie May · Boutique accommodation, Devonport, Tasmania
        </p>
      </div>
    </footer>
  );
}

/* ────────────────────────── home ────────────────────────── */

function Hero() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const [offset, setOffset] = useState(0);
  useEffect(() => scrollY.on('change', (v) => setOffset(Math.min(v, 900))), [scrollY]);

  const wx = useLiveWx();

  return (
    <section style={{ position: 'relative', height: '100svh', minHeight: 560, overflow: 'clip', color: 'var(--am-cream)' }}>
      <HolyGrailSky reduced={reduced} parallaxY={offset * 0.2} />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(29,32,26,0.34) 0%, rgba(29,32,26,0.12) 40%, rgba(29,32,26,0.6) 100%)',
        }}
      />
      {/* live conditions, tucked in the top-left of the image */}
      <AnimatePresence>
        {wx && (
          <motion.p
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.6 }}
            style={{
              position: 'absolute',
              top: 104,
              left: 'clamp(24px, 5vw, 64px)',
              zIndex: 2,
              margin: 0,
              fontSize: '0.95rem',
              letterSpacing: '0.06em',
              color: 'var(--am-cream)',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
            }}
          >
            <span aria-hidden style={{ fontSize: '1.15rem' }}>{wxEmoji(wx.code, wx.isDay)}</span>
            {wx.tempC}°
          </motion.p>
        )}
      </AnimatePresence>
      <div
        className="am-shell am-on-image am-centered"
        style={{ position: 'relative', height: '100%', justifyContent: 'center' }}
      >
        <Monogram animate size="clamp(72px, 10vw, 120px)" delay={0.4} style={{ marginBottom: 28 }} />
        <motion.p
          className="am-kicker"
          style={{ color: 'var(--am-cream)' }}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.9 }}
        >
          A 1906 heritage guesthouse · Devonport · Tasmania
        </motion.p>
        <MaskLines
          as="h1"
          className="am-display am-d-xl"
          lines={['She makes time feel', 'unhurried.']}
          delay={0.25}
        />
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 1.2, ease: ease.outExpo }}
          style={{ marginTop: 40, display: 'flex', gap: 26, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <BookButton />
          <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            Seven ensuite rooms · adults only · breakfast included
          </span>
        </motion.div>
      </div>
      <motion.span
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 2, duration: 1 }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          width: 1,
          height: 64,
          background: 'linear-gradient(to bottom, transparent, var(--am-cream))',
        }}
      />
    </section>
  );
}

/**
 * The opening movement after the hero: statement and essentials merged
 * into one composition. The headline and lead sit beside a tall image;
 * beneath them the four questions every onlooker arrives with unfold as
 * an accordion, and choosing one crossfades the image to match — where
 * she is shows the house, getting here the front door, and so on.
 */
const ESSENTIALS = [
  {
    q: 'Where is she?',
    a: 'In central Devonport on Tasmania’s north west coast, on the main road beside the Mersey and an easy walk to the city centre. If you only know you want the north west coast, start here: Devonport is where the coast begins.',
    image: IMG.merseyBluff,
    caption: 'Mersey Bluff, Devonport · photo Synyan (CC BY)',
  },
  {
    q: 'Getting here',
    a: 'Two kilometres from the Spirit of Tasmania terminal and twenty minutes from Devonport Airport. Roll off the ferry and be at her door in minutes.',
    image: IMG.spirit,
    caption: 'The Spirit passing Mersey Bluff · photo Cody Williams (CC BY-SA)',
  },
  {
    q: 'Who is she for?',
    a: 'Adults only, guests 18 and over. Couples, business travellers and quiet weekenders who value privacy and calm.',
    image: IMG.wineToast,
    caption: 'Good company, always',
  },
  {
    q: 'What is included?',
    a: 'Breakfast every morning, a private ensuite with every one of her seven king rooms, and lift access to every floor.',
    image: IMG.breakfast,
    caption: 'The breakfast room',
  },
];

function HomeIntro({ standalone }: { standalone: boolean }) {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const mapHref = standalone ? '/explore#map' : '/site/annie-may?v=2&page=explore#map';
  return (
    <section className="am-section">
      <div className="am-shell">
        <div className="am-grid" style={{ rowGap: 56 }}>
          {/* the changing image — sticky so it keeps pace with the questions */}
          <div style={{ gridColumn: 'span 5', gridRow: 1, alignSelf: 'stretch' }}>
            <div style={{ position: 'sticky', top: 110 }}>
            <div style={{ position: 'relative', aspectRatio: '4 / 5', overflow: 'hidden' }}>
              {ESSENTIALS.map((item, i) => (
                <motion.img
                  key={item.q}
                  src={item.image}
                  alt={item.caption}
                  initial={false}
                  animate={{ opacity: i === active ? 1 : 0, scale: reduced ? 1 : i === active ? 1 : 1.06 }}
                  transition={{ duration: reduced ? 0 : 1.1, ease: ease.outQuint }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ))}
            </div>
            <div style={{ marginTop: 14, minHeight: '1.2em', position: 'relative' }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={active}
                  className="am-body-copy"
                  style={{ fontSize: '0.8rem' }}
                  initial={reduced ? false : { opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: ease.outQuint }}
                >
                  {ESSENTIALS[active].caption}
                </motion.p>
              </AnimatePresence>
            </div>
            </div>
          </div>

          {/* statement + unfolding essentials */}
          <div style={{ gridColumn: 'span 6 / -1', gridRow: 1 }}>
            <p className="am-kicker">She knows how to hold a moment</p>
            <MaskLines
              as="h2"
              className="am-display am-d-md"
              lines={['Seven elegant ensuite rooms,', 'the ease of a fine hotel and', 'the grace of a private residence.']}
            />
            <Reveal delay={0.4}>
              <p className="am-lead" style={{ marginTop: 30, maxWidth: '32rem' }}>
                Soft light, doors that close quietly and space that keeps the world at bay. The
                questions you arrive with, answered before you have to ask.
              </p>
            </Reveal>

            <div style={{ marginTop: 'clamp(36px, 4vw, 56px)' }}>
              {ESSENTIALS.map((item, i) => {
                const open = i === active;
                return (
                  <Reveal key={item.q} delay={0.5 + i * 0.08} y={16}>
                    <div style={{ borderTop: '1px solid var(--am-hairline)' }}>
                      <button
                        type="button"
                        onClick={() => setActive(i)}
                        aria-expanded={open}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 20,
                          padding: '20px 0',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'inherit',
                          textAlign: 'left',
                          font: 'inherit',
                        }}
                      >
                        <span className="am-numeral" style={{ minWidth: '2.2em' }}>
                          {['I', 'II', 'III', 'IV'][i]}
                        </span>
                        <span
                          className="am-display am-d-sm"
                          style={{ flex: 1, transition: 'opacity .4s', opacity: open ? 1 : 0.55 }}
                        >
                          {item.q}
                        </span>
                        <motion.span
                          aria-hidden
                          animate={{ rotate: open ? 90 : 0, opacity: open ? 1 : 0.45 }}
                          transition={{ duration: 0.5, ease: ease.outQuint }}
                          style={{ fontSize: '1rem', color: 'var(--am-sage)' }}
                        >
                          →
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            key="answer"
                            initial={reduced ? false : { height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={reduced ? undefined : { height: 0, opacity: 0 }}
                            transition={{ duration: 0.7, ease: ease.outQuint }}
                            style={{ overflow: 'hidden' }}
                          >
                            <p className="am-body-copy" style={{ padding: '0 0 24px calc(2.2em + 20px)', maxWidth: '30rem' }}>
                              {item.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Reveal>
                );
              })}
              <div style={{ borderTop: '1px solid var(--am-hairline)' }} />
            </div>

            <Reveal delay={0.7}>
              <div style={{ marginTop: 34, display: 'flex', gap: 26, alignItems: 'center', flexWrap: 'wrap' }}>
                <motion.a className="am-book" href={mapHref} whileTap={{ scale: 0.97 }} transition={spring}>
                  See her on the map
                  <span className="arrow" aria-hidden>
                    →
                  </span>
                </motion.a>
                <a
                  href={standalone ? '/accommodation' : '/site/annie-may?v=2&page=accommodation'}
                  className="am-link am-more"
                >
                  Meet the rooms
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoomsIndex({ standalone }: { standalone: boolean }) {
  const href = useHref(standalone);
  return (
    <section className="am-tint am-section">
      <div className="am-shell">
        <div className="am-centered" style={{ marginBottom: 'clamp(48px, 6vw, 90px)' }}>
          <p className="am-kicker">Accommodation</p>
          <MaskLines as="h2" className="am-display am-d-lg" lines={['A room of', 'your own.']} />
        </div>
        <div className="am-grid" style={{ rowGap: 48 }}>
          {ROOMS.map((room, i) => (
            <div key={room.name} style={{ gridColumn: 'span 4', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <a href={href('accommodation')} className="am-zoom">
                <CurtainImage src={room.image} alt={`${room.name}, ${room.rooms}`} delay={i * 0.12} style={{ aspectRatio: '4 / 5' }} />
              </a>
              <Reveal delay={0.2 + i * 0.12}>
                <div style={{ paddingTop: 22, borderBottom: '1px solid var(--am-hairline)', paddingBottom: 24, flex: 1 }}>
                  <p className="am-numeral" style={{ marginBottom: 10 }}>
                    {room.numeral} · {room.rooms}
                  </p>
                  <h3 className="am-display am-d-sm">{room.name}</h3>
                  <p className="am-body-copy" style={{ fontSize: '0.78rem', marginTop: 12 }}>
                    {room.terms}
                  </p>
                  <div style={{ marginTop: 18 }}>
                    <a href={href('accommodation')} className="am-link am-more">
                      Full details
                    </a>
                  </div>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StoryTeaser({ standalone }: { standalone: boolean }) {
  const href = useHref(standalone);
  return (
    <section className="am-dark am-section">
      <div className="am-shell">
        <div className="am-grid" style={{ rowGap: 48, alignItems: 'center' }}>
          <div style={{ gridColumn: 'span 5', gridRow: 1 }}>
            <p className="am-numeral" style={{ marginBottom: 18 }}>
              Chapter I
            </p>
            <MaskLines as="h2" className="am-display am-d-lg" lines={['Heritage kept,', 'comforts', 'modernised.']} />
            <Reveal delay={0.35}>
              <p className="am-lead" style={{ marginTop: 30 }}>
                This heritage home was renovated around how you actually live while away. Seating set
                for conversation. Bedside switches where your hand falls. Linens that breathe. The
                balance you want: character intact, everything simply works.
              </p>
            </Reveal>
            <Reveal delay={0.5}>
              <div style={{ marginTop: 34 }}>
                <a href={href('story')} className="am-link am-more">
                  Read her story
                </a>
              </div>
            </Reveal>
          </div>
          <div className="am-frame" style={{ gridColumn: 'span 6 / -1', gridRow: 1 }}>
            <ParallaxImage src={IMG.chandelier} alt="Chandelier detail in the entrance hall" drift={9} style={{ aspectRatio: '4 / 5' }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { title: 'Breakfast room', body: 'A room full of light, for slow starts and easy conversation.', image: IMG.lounge },
    { title: 'Lift access', body: 'Her compact lift makes arrivals and departures effortless.', image: IMG.lift },
    { title: 'Luxury amenities', body: 'Premium linens and towels, quality bath products and layered lighting.', image: IMG.basin },
  ];
  return (
    <section className="am-section">
      <div className="am-shell">
        <div className="am-centered" style={{ marginBottom: 'clamp(48px, 6vw, 90px)' }}>
          <p className="am-kicker">Considered features</p>
          <MaskLines as="h2" className="am-display am-d-lg" lines={['She looks after', 'the details.']} />
        </div>
        <div className="am-grid" style={{ rowGap: 44 }}>
          {features.map((f, i) => (
            <div key={f.title} style={{ gridColumn: 'span 4', minWidth: 0 }}>
              <div className="am-zoom">
                <CurtainImage src={f.image} alt={f.title} delay={i * 0.12} style={{ aspectRatio: '4 / 3' }} />
              </div>
              <Reveal delay={0.2 + i * 0.12}>
                <h3 className="am-display am-d-sm" style={{ marginTop: 20 }}>
                  {f.title}
                </h3>
                <p className="am-body-copy" style={{ marginTop: 10, maxWidth: '22rem' }}>
                  {f.body}
                </p>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Deliberate mosaic: each row shares one height (the wide 3:2 cell sets
 *  it, portrait cells stretch to match), captions surface on hover. */
const GALLERY_ROWS: Array<Array<{ idx: number; span: number; lead?: boolean }>> = [
  [{ idx: 0, span: 6, lead: true }, { idx: 1, span: 3 }, { idx: 2, span: 3 }],
  [{ idx: 3, span: 3 }, { idx: 4, span: 6, lead: true }, { idx: 5, span: 3 }],
  [{ idx: 6, span: 6, lead: true }, { idx: 7, span: 6, lead: true }],
];

const TILE_COUNT = 8;
const CYCLE_MS = 3400; // one tile crossfades roughly every 3.4s

/**
 * One mosaic cell cycling through its share of the gallery. Every image in
 * the pool stays mounted (lazy-loaded, async-decoded) and stacked, so a
 * crossfade never waits on the network — the incoming image has been on the
 * page since the section scrolled into view.
 */
function GalleryTile({ pool, active, lead }: { pool: Array<{ src: string; alt: string }>; active: number; lead?: boolean }) {
  const cur = pool.length ? active % pool.length : 0;
  const fade = 'opacity 1.6s ease, transform 1.4s cubic-bezier(0.22, 1, 0.36, 1)';
  return (
    <figure className="am-tile" style={{ margin: 0, height: '100%', ...(lead ? { aspectRatio: '3 / 2' } : {}) }}>
      {pool.map((g, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={g.src}
          src={g.src}
          alt={i === cur ? g.alt : ''}
          loading="lazy"
          decoding="async"
          style={{
            ...(i === 0 ? {} : { position: 'absolute', inset: 0 }),
            opacity: i === cur ? 1 : 0,
            transition: fade,
          }}
        />
      ))}
      <figcaption>{pool[cur].alt}</figcaption>
    </figure>
  );
}

function GalleryStrip() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2 });
  const [tick, setTick] = useState(0);

  // The clock only runs while the mosaic is on screen; each tick advances
  // exactly one tile, walking the grid so swaps never happen in unison.
  useEffect(() => {
    if (!inView || reduced) return;
    const id = setInterval(() => setTick((t) => t + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, [inView, reduced]);

  // Tile i draws from GALLERY[i], GALLERY[i + 8], …
  const pools = useMemo(
    () =>
      Array.from({ length: TILE_COUNT }, (_, i) =>
        GALLERY.filter((_, j) => j % TILE_COUNT === i),
      ),
    [],
  );

  return (
    <section className="am-tint am-section-sm" style={{ overflow: 'clip' }}>
      <div className="am-shell am-centered" style={{ marginBottom: 40 }}>
        <p className="am-kicker" style={{ margin: 0 }}>
          The house, in light
        </p>
      </div>
      <div ref={ref} className="am-shell" style={{ display: 'grid', gap: 'clamp(12px, 1.6vw, 24px)' }}>
        {GALLERY_ROWS.map((row, r) => (
          <div key={r} className="am-grid am-mosaic-row" style={{ columnGap: 'clamp(12px, 1.6vw, 24px)' }}>
            {row.map((cell, c) => {
              const pool = pools[cell.idx];
              if (!pool?.length) return null;
              // Tick t swaps tile t % 8; this tile's swap count so far:
              const active = Math.floor((tick + (TILE_COUNT - 1 - cell.idx)) / TILE_COUNT);
              return (
                <Reveal
                  key={cell.idx}
                  delay={c * 0.12}
                  x={-30}
                  style={{ gridColumn: `span ${cell.span}`, minWidth: 0, minHeight: 0 }}
                >
                  <GalleryTile pool={pool} active={active} lead={cell.lead} />
                </Reveal>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────── accommodation page ────────────────────────── */

function AccommodationPage() {
  return (
    <>
      <PageIntro
        kicker="Accommodation at Annie May"
        lines={['How she looks', 'after you.']}
        lead="Evenings settle easily here. Light lands softly, doors close with a polite hush, and the house holds the pace for you. She is a heritage guesthouse shaped for calm, with the kind of finishing that disappears into comfort."
      />

      {ROOMS.map((room, i) => {
        const flip = i % 2 === 1;
        return (
          <section key={room.name} className={i % 2 === 0 ? 'am-tint am-section' : 'am-section'}>
            <div className="am-shell">
              <div className="am-grid" style={{ rowGap: 36 }}>
                <div style={{ gridColumn: flip ? 'span 7 / -1' : 'span 7', gridRow: 1, alignSelf: 'start' }}>
                  <div style={{ position: 'relative', paddingBottom: '26%' }}>
                    <CurtainImage src={room.image} alt={`${room.name}, ${room.rooms}`} style={{ aspectRatio: '4 / 3' }} />
                    <CurtainImage
                      src={room.detailImage}
                      alt=""
                      delay={0.25}
                      className="am-desktop-only"
                      style={{
                        position: 'absolute',
                        width: '32%',
                        aspectRatio: '3 / 4',
                        bottom: 0,
                        ...(flip ? { left: '-5%' } : { right: '-5%' }),
                        boxShadow: '0 30px 60px -30px rgba(29,32,26,0.45)',
                      }}
                    />
                  </div>
                </div>
                <div style={{ gridColumn: flip ? '1 / span 4' : 'span 4 / -1', gridRow: 1, alignSelf: 'center' }}>
                  <p className="am-numeral">
                    {room.numeral} · {room.rooms}
                  </p>
                  <h2 className="am-display am-d-md" style={{ marginTop: 14 }}>
                    {room.name}
                  </h2>
                  <p className="am-body-copy" style={{ fontSize: '0.8rem', marginTop: 16 }}>
                    {room.terms}
                  </p>
                  <p className="am-body-copy" style={{ marginTop: 18 }}>
                    {room.body}
                  </p>
                  <div style={{ marginTop: 26 }}>
                    <Ledger items={room.details.map((d) => [d, ''] as [string, string])} />
                  </div>
                  <div style={{ marginTop: 30 }}>
                    <BookButton label="Check availabilities" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <section className="am-dark am-section-sm">
        <div className="am-shell">
          <div className="am-grid" style={{ rowGap: 40, alignItems: 'start' }}>
            <div style={{ gridColumn: 'span 5', gridRow: 1 }}>
              <p className="am-kicker" style={{ color: 'var(--am-cream-mute)' }}>
                Room comforts
              </p>
              <MaskLines as="h2" className="am-display am-d-md" lines={['Everything you need,', 'nothing in the way.']} />
            </div>
            <div style={{ gridColumn: 'span 6 / -1', gridRow: 1 }}>
              <Ledger dark items={COMFORTS.map((c) => [c, ''] as [string, string])} />
            </div>
          </div>
        </div>
      </section>

      <FaqSection />
    </>
  );
}

/* ────────────────────────── story page ────────────────────────── */

function StoryPage() {
  return (
    <>
      <PageIntro
        kicker="Annie May’s story"
        lines={['The house that', 'kept calling.']}
        lead="Behind her is Deb, the woman who found the tired old house on Formby Road and turned her around. With her husband Craig she restored all seven rooms, and it is Deb who sets the breakfast table each morning. This is their story, and hers."
      />

      <section className="am-section" style={{ paddingTop: 0 }}>
        <div className="am-shell">
          <div className="am-grid" style={{ rowGap: 48, alignItems: 'center' }}>
            <div className="am-frame" style={{ gridColumn: 'span 6', gridRow: 1 }}>
              <ParallaxImage src={IMG.facade} alt="The old Formby Road house, Annie May" drift={9} style={{ aspectRatio: '4 / 5' }} />
            </div>
            <div style={{ gridColumn: 'span 5 / -1', gridRow: 1 }}>
              <p className="am-numeral" style={{ marginBottom: 18 }}>
                Chapter I
              </p>
              <MaskLines as="h2" className="am-display am-d-md" lines={['She saw what', 'could be.']} />
              <Reveal delay={0.3}>
                <p className="am-body-copy" style={{ marginTop: 24 }}>
                  For years, Deb rode past the old Formby Road house and felt something stir. Tired
                  and a little forgotten, but quiet charm under the dust. In 2021 she stepped inside
                  for the first time. Bunk beds from backpacker days, jackets on chairs, a room
                  paused mid-sentence. She did not see what was missing. She saw what could be.
                </p>
              </Reveal>
              <Reveal delay={0.45}>
                <p className="am-body-copy" style={{ marginTop: 18 }}>
                  With her husband, Craig, she brought the feeling back, slowly and lovingly, so the
                  house could hold people again without fuss.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="am-dark am-section">
        <div className="am-shell">
          <div className="am-grid" style={{ rowGap: 48, alignItems: 'center' }}>
            <div style={{ gridColumn: 'span 5', gridRow: 1 }}>
              <p className="am-numeral" style={{ marginBottom: 18 }}>
                Chapter II
              </p>
              <MaskLines as="h2" className="am-display am-d-md" lines={['The name', 'she carries.']} />
              <Reveal delay={0.3}>
                <p className="am-body-copy" style={{ marginTop: 24 }}>
                  She is named for Deb’s grandmother, Annie May. The woman who never wore trousers,
                  had her hair set every Tuesday, and kept stockings folded in neat rows. Elegant in
                  a quiet way. Tea before you asked. A look that reminded you to sit up straight.
                </p>
              </Reveal>
              <Reveal delay={0.45}>
                <p className="am-body-copy" style={{ marginTop: 18 }}>
                  Naming the house after her just made sense. Because like her, the house is full of
                  warmth and grace. It holds you without fuss. It knows beauty is in the little
                  things. This is a homemade recipe to make you feel looked after, just like Annie May
                  always did.
                </p>
              </Reveal>
            </div>
            <div className="am-frame" style={{ gridColumn: 'span 6 / -1', gridRow: 1 }}>
              <ParallaxImage src={IMG.host} alt="Deb at Annie May" drift={6} style={{ aspectRatio: '4 / 5' }} imgStyle={{ objectPosition: '30% 32%' }} />
            </div>
          </div>
        </div>
      </section>

      <section className="am-section">
        <div className="am-shell am-centered">
          <MaskLines
            as="p"
            className="am-display am-d-lg"
            lines={['Character intact.', 'Everything made', 'beautifully simple.']}
          />
        </div>
      </section>
    </>
  );
}

/* ────────────────────────── explore page ────────────────────────── */

function ExplorePage() {
  return (
    <>
      <PageIntro
        kicker="Explore"
        lines={['Her location', 'is central.']}
        lead="Annie May sits on the Mersey riverfront in central Devonport: two kilometres from the Spirit of Tasmania terminal, about twenty minutes from Devonport Airport, five minutes on foot to Rooke Street's restaurants and the paranaple arts centre, and a refined base for coastal drives and North West adventures. Arrive easily, explore all day, come back to calm."
      />

      <section className="am-tint am-section">
        <div className="am-shell">
          <div className="am-centered" style={{ marginBottom: 'clamp(48px, 6vw, 90px)' }}>
            <p className="am-kicker">Devonport &amp; the North West</p>
            <MaskLines as="h2" className="am-display am-d-lg" lines={['Where she sends', 'her favourite guests.']} />
            <Reveal delay={0.4}>
              <p className="am-lead am-narrow" style={{ marginTop: 30 }}>
                From coastal walks and riverfront paths to good coffee and easy dinner spots, these
                highlights are close enough to wander to and worth a short drive if you feel like
                exploring. Start nearby, then let the day stretch.
              </p>
            </Reveal>
          </div>
          <div className="am-grid" style={{ rowGap: 48 }}>
            {HIGHLIGHTS.map((h, i) => (
              <div key={h.name} style={{ gridColumn: 'span 4', minWidth: 0 }}>
                <div className="am-zoom">
                  <CurtainImage src={h.image} alt={h.name} delay={(i % 3) * 0.12} style={{ aspectRatio: '4 / 3' }} />
                </div>
                <Reveal delay={0.2 + (i % 3) * 0.12}>
                  <h3 className="am-display am-d-sm" style={{ marginTop: 20 }}>
                    {h.name}
                  </h3>
                  <p className="am-body-copy" style={{ marginTop: 10 }}>
                    {h.body}
                  </p>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="am-section" id="map" style={{ scrollMarginTop: 90 }}>
        <div className="am-shell">
          <div className="am-grid" style={{ rowGap: 40, alignItems: 'center' }}>
            <div style={{ gridColumn: 'span 4', gridRow: 1 }}>
              <p className="am-kicker">Find her on the map</p>
              <MaskLines as="h2" className="am-display am-d-md" lines={['Everything starts', 'at Formby Road.']} />
              <Reveal delay={0.3}>
                <p className="am-body-copy" style={{ marginTop: 22 }}>
                  {ADDRESS}. Minutes from the Spirit of Tasmania terminal and Devonport Airport, an
                  easy walk to the city, and the calm centre of every day trip on this page.
                </p>
              </Reveal>
              <Reveal delay={0.4}>
                <p className="am-body-copy" style={{ marginTop: 16 }}>
                  <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="am-link">
                    Open in Google Maps
                  </a>
                </p>
              </Reveal>
            </div>
            <div style={{ gridColumn: 'span 7 / -1', gridRow: 1 }}>
              <Reveal x={-30}>
                <div style={{ aspectRatio: '16 / 10', overflow: 'hidden', position: 'relative', background: 'var(--am-paper-2)' }}>
                  <iframe
                    src={MAPS_EMBED_URL}
                    title="Map to Annie May, 16 Formby Road, Devonport"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 0,
                      display: 'block',
                      filter: 'grayscale(0.55) sepia(0.12) contrast(0.96)',
                    }}
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ────────────────────────── contact page ────────────────────────── */

function EnquiryForm() {
  const [fields, setFields] = useState({ name: '', email: '', phone: '', message: '', website: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/site-enquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...fields, property_id: 'annie-may' }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (data.ok) {
        setStatus('sent');
      } else {
        setStatus('error');
        setError(data.message ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setError('Something went wrong sending your enquiry. Please try again.');
    }
  };

  if (status === 'sent') {
    return (
      <div style={{ borderTop: '1px solid var(--am-hairline)', paddingTop: 40 }}>
        <MaskLines as="p" className="am-display am-d-md" lines={['Thank you.', 'She has your note.']} />
        <p className="am-body-copy" style={{ marginTop: 20, maxWidth: '28rem' }}>
          We will get back to you within 48 hours. If it is about dates, the booking page always
          shows live availability.
        </p>
        <div style={{ marginTop: 28 }}>
          <BookButton label="Check availability" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="am-grid" style={{ rowGap: 34, columnGap: 'clamp(16px, 2.5vw, 40px)' }}>
        <label style={{ gridColumn: 'span 6' }}>
          <span className="am-label">First name *</span>
          <input className="am-input" type="text" name="name" autoComplete="given-name" required value={fields.name} onChange={set('name')} />
        </label>
        <label style={{ gridColumn: 'span 6' }}>
          <span className="am-label">Email address *</span>
          <input className="am-input" type="email" name="email" autoComplete="email" required value={fields.email} onChange={set('email')} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <span className="am-label">Phone number</span>
          <input className="am-input" type="tel" name="phone" autoComplete="tel" value={fields.phone} onChange={set('phone')} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <span className="am-label">Message *</span>
          <textarea className="am-input" name="message" rows={5} required value={fields.message} onChange={set('message')} />
        </label>
        {/* honeypot — humans never see or fill this */}
        <input
          className="am-input"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          style={{ position: 'absolute', left: '-9999px', height: 0, padding: 0, border: 0 }}
          value={fields.website}
          onChange={set('website')}
        />
      </div>
      {status === 'error' && (
        <p className="am-body-copy" style={{ marginTop: 20, color: 'var(--am-sage)' }}>
          {error}
        </p>
      )}
      <div style={{ marginTop: 38, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <motion.button type="submit" className="am-book" disabled={status === 'sending'} whileTap={{ scale: 0.97 }} transition={spring}>
          {status === 'sending' ? 'Sending…' : 'Send your enquiry'}
          <span className="arrow" aria-hidden>
            →
          </span>
        </motion.button>
        <span className="am-body-copy" style={{ fontSize: '0.8rem' }}>
          We reply within 48 hours.
        </span>
      </div>
    </form>
  );
}

function ContactPage() {
  return (
    <>
      <PageIntro
        kicker="Connect with us"
        lines={['Come and', 'stay awhile.']}
        lead="We keep things simple, just as your stay will be. Send an enquiry below and we will get back to you within 48 hours."
      />

      <section className="am-section" style={{ paddingTop: 0 }}>
        <div className="am-shell">
          <div className="am-grid" style={{ rowGap: 56 }}>
            <div style={{ gridColumn: 'span 7', gridRow: 1 }}>
              <Reveal>
                <EnquiryForm />
              </Reveal>
            </div>
            <aside style={{ gridColumn: 'span 4 / -1', gridRow: 1 }}>
              <Reveal delay={0.15}>
                <p className="am-kicker">Find her</p>
                <p className="am-body-copy">
                  <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="am-link">
                    {ADDRESS}
                  </a>
                </p>
              </Reveal>
              <Reveal delay={0.25}>
                <div style={{ marginTop: 26 }}>
                  <p className="am-kicker" style={{ marginBottom: 14 }}>
                    Say hello
                  </p>
                  <SocialLinks size={22} />
                </div>
              </Reveal>
              <Reveal delay={0.35}>
                <div style={{ marginTop: 34, aspectRatio: '4 / 3', overflow: 'hidden', background: 'var(--am-paper-2)' }}>
                  <iframe
                    src={MAPS_EMBED_URL}
                    title="Map to Annie May, 16 Formby Road, Devonport"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 0,
                      display: 'block',
                      filter: 'grayscale(0.55) sepia(0.12) contrast(0.96)',
                    }}
                  />
                </div>
              </Reveal>
              <Reveal delay={0.45}>
                <div style={{ marginTop: 30 }}>
                  <p className="am-body-copy" style={{ fontSize: '0.85rem' }}>
                    Ready to book? The booking page shows live availability for all seven rooms.
                  </p>
                  <div style={{ marginTop: 18 }}>
                    <BookButton label="Check availability" />
                  </div>
                </div>
              </Reveal>
            </aside>
          </div>
        </div>
      </section>

      <FaqSection />
    </>
  );
}

/* ────────────────────────── root ────────────────────────── */

/** V2 site chrome for standalone content pages (event articles etc.):
 *  the V2 nav and footer around arbitrary children. */
export function AnnieMayChromeV2({ standalone, children }: { standalone: boolean; children: React.ReactNode }) {
  return (
    <div className="am-root">
      <Nav current="" standalone={standalone} overHero={false} />
      <main>{children}</main>
      <Footer standalone={standalone} />
    </div>
  );
}

export default function AnnieMaySiteV2({ page, standalone }: { page: string; standalone: boolean }) {
  const current = ['accommodation', 'story', 'explore', 'contact'].includes(page) ? page : 'home';
  return (
    <div className="am-root">
      <AnnieMayEditBridge page={current} />
      <Nav current={current} standalone={standalone} overHero={current === 'home'} />
      <main>
        {current === 'home' && (
          <>
            <Hero />
            <HomeIntro standalone={standalone} />
            <RoomsIndex standalone={standalone} />
            <BreakfastSection />
            <WalkableSection />
            <StoryTeaser standalone={standalone} />
            <Features />
            <GalleryStrip />
            <ReviewsSection />
            <ClosingCta
              heading={['She looks after the details.']}
              sub="You bring the moment. She brings the calm. Reserve a stay that feels effortless."
            />
          </>
        )}
        {current === 'accommodation' && (
          <>
            <AccommodationPage />
            <ClosingCta heading={['Ready when you are.']} sub="Check availability and secure your dates on the booking page." />
          </>
        )}
        {current === 'story' && (
          <>
            <StoryPage />
            <ClosingCta heading={['Come and meet her.']} sub="Check availability and secure your dates on the booking page." />
          </>
        )}
        {current === 'explore' && (
          <>
            <ExplorePage />
            <ClosingCta heading={['A calm place to return to.']} sub="Spend the day exploring, then come back to a room that lets the world fall quiet." />
          </>
        )}
        {current === 'contact' && <ContactPage />}
      </main>
      <DirectOfferPopup />
      <Footer standalone={standalone} />
    </div>
  );
}
