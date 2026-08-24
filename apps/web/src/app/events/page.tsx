import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { SITES } from '@/lib/sites';
import { AnnieMayChromeV2 } from '@/components/anniemay/AnnieMaySiteV2';

export const revalidate = 300;

/**
 * "What's on" — the internal home for published event pages, so they are
 * discoverable (and crawlable) rather than orphaned. On a property's own
 * domain it lists that property's pages; on the Decra app host it lists
 * everything (the app host is noindexed anyway).
 */

interface Row {
  slug: string;
  property_id: string | null;
  content: {
    headline: string;
    metaDescription: string;
    eventTitle: string;
    eventDates: string;
    venue: string | null;
    locality: string | null;
    heroImageUrl: string | null;
    expiresAt?: string;
  };
}

async function hostProperty(): Promise<string | null> {
  const host = ((await headers()).get('host') ?? '').toLowerCase().split(':')[0].replace(/^www\./, '');
  return SITES.find((s) => s.domain === host)?.propertyId ?? null;
}

async function getPages(propertyId: string | null): Promise<Row[]> {
  const supabase = supabaseAdmin();
  if (!supabase) return [];
  let q = supabase
    .from('event_pages')
    .select('slug, property_id, content')
    .eq('published', true)
    .order('updated_at', { ascending: false });
  if (propertyId) q = q.eq('property_id', propertyId);
  const { data } = await q;
  const today = new Date().toISOString().slice(0, 10);
  // current pages first, archived (expired) ones after
  const rows = (data as Row[]) ?? [];
  return [
    ...rows.filter((r) => !r.content.expiresAt || r.content.expiresAt >= today),
    ...rows.filter((r) => r.content.expiresAt && r.content.expiresAt < today),
  ];
}

export async function generateMetadata(): Promise<Metadata> {
  const pid = await hostProperty();
  const site = SITES.find((s) => s.propertyId === pid);
  if (!site) return { title: "What's on — Decra", robots: { index: false, follow: true } };
  return {
    title: `What's on — events & stays · ${site.name}`,
    description: `Events worth travelling for near ${site.name}, with the stay worked out: dates, logistics and where to book direct.`,
    alternates: { canonical: `https://${site.domain}/events` },
  };
}

function List({ rows, showProperty }: { rows: Row[]; showProperty: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  if (rows.length === 0)
    return <p style={{ opacity: 0.7, fontSize: 15 }}>Nothing published just now — check back soon.</p>;
  return (
    <div style={{ display: 'grid', gap: 0 }}>
      {rows.map((r) => {
        const expired = !!r.content.expiresAt && r.content.expiresAt < today;
        const kicker = [r.content.eventDates, r.content.venue, r.content.locality].filter(Boolean).join(' · ');
        return (
          <a
            key={r.slug}
            href={`/events/${r.slug}`}
            style={{
              display: 'block',
              padding: '22px 0',
              borderTop: '1px solid rgba(0,0,0,0.12)',
              textDecoration: 'none',
              color: 'inherit',
              opacity: expired ? 0.55 : 1,
            }}
          >
            <p style={{ fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 6 }}>
              {kicker}
              {showProperty && r.property_id ? ` · ${r.property_id}` : ''}
              {expired ? ' · past event' : ''}
            </p>
            <h2 style={{ fontSize: 'clamp(20px, 2.6vw, 26px)', fontWeight: 400, lineHeight: 1.25, margin: 0 }}>
              {r.content.headline}
            </h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.65, marginTop: 8, maxWidth: '44rem', opacity: 0.8 }}>
              {r.content.metaDescription}
            </p>
          </a>
        );
      })}
    </div>
  );
}

export default async function EventsIndexPage() {
  const pid = await hostProperty();
  const rows = await getPages(pid);

  // Annie May's domain gets her chrome; everything else a clean generic list.
  if (pid === 'annie-may') {
    return (
      <AnnieMayChromeV2 standalone>
        <section className="am-section" style={{ paddingTop: 'clamp(150px, 20vh, 200px)' }}>
          <div className="am-shell">
            <p className="am-kicker">What&apos;s on</p>
            <h1 className="am-display am-d-lg" style={{ maxWidth: '16em' }}>
              Worth the trip, with the stay worked out.
            </h1>
            <div style={{ marginTop: 40, maxWidth: '52rem' }}>
              <List rows={rows} showProperty={false} />
            </div>
          </div>
        </section>
      </AnnieMayChromeV2>
    );
  }

  const site = SITES.find((s) => s.propertyId === pid);
  return (
    <main style={{ minHeight: '100vh', background: '#f7f4ee', color: '#211d16', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: 'clamp(56px, 10vw, 110px) clamp(20px, 5vw, 40px)' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 12 }}>
          {site ? site.name : 'Decra'} · what&apos;s on
        </p>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 36 }}>
          Events worth travelling for.
        </h1>
        <List rows={rows} showProperty={!site} />
        {site && (
          <p style={{ marginTop: 48, fontSize: 13, opacity: 0.6 }}>
            <a href="/" style={{ color: 'inherit' }}>← {site.name}</a>
          </p>
        )}
      </div>
    </main>
  );
}
