'use client';

/**
 * Annie May — bespoke site. A ground-up, image-led editorial design
 * (Kinetic Luxe): Fraunces display type at scale, one burnt-ochre accent,
 * slow mask reveals and scroll parallax, physical springs only on
 * interactive elements, film grain over everything. No cards, no pills,
 * no prices. Four pages: home · rooms · gallery · contact.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll } from 'framer-motion';
import { CurtainImage, MaskLines, ParallaxImage, Reveal, ease, spring } from './motion';
import {
  ADDRESS,
  BOOK_URL,
  FACEBOOK_URL,
  GALLERY,
  IMG,
  INSTAGRAM_URL,
  MAPS_EMBED_URL,
  MAPS_URL,
  NAV_PAGES,
  ROOM_TYPES,
} from './data';
import './anniemay.css';

/* ────────────────────────── shared bits ────────────────────────── */

function useHref(standalone: boolean) {
  return (slug: string) =>
    standalone ? (slug === 'home' ? '/' : `/${slug}`) : `/site/annie-may${slug === 'home' ? '' : `?page=${slug}`}`;
}

function BookButton({ label = 'Check her dates' }: { label?: string }) {
  return (
    <motion.a
      className="am-book"
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
        <Reveal key={term} delay={i * 0.08} y={20}>
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
            <span style={{ fontSize: '0.95rem', fontWeight: 400 }}>{term}</span>
            <span className="am-body-copy" style={{ textAlign: 'right' }}>
              {detail}
            </span>
          </div>
        </Reveal>
      ))}
    </div>
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

  const light = overHero && !scrolled && !open; // cream text over the hero image
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
          background: scrolled ? 'rgba(246,243,236,0.82)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--am-hairline)' : '1px solid transparent',
          transition: 'color .5s, background .5s, border-color .5s',
        }}
      >
        <div
          className="am-shell"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 76 }}
        >
          <a
            href={href('home')}
            style={{ fontFamily: 'var(--am-display)', fontSize: '1.35rem', letterSpacing: '0.02em', fontWeight: 400 }}
          >
            Annie May
          </a>

          <nav className="am-desktop-only" style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
            {NAV_PAGES.map((p) => (
              <a
                key={p.slug}
                href={href(p.slug)}
                className={`am-link${current === p.slug ? ' am-link-lit' : ''}`}
                style={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 400 }}
              >
                {p.label}
              </a>
            ))}
            <BookButton label="Book" />
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
              fontSize: '0.8rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              padding: 8,
            }}
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </motion.header>

      {/* full-screen mobile menu */}
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
              background: 'var(--am-ink-2)',
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
                  style={{ display: 'block', fontSize: 'clamp(2.6rem, 11vw, 4.5rem)', padding: '10px 0' }}
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
    <footer className="am-dark" style={{ position: 'relative' }}>
      <div className="am-shell am-section-sm">
        <p className="am-kicker" style={{ color: 'var(--am-cream-mute)' }}>
          An adults only heritage guesthouse in Devonport, Tasmania
        </p>
        <Reveal>
          <p className="am-display" style={{ fontSize: 'clamp(3.4rem, 14vw, 13rem)', color: 'var(--am-cream)' }}>
            Annie May
          </p>
        </Reveal>
        <div
          className="am-grid"
          style={{ marginTop: 'clamp(40px, 6vw, 90px)', rowGap: 40, alignItems: 'start' }}
        >
          <div style={{ gridColumn: 'span 4' }}>
            <p className="am-body-copy">
              <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="am-link">
                {ADDRESS}
              </a>
            </p>
          </div>
          <nav style={{ gridColumn: 'span 4', display: 'grid', gap: 12 }}>
            {[{ slug: 'home', label: 'Home' }, ...NAV_PAGES].map((p) => (
              <a key={p.slug} href={href(p.slug)} className="am-link" style={{ width: 'fit-content', fontSize: '0.95rem' }}>
                {p.label}
              </a>
            ))}
          </nav>
          <div style={{ gridColumn: 'span 4', display: 'grid', gap: 12, justifyItems: 'start' }}>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="am-link" style={{ fontSize: '0.95rem' }}>
              Instagram · @anniemaybnb
            </a>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="am-link" style={{ fontSize: '0.95rem' }}>
              Facebook
            </a>
            <div style={{ marginTop: 16 }}>
              <BookButton label="Book direct" />
            </div>
          </div>
        </div>
        <p className="am-body-copy" style={{ marginTop: 'clamp(48px, 6vw, 80px)', fontSize: '0.78rem', opacity: 0.6 }}>
          © {new Date().getFullYear()} Annie May · Boutique accommodation, Devonport
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

  return (
    <section style={{ position: 'relative', height: '100svh', minHeight: 560, overflow: 'clip', color: 'var(--am-cream)' }}>
      <motion.img
        src={IMG.facade}
        alt="Annie May at dusk, a grand heritage home on Formby Road, Devonport"
        initial={reduced ? false : { scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.4, ease: ease.outExpo }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          willChange: 'transform',
          transform: reduced ? undefined : `translateY(${offset * 0.22}px)`,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(200deg, rgba(22,18,14,0.05) 30%, rgba(22,18,14,0.52) 78%), linear-gradient(0deg, rgba(22,18,14,0.55) 0%, transparent 34%)',
        }}
      />
      <div
        className="am-shell am-on-image"
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          paddingBottom: 'clamp(48px, 8vh, 110px)',
        }}
      >
        <motion.p
          className="am-kicker"
          style={{ color: 'var(--am-cream)' }}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.9 }}
        >
          Boutique guesthouse · Devonport, Tasmania
        </motion.p>
        <MaskLines
          as="h1"
          className="am-display am-d-xl"
          lines={['The grand old', 'lady of Devonport.']}
          delay={0.25}
        />
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 1.1, ease: ease.outExpo }}
          style={{ marginTop: 36, display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <BookButton />
          <span style={{ fontSize: '0.85rem', fontWeight: 300, opacity: 0.85 }}>
            Seven rooms · adults only · breakfast included
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

function Manifesto() {
  return (
    <section className="am-section">
      <div className="am-shell">
        <div className="am-grid" style={{ rowGap: 56 }}>
          <div style={{ gridColumn: 'span 7' }}>
            <p className="am-kicker">She has stood a century. She is not in a hurry.</p>
            <MaskLines
              as="h2"
              className="am-display am-d-lg"
              lines={['Seven rooms.', 'One grand old home.', 'Nowhere you', 'need to be.']}
            />
            <Reveal delay={0.5}>
              <p className="am-lead" style={{ marginTop: 40, maxWidth: '34rem' }}>
                Annie May is a heritage home on Formby Road, kept the way she deserves: her bones
                restored, her comforts modernised. Seven ensuite rooms, a lift to every floor, and
                breakfast downstairs. She is adults only, quiet by design, and minutes from the
                Spirit of Tasmania.
              </p>
            </Reveal>
          </div>
          <div style={{ gridColumn: 'span 4 / -1', alignSelf: 'end' }}>
            <ParallaxImage src={IMG.chandelier} alt="Chandelier detail in the entrance hall" drift={9} style={{ aspectRatio: '3 / 4' }} />
            <p className="am-body-copy" style={{ marginTop: 14, fontSize: '0.8rem' }}>
              The entrance hall, after dark.
            </p>
          </div>
        </div>

        <div className="am-grid" style={{ marginTop: 'clamp(64px, 8vw, 120px)' }}>
          {(
            [
              ['07', 'ensuite rooms, each with its own character'],
              ['18+', 'adults only, calm always'],
              ['All', 'floors reached by lift, luggage and all'],
              ['AM', 'breakfast included, made downstairs'],
            ] as Array<[string, string]>
          ).map(([big, small], i) => (
            <Reveal key={big} delay={i * 0.1} style={{ gridColumn: 'span 3', minWidth: 0 }}>
              <div style={{ borderTop: '1px solid var(--am-hairline)', paddingTop: 20 }}>
                <span className="am-display am-d-md am-numeral">{big}</span>
                <p className="am-body-copy" style={{ marginTop: 10, maxWidth: '13rem' }}>
                  {small}
                </p>
              </div>
            </Reveal>
          ))}
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
        <p className="am-kicker">The rooms</p>
        <MaskLines as="h2" className="am-display am-d-lg" lines={['Three ways', 'to stay.']} />
        <div style={{ marginTop: 'clamp(48px, 6vw, 90px)', display: 'grid', gap: 'clamp(72px, 9vw, 150px)' }}>
          {ROOM_TYPES.map((room, i) => {
            const flip = i % 2 === 1;
            return (
              <div key={room.name} className="am-grid" style={{ alignItems: 'center', rowGap: 32 }}>
                <CurtainImage
                  src={room.image}
                  alt={`${room.name}, ${room.rooms}`}
                  style={{
                    gridColumn: flip ? 'span 7 / -1' : 'span 7',
                    gridRow: 1,
                    aspectRatio: '4 / 3',
                  }}
                />
                <div style={{ gridColumn: flip ? '1 / span 4' : 'span 4 / -1', gridRow: 1 }}>
                  <span className="am-display am-d-md am-numeral">{room.numeral}</span>
                  <h3 className="am-display am-d-sm" style={{ marginTop: 14 }}>
                    {room.name}
                  </h3>
                  <p className="am-kicker" style={{ marginTop: 10, marginBottom: 14, color: 'var(--am-ink-soft)' }}>
                    {room.rooms}
                  </p>
                  <p className="am-lead" style={{ fontStyle: 'italic', fontFamily: 'var(--am-display)' }}>
                    {room.line}
                  </p>
                  <p className="am-body-copy" style={{ marginTop: 16 }}>
                    {room.body}
                  </p>
                  <div style={{ marginTop: 26 }}>
                    <a href={href('rooms')} className="am-link" style={{ fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      Every detail
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function QuoteBreak() {
  return (
    <section style={{ position: 'relative', color: 'var(--am-cream)' }} className="am-on-image">
      <ParallaxImage
        src={IMG.kingBath}
        alt="Freestanding bath against original brick, King Superior with Bath"
        drift={14}
        style={{ height: 'clamp(480px, 85vh, 820px)' }}
      />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(22,18,14,0.44)' }} />
      <div
        className="am-shell"
        style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      >
        <MaskLines
          as="p"
          className="am-display am-d-lg"
          style={{ fontStyle: 'italic', maxWidth: '18em' }}
          lines={['“She knows how', 'to hold a moment.”']}
        />
      </div>
    </section>
  );
}

function TheHouse() {
  return (
    <section className="am-section">
      <div className="am-shell">
        <div className="am-grid" style={{ rowGap: 48 }}>
          {/* overlapping editorial collage */}
          <div style={{ gridColumn: 'span 7', position: 'relative', paddingBottom: 'clamp(60px, 8vw, 120px)' }}>
            <ParallaxImage src={IMG.lounge} alt="The guest lounge" drift={8} style={{ aspectRatio: '4 / 3' }} />
            <CurtainImage
              src={IMG.breakfast}
              alt="The breakfast room"
              delay={0.25}
              style={{
                position: 'absolute',
                right: '-6%',
                bottom: 0,
                width: '52%',
                aspectRatio: '4 / 3',
                boxShadow: '0 30px 60px -30px rgba(25,21,17,0.4)',
              }}
            />
          </div>
          <div style={{ gridColumn: 'span 4 / -1', alignSelf: 'center' }}>
            <p className="am-kicker">Downstairs</p>
            <MaskLines as="h2" className="am-display am-d-md" lines={['Rooms you', 'didn’t book,', 'but get anyway.']} />
            <Reveal delay={0.3}>
              <p className="am-body-copy" style={{ marginTop: 24 }}>
                A guest lounge with deep leather and something to pour. A breakfast room where the
                morning starts properly. A lift gliding to every floor, so the stairs are a choice,
                not a chore. The whole ground floor is yours to drift through.
              </p>
            </Reveal>
            <Reveal delay={0.45}>
              <div style={{ marginTop: 34 }}>
                <Ledger
                  items={[
                    ['The lounge', 'leather, lamplight, a quiet drink'],
                    ['The breakfast room', 'included, every morning'],
                    ['The lift', 'every floor, no stairs needed'],
                    ['The loft stair', 'a spiral, for those who want it'],
                  ]}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Occasions() {
  return (
    <section className="am-dark am-section">
      <div className="am-shell">
        <div className="am-grid" style={{ rowGap: 48, alignItems: 'center' }}>
          <div style={{ gridColumn: 'span 5' }}>
            <p className="am-kicker">Weddings · milestones · gatherings</p>
            <MaskLines as="h2" className="am-display am-d-lg" lines={['Take the', 'whole house.']} />
            <Reveal delay={0.35}>
              <p className="am-lead" style={{ marginTop: 32 }}>
                Seven rooms, one address. For a wedding party in town, a milestone worth gathering
                for, or a slow weekend with your favourite adults: book her out and Annie May
                becomes yours: every key, the lounge, the long breakfasts.
              </p>
            </Reveal>
            <Reveal delay={0.5}>
              <div style={{ marginTop: 36 }}>
                <BookButton label="Gather your people" />
              </div>
            </Reveal>
          </div>
          <div style={{ gridColumn: 'span 6 / -1', position: 'relative' }}>
            <ParallaxImage src={IMG.tealBed} alt="King Superior beneath the chandelier" drift={10} style={{ aspectRatio: '4 / 3' }} />
            <CurtainImage
              src={IMG.stairs}
              alt="The spiral stair"
              delay={0.2}
              style={{
                position: 'absolute',
                left: '-8%',
                bottom: '-14%',
                width: '38%',
                aspectRatio: '3 / 4',
                boxShadow: '0 30px 60px -30px rgba(0,0,0,0.6)',
              }}
              className="am-desktop-only"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Location() {
  return (
    <section className="am-section">
      <div className="am-shell">
        <div className="am-grid" style={{ rowGap: 40 }}>
          <div style={{ gridColumn: 'span 6' }}>
            <p className="am-kicker">Central Devonport</p>
            <MaskLines as="h2" className="am-display am-d-lg" lines={['In the middle', 'of everything.']} />
          </div>
          <div style={{ gridColumn: 'span 5 / -1', alignSelf: 'end' }}>
            <Reveal>
              <p className="am-lead">
                Formby Road, by the Mersey. Roll off the Spirit of Tasmania and be at her door in
                minutes, or make her the base for the whole North West.
              </p>
            </Reveal>
          </div>
        </div>
        <div style={{ marginTop: 'clamp(48px, 6vw, 80px)' }}>
          <Ledger
            items={[
              ['The Spirit of Tasmania', 'minutes from the terminal, first night or last'],
              ['The Mersey riverfront', 'a stroll from the front door'],
              ['Devonport eats', 'cafés and dinner within walking distance'],
              ['Day trips', 'Cradle Mountain country, Sheffield’s murals, vineyards and cheese'],
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function GalleryMarquee() {
  const strip = GALLERY.slice(0, 8);
  return (
    <section className="am-section-sm am-tint" style={{ overflow: 'clip' }}>
      <div className="am-shell" style={{ marginBottom: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p className="am-kicker" style={{ margin: 0 }}>
          The house, in light
        </p>
      </div>
      <div className="am-marquee">
        {[...strip, ...strip].map((g, i) => (
          <img
            key={i}
            src={g.src}
            alt={i < strip.length ? g.alt : ''}
            aria-hidden={i >= strip.length}
            loading="lazy"
            style={{ height: 'clamp(220px, 34vw, 420px)', width: 'auto', objectFit: 'cover', marginRight: 8 }}
          />
        ))}
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section style={{ position: 'relative', color: 'var(--am-cream)' }} className="am-on-image">
      <ParallaxImage src={IMG.curtains} alt="Morning light through the sheers" drift={12} style={{ height: 'clamp(520px, 92vh, 860px)' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(22,18,14,0.52)' }} />
      <div
        className="am-shell"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <MaskLines as="h2" className="am-display am-d-xl" lines={['She’s waiting.']} />
        <Reveal delay={0.4}>
          <div style={{ marginTop: 38 }}>
            <BookButton label="Book direct" />
          </div>
        </Reveal>
        <Reveal delay={0.55}>
          <p className="am-body-copy" style={{ marginTop: 18, color: 'var(--am-cream-mute)' }}>
            Booking direct always gets her best.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ────────────────────────── rooms page ────────────────────────── */

function RoomsPage() {
  return (
    <>
      <section className="am-section" style={{ paddingTop: 'clamp(140px, 18vh, 220px)' }}>
        <div className="am-shell">
          <p className="am-kicker">The rooms</p>
          <MaskLines as="h1" className="am-display am-d-xl" lines={['Seven rooms,', 'three ways to stay.']} />
          <Reveal delay={0.4}>
            <p className="am-lead" style={{ marginTop: 36, maxWidth: '36rem' }}>
              Every room is an ensuite king with a proper desk, a large TV and a full length
              mirror; every stay includes breakfast; every floor is a lift ride away. Adults only,
              always. The differences are the ones worth choosing between.
            </p>
          </Reveal>
        </div>
      </section>

      {ROOM_TYPES.map((room, i) => (
        <section key={room.name} className={i % 2 === 0 ? 'am-tint am-section' : 'am-section'}>
          <div className="am-shell">
            <div className="am-grid" style={{ rowGap: 36 }}>
              <div style={{ gridColumn: i % 2 === 0 ? 'span 7' : 'span 7 / -1', gridRow: 1, alignSelf: 'start' }}>
                {/* inner wrapper so the detail shot anchors to the image, not the
                    row — it hangs below the frame, breaking one corner only */}
                <div style={{ position: 'relative', paddingBottom: '28%' }}>
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
                      ...(i % 2 === 0 ? { right: '-5%' } : { left: '-5%' }),
                      boxShadow: '0 30px 60px -30px rgba(25,21,17,0.45)',
                    }}
                  />
                </div>
              </div>
              <div style={{ gridColumn: i % 2 === 0 ? 'span 4 / -1' : '1 / span 4', alignSelf: 'center' }}>
                <span className="am-display am-d-md am-numeral">{room.numeral}</span>
                <h2 className="am-display am-d-md" style={{ marginTop: 12 }}>
                  {room.name}
                </h2>
                <p className="am-kicker" style={{ marginTop: 12, color: 'var(--am-ink-soft)' }}>
                  {room.rooms}
                </p>
                <p className="am-lead" style={{ fontStyle: 'italic', fontFamily: 'var(--am-display)' }}>
                  {room.line}
                </p>
                <p className="am-body-copy" style={{ marginTop: 16 }}>
                  {room.body}
                </p>
                <div style={{ marginTop: 28 }}>
                  <Ledger items={room.details.map((d) => [d, ''] as [string, string])} />
                </div>
                <div style={{ marginTop: 30 }}>
                  <BookButton label={`Book ${room.name.startsWith('The') ? room.name : 'this room'}`} />
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="am-dark am-section-sm">
        <div className="am-shell">
          <p className="am-kicker" style={{ color: 'var(--am-cream-mute)' }}>
            The count, room by room
          </p>
          <Ledger
            dark
            items={[
              ['Rooms 1 & 2', 'King Superior with Bath, shower and freestanding bath'],
              ['Rooms 3 to 6', 'King Superior, walk in shower'],
              ['Room 7', 'The Loft, the whole second level to yourself'],
            ]}
          />
        </div>
      </section>
    </>
  );
}

/* ────────────────────────── gallery page ────────────────────────── */

function GalleryPage() {
  return (
    <section className="am-section" style={{ paddingTop: 'clamp(140px, 18vh, 220px)' }}>
      <div className="am-shell">
        <p className="am-kicker">Gallery</p>
        <MaskLines as="h1" className="am-display am-d-xl" lines={['The house,', 'in light.']} />
        <div
          style={{
            marginTop: 'clamp(48px, 6vw, 90px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))',
            gridAutoFlow: 'dense',
            gap: 'clamp(10px, 1.4vw, 22px)',
          }}
        >
          {GALLERY.map((g, i) => (
            <Reveal
              key={g.src}
              delay={(i % 3) * 0.12}
              y={28}
              style={{ gridColumn: g.wide ? 'span 2' : undefined, minWidth: 0 }}
            >
              <figure style={{ margin: 0 }}>
                <div style={{ overflow: 'hidden', aspectRatio: g.tall ? '3 / 4' : g.wide ? '16 / 9' : '4 / 3' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.src}
                    alt={g.alt}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <figcaption className="am-body-copy" style={{ fontSize: '0.78rem', marginTop: 8 }}>
                  {g.alt}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── contact page ────────────────────────── */

function ContactPage() {
  return (
    <>
      <section className="am-section" style={{ paddingTop: 'clamp(140px, 18vh, 220px)' }}>
        <div className="am-shell">
          <p className="am-kicker">Find her</p>
          <MaskLines as="h1" className="am-display am-d-xl" lines={['Formby Road,', 'by the Mersey.']} />
          <div className="am-grid" style={{ marginTop: 'clamp(48px, 6vw, 90px)', rowGap: 48 }}>
            <div style={{ gridColumn: 'span 5' }}>
              <Reveal>
                <p className="am-lead">
                  The quickest way to check dates and stay with her is the booking page. It shows
                  live availability for all seven rooms.
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <div style={{ marginTop: 30 }}>
                  <BookButton label="Check availability" />
                </div>
              </Reveal>
              <Reveal delay={0.3}>
                <div style={{ marginTop: 48 }}>
                  <Ledger
                    items={[
                      ['Address', ADDRESS],
                      ['Instagram', '@anniemaybnb'],
                      ['Facebook', 'facebook.com/anniemaybnb'],
                    ]}
                  />
                </div>
              </Reveal>
              <Reveal delay={0.4}>
                <p className="am-body-copy" style={{ marginTop: 24 }}>
                  For anything else, send her a message on{' '}
                  <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="am-link">
                    Instagram
                  </a>{' '}
                  or{' '}
                  <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="am-link">
                    Facebook
                  </a>{' '}
                  and she will answer within 48 hours.
                </p>
              </Reveal>
            </div>
            <div style={{ gridColumn: 'span 6 / -1' }}>
              <CurtainImage src={IMG.facade} alt="Annie May, 16 Formby Road" style={{ aspectRatio: '16 / 9' }} />
              <Reveal delay={0.2} style={{ marginTop: 'clamp(12px, 1.5vw, 22px)' }}>
                <div style={{ aspectRatio: '4 / 3', overflow: 'hidden', position: 'relative', background: 'var(--am-paper-2)' }}>
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
              <p className="am-body-copy" style={{ marginTop: 12, fontSize: '0.8rem' }}>
                <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="am-link">
                  Open in Google Maps
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="am-tint am-section-sm">
        <div className="am-shell">
          <p className="am-kicker">Good to know</p>
          <Ledger
            items={[
              ['Adults only', 'a house for grown ups, guests 18 and over'],
              ['Seven ensuite rooms', 'each with king bed, desk, TV and full length mirror'],
              ['Lift access', 'every floor without stairs'],
              ['Breakfast', 'included with every stay, served downstairs'],
              ['Getting here', 'minutes from the Spirit of Tasmania terminal and Devonport Airport'],
            ]}
          />
        </div>
      </section>
    </>
  );
}

/* ────────────────────────── root ────────────────────────── */

export default function AnnieMaySite({ page, standalone }: { page: string; standalone: boolean }) {
  const current = ['rooms', 'gallery', 'contact'].includes(page) ? page : 'home';
  return (
    <div className="am-root am-grain">
      <Nav current={current} standalone={standalone} overHero={current === 'home'} />
      <main>
        {current === 'home' && (
          <>
            <Hero />
            <Manifesto />
            <RoomsIndex standalone={standalone} />
            <QuoteBreak />
            <TheHouse />
            <Occasions />
            <Location />
            <GalleryMarquee />
            <ClosingCta />
          </>
        )}
        {current === 'rooms' && <RoomsPage />}
        {current === 'gallery' && <GalleryPage />}
        {current === 'contact' && <ContactPage />}
      </main>
      <Footer standalone={standalone} />
    </div>
  );
}
