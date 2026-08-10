'use client';

/**
 * An AI-generated event/occasion page rendered in Annie May's own design
 * language — the "blog post" face of the campaign kit CMS (event_pages).
 * Content arrives as the kit's PAGE_SCHEMA JSON; this component only
 * presents it. Used by /events/[slug] whenever the page belongs to
 * annie-may; other properties keep the generic template.
 */

import { motion } from 'framer-motion';
import { MaskLines, Reveal, spring } from './motion';
import './anniemay.css';

export interface EventArticleContent {
  headline: string;
  subheadline: string;
  intro: string;
  tieIn?: string;
  aboutProperty?: string;
  whyStay: string[];
  plan: string[];
  practical?: Array<{ label: string; value: string }>;
  galleryUrls?: string[];
  offer?: { name: string; pitch: string } | null;
  cta: string;
  heroImageUrl: string | null;
  bookUrl: string;
  eventTitle: string;
  eventDates: string;
  venue: string | null;
  locality: string | null;
  ticketUrl: string | null;
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

function Cta({ href, label }: { href: string; label: string }) {
  return (
    <motion.a
      className="am-book am-book-solid"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={{ scale: 0.97 }}
      transition={spring}
    >
      {label}
      <span className="arrow" aria-hidden>→</span>
    </motion.a>
  );
}

export default function AnnieMayEventArticle({
  content: c,
  published,
}: {
  content: EventArticleContent;
  published: boolean;
}) {
  const kicker = [c.eventDates, c.venue, c.locality].filter(Boolean).join(' · ');

  return (
    <>
      {!published && (
        <div style={{ background: '#fff8e1', borderBottom: '1px solid #e8d9a0', padding: '10px 24px', textAlign: 'center', fontSize: 13 }}>
          Draft preview — not yet published or indexed.
        </div>
      )}

      {/* header — light PageIntro treatment, the nav stays ink-on-cream */}
      <section className="am-section" style={{ paddingTop: 'clamp(150px, 20vh, 220px)', paddingBottom: 'clamp(40px, 5vw, 80px)' }}>
        <div className="am-shell am-centered">
          <p className="am-kicker">{kicker || c.eventTitle}</p>
          <MaskLines as="h1" className="am-display am-d-xl" lines={[c.headline]} style={{ maxWidth: '18em' }} />
          <Reveal delay={0.35}>
            <p className="am-lead am-narrow" style={{ marginTop: 30 }}>{c.subheadline}</p>
          </Reveal>
        </div>
      </section>

      {c.heroImageUrl && (
        <section className="am-shell" style={{ marginBottom: 'clamp(40px, 6vw, 80px)' }}>
          <Reveal x={-24}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.heroImageUrl} alt={c.eventTitle} style={{ width: '100%', aspectRatio: '21 / 9', objectFit: 'cover', display: 'block' }} />
          </Reveal>
        </section>
      )}

      <section style={{ paddingBottom: 'clamp(48px, 6vw, 90px)' }}>
        <div className="am-shell">
          <div className="am-grid" style={{ rowGap: 44 }}>
            <div style={{ gridColumn: 'span 7' }}>
              <Reveal>
                <p className="am-lead">{c.intro}</p>
              </Reveal>
              {c.tieIn && (
                <Reveal delay={0.1}>
                  <p className="am-body-copy" style={{ marginTop: 22 }}>{c.tieIn}</p>
                </Reveal>
              )}
              {c.aboutProperty && (
                <Reveal delay={0.15}>
                  <p className="am-body-copy" style={{ marginTop: 18 }}>{c.aboutProperty}</p>
                </Reveal>
              )}
              {c.ticketUrl && (
                <Reveal delay={0.2}>
                  <p className="am-body-copy" style={{ marginTop: 18 }}>
                    <a href={c.ticketUrl} target="_blank" rel="noopener noreferrer" className="am-link">
                      Event details and tickets
                    </a>
                  </p>
                </Reveal>
              )}
            </div>

            <aside style={{ gridColumn: 'span 4 / -1' }}>
              {c.offer && (
                <Reveal>
                  <div style={{ borderTop: '1px solid var(--am-hairline)', paddingTop: 20, marginBottom: 30 }}>
                    <p className="am-kicker" style={{ marginBottom: 10 }}>{c.offer.name}</p>
                    <p className="am-body-copy">{c.offer.pitch}</p>
                  </div>
                </Reveal>
              )}
              {(c.practical ?? []).length > 0 && (
                <Reveal delay={0.1}>
                  <p className="am-kicker" style={{ marginBottom: 6 }}>Good to know</p>
                  {(c.practical ?? []).map((p) => (
                    <div key={p.label} style={{ padding: '14px 0', borderTop: '1px solid var(--am-hairline)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block' }}>{p.label}</span>
                      <span className="am-body-copy" style={{ fontSize: '0.85rem' }}>{p.value}</span>
                    </div>
                  ))}
                </Reveal>
              )}
            </aside>
          </div>
        </div>
      </section>

      {c.whyStay.length > 0 && (
        <section className="am-dark am-section-sm">
          <div className="am-shell">
            <div className="am-grid" style={{ rowGap: 36, alignItems: 'start' }}>
              <div style={{ gridColumn: 'span 5', gridRow: 1 }}>
                <p className="am-kicker" style={{ color: 'var(--am-cream-mute)' }}>Why stay with her</p>
                <MaskLines as="h2" className="am-display am-d-md" lines={['The right room,', 'the right distance.']} />
              </div>
              <div style={{ gridColumn: 'span 6 / -1', gridRow: 1 }}>
                {c.whyStay.map((w, i) => (
                  <Reveal key={i} delay={i * 0.07} y={16}>
                    <div style={{ display: 'flex', gap: 18, padding: '16px 0', borderTop: '1px solid var(--am-hairline-dark)' }}>
                      <span className="am-numeral" style={{ minWidth: '2em' }}>{NUMERALS[i]}</span>
                      <span className="am-body-copy">{w}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {c.plan.length > 0 && (
        <section className="am-tint am-section-sm">
          <div className="am-shell">
            <p className="am-kicker">The shape of the stay</p>
            {c.plan.map((p, i) => (
              <Reveal key={i} delay={i * 0.07} y={16}>
                <div style={{ display: 'flex', gap: 18, padding: '16px 0', borderTop: '1px solid var(--am-hairline)' }}>
                  <span className="am-numeral" style={{ minWidth: '2em' }}>{NUMERALS[i]}</span>
                  <span className="am-body-copy" style={{ maxWidth: '38rem' }}>{p}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {(c.galleryUrls ?? []).length > 0 && (
        <section className="am-section-sm">
          <div className="am-shell am-grid" style={{ rowGap: 16 }}>
            {(c.galleryUrls ?? []).slice(0, 4).map((url, i) => (
              <Reveal key={url} delay={i * 0.1} x={-20} style={{ gridColumn: 'span 6', minWidth: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="am-section-sm am-centered" style={{ paddingBottom: 'clamp(70px, 8vw, 120px)' }}>
        <div className="am-shell am-centered">
          <MaskLines as="h2" className="am-display am-d-lg" lines={['She’ll keep', 'a room for you.']} />
          <Reveal delay={0.3}>
            <p className="am-body-copy" style={{ marginTop: 16 }}>
              Breakfast included · adults only · book direct with the house
            </p>
          </Reveal>
          <Reveal delay={0.4}>
            <div style={{ marginTop: 28 }}>
              <Cta href={c.bookUrl} label={c.cta || 'Check availabilities'} />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
