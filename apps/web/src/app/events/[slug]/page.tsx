import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export const revalidate = 300;

interface PageContent {
  headline: string;
  subheadline: string;
  intro: string;
  whyStay: string[];
  plan: string[];
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

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();
  const c = page.content;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--canvas)' }}>
      {!page.published && (
        <div className="caption" style={{ background: '#fff8e1', borderBottom: '1px solid #e8d9a0', padding: '8px 24px', textAlign: 'center' }}>
          Draft preview — not yet published or indexed.
        </div>
      )}

      {c.heroImageUrl && (
        <div style={{ position: 'relative', height: '46vh', minHeight: 320, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.heroImageUrl} alt={c.propertyName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,37,61,.65), transparent 60%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 24px 32px', maxWidth: 860, margin: '0 auto', color: '#fff' }}>
            <p className="micro-cap" style={{ marginBottom: 8, color: '#f5e9d4' }}>
              {c.eventDates}
              {c.venue ? ` · ${c.venue}` : ''}
              {c.locality ? ` · ${c.locality}` : ''}
            </p>
            <h1 style={{ fontSize: 38, fontWeight: 400, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{c.headline}</h1>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 96px' }}>
        {!c.heroImageUrl && <h1 className="display-lg" style={{ marginBottom: 8 }}>{c.headline}</h1>}
        <h2 className="heading-md" style={{ color: 'var(--ink-secondary)', marginBottom: 20 }}>{c.subheadline}</h2>
        <p style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>{c.intro}</p>

        <div className="card" style={{ padding: 28, marginBottom: 32 }}>
          <h3 className="heading-md" style={{ marginBottom: 14 }}>Why stay at {c.propertyName}</h3>
          <ul style={{ margin: '0 0 0 18px', display: 'grid', gap: 8 }}>
            {c.whyStay?.map((w, i) => (
              <li key={i} style={{ lineHeight: 1.6 }}>{w}</li>
            ))}
          </ul>
        </div>

        {c.plan?.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <h3 className="heading-md" style={{ marginBottom: 14 }}>Make a weekend of it</h3>
            <ol style={{ margin: '0 0 0 18px', display: 'grid', gap: 8 }}>
              {c.plan.map((p, i) => (
                <li key={i} style={{ lineHeight: 1.6 }}>{p}</li>
              ))}
            </ol>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <a href={c.bookUrl} className="pill-primary" style={{ fontSize: 16, padding: '12px 28px' }}>
            {c.cta ?? 'Check availability'}
          </a>
          {c.ticketUrl && (
            <a href={c.ticketUrl} target="_blank" rel="noopener noreferrer" className="caption">
              Event tickets ↗
            </a>
          )}
          {c.promoCode && (
            <span className="caption tnum">
              Mention code <strong>{c.promoCode}</strong> when booking direct
            </span>
          )}
        </div>

        <footer className="caption" style={{ paddingTop: 64 }}>
          {c.propertyName} · {c.propertyDomain} · book direct with the owners
        </footer>
      </div>
    </main>
  );
}
