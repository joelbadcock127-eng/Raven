import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import { supabaseAdmin } from '@/lib/supabase';

export const revalidate = 300;

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500'], style: ['normal', 'italic'], variable: '--ev-serif' });
const sans = Jost({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--ev-sans' });

interface PageContent {
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
  metaDescription: string;
  heroImageUrl: string | null;
  bookUrl: string;
  propertyName: string;
  propertyDomain: string;
  eventTitle: string;
  eventDates: string;
  venue: string | null;
  locality: string | null;
  ticketUrl: string | null;
  promoCode?: string;
}

async function getPage(slug: string): Promise<{ content: PageContent; published: boolean } | null> {
  const supabase = supabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from('event_pages')
    .select('content, published')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;
  return data as { content: PageContent; published: boolean };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: `${page.content.headline} — ${page.content.propertyName}`,
    description: page.content.metaDescription,
    robots: page.published ? undefined : { index: false, follow: false },
  };
}

const INK = '#211d16';
const BG = '#f7f4ee';
const SOFT = '#eee9df';

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();
  const c = page.content;

  const kicker = [c.eventDates, c.venue, c.locality].filter(Boolean).join(' · ');

  return (
    <main
      className={`${serif.variable} ${sans.variable}`}
      style={{ minHeight: '100vh', background: BG, color: INK, fontFamily: 'var(--ev-sans), system-ui, sans-serif', fontWeight: 300 }}
    >
      {!page.published && (
        <div style={{ background: '#fff8e1', borderBottom: '1px solid #e8d9a0', padding: '8px 24px', textAlign: 'center', fontSize: 13 }}>
          Draft preview — not yet published or indexed.
        </div>
      )}

      {/* hero */}
      <div style={{ position: 'relative', minHeight: c.heroImageUrl ? 'min(66vh, 620px)' : 'auto', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', background: INK }}>
        {c.heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.heroImageUrl} alt={c.propertyName} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.62), rgba(0,0,0,.12) 55%)' }} />
        <div style={{ position: 'relative', width: '100%', maxWidth: 880, margin: '0 auto', padding: 'clamp(90px, 16vw, 150px) clamp(20px, 5vw, 40px) clamp(32px, 6vw, 56px)', color: '#fff' }}>
          <p style={{ fontSize: 11, letterSpacing: '.3em', textTransform: 'uppercase', opacity: 0.85, marginBottom: 14 }}>{kicker}</p>
          <h1 style={{ fontFamily: 'var(--ev-serif), Georgia, serif', fontWeight: 300, fontSize: 'clamp(32px, 5.6vw, 58px)', lineHeight: 1.08 }}>{c.headline}</h1>
          <p style={{ fontSize: 'clamp(14.5px, 1.9vw, 17px)', lineHeight: 1.7, marginTop: 14, maxWidth: 560, opacity: 0.94 }}>{c.subheadline}</p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(40px, 7vw, 72px) clamp(20px, 5vw, 40px) 0' }}>
        <p style={{ fontSize: 'clamp(16px, 2vw, 18px)', lineHeight: 1.85 }}>{c.intro}</p>

        {c.offer && (
          <div style={{ margin: '36px 0 0', padding: 'clamp(20px, 4vw, 30px)', background: SOFT, borderLeft: `2px solid ${INK}` }}>
            <p style={{ fontSize: 11, letterSpacing: '.28em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 8 }}>The offer</p>
            <p style={{ fontFamily: 'var(--ev-serif), Georgia, serif', fontSize: 'clamp(20px, 2.6vw, 25px)', lineHeight: 1.35 }}>{c.offer.name}</p>
            <p style={{ fontSize: 15, lineHeight: 1.75, marginTop: 8, opacity: 0.85 }}>{c.offer.pitch}</p>
          </div>
        )}

        {c.tieIn && (
          <>
            <h2 style={h2Style}>The trip, worked out</h2>
            <p style={bodyStyle}>{c.tieIn}</p>
          </>
        )}

        {c.aboutProperty && (
          <>
            <h2 style={h2Style}>About {c.propertyName}</h2>
            <p style={bodyStyle}>{c.aboutProperty}</p>
          </>
        )}
      </div>

      {/* gallery */}
      {(c.galleryUrls?.length ?? 0) > 0 && (
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(36px, 6vw, 60px) clamp(12px, 3vw, 40px) 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 44vw), 1fr))', gap: 6 }}>
            {c.galleryUrls!.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={u} alt={`${c.propertyName} — photo ${i + 1}`} loading="lazy" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 clamp(20px, 5vw, 40px) clamp(64px, 9vw, 100px)' }}>
        <h2 style={h2Style}>Why stay here for it</h2>
        <ul style={{ margin: '0 0 0 18px', display: 'grid', gap: 10 }}>
          {c.whyStay?.map((w, i) => (
            <li key={i} style={{ lineHeight: 1.7, fontSize: 15.5 }}>{w}</li>
          ))}
        </ul>

        {c.plan?.length > 0 && (
          <>
            <h2 style={h2Style}>How the days could go</h2>
            <ol style={{ margin: '0 0 0 18px', display: 'grid', gap: 10 }}>
              {c.plan.map((p, i) => (
                <li key={i} style={{ lineHeight: 1.7, fontSize: 15.5 }}>{p}</li>
              ))}
            </ol>
          </>
        )}

        {(c.practical?.length ?? 0) > 0 && (
          <>
            <h2 style={h2Style}>The practical bits</h2>
            <dl style={{ display: 'grid', gap: 0, margin: 0 }}>
              {c.practical!.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,.1)', flexWrap: 'wrap' }}>
                  <dt style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', opacity: 0.6, minWidth: 150, paddingTop: 3 }}>{p.label}</dt>
                  <dd style={{ margin: 0, fontSize: 15, lineHeight: 1.6, flex: 1, minWidth: 200 }}>{p.value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginTop: 44 }}>
          <a
            href={c.bookUrl}
            style={{
              display: 'inline-block', fontSize: 11, letterSpacing: '.26em', textTransform: 'uppercase',
              border: `1px solid ${INK}`, color: INK, padding: '15px 34px', textDecoration: 'none',
            }}
          >
            {c.cta ?? 'Check availability'}
          </a>
          {c.ticketUrl && (
            <a href={c.ticketUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: INK, opacity: 0.7 }}>
              Event tickets ↗
            </a>
          )}
          {c.promoCode && (
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              Mention code <strong>{c.promoCode}</strong> when booking direct
            </span>
          )}
        </div>

        <footer style={{ paddingTop: 72, fontSize: 12.5, opacity: 0.55 }}>
          {c.propertyName} · {c.propertyDomain} · book direct with the owners
        </footer>
      </div>
    </main>
  );
}

const h2Style: React.CSSProperties = {
  fontFamily: 'var(--ev-serif), Georgia, serif',
  fontWeight: 300,
  fontSize: 'clamp(24px, 3.2vw, 32px)',
  lineHeight: 1.15,
  margin: '44px 0 14px',
};
const bodyStyle: React.CSSProperties = { fontSize: 15.5, lineHeight: 1.85 };
