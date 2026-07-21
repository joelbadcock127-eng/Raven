import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import { supabaseAdmin } from '@/lib/supabase';
import { propertyMeta } from '@/lib/properties';
import { getOrCreateTrackedLink } from '@/lib/links';

export const revalidate = 120;

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--l-serif' });
const sans = Jost({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--l-sans' });

export async function generateMetadata({ params }: { params: Promise<{ property: string }> }): Promise<Metadata> {
  const { property } = await params;
  const meta = propertyMeta(property);
  if (!meta) return {};
  return { title: `${meta.name} — book direct`, description: meta.tagline };
}

interface BioLink {
  label: string;
  sub?: string;
  href: string;
  primary?: boolean;
}

export default async function BioPage({ params }: { params: Promise<{ property: string }> }) {
  const { property } = await params;
  const meta = propertyMeta(property);
  if (!meta) notFound();

  const supabase = supabaseAdmin();
  const links: BioLink[] = [];

  // Booking link (tracked when possible, direct otherwise)
  let bookingHref = meta.bookUrl;
  if (supabase) {
    const t = await getOrCreateTrackedLink(supabase, {
      propertyId: meta.id,
      label: `${meta.name} — book direct`,
      targetUrl: meta.bookUrl,
      kind: 'booking',
    });
    if (t) bookingHref = t.relUrl;
  }
  links.push({ label: 'Check availability & book direct', sub: 'Best rate, straight with the owners', href: bookingHref, primary: true });

  // Published event / campaign pages for this property
  if (supabase) {
    const { data: pages } = await supabase
      .from('event_pages')
      .select('slug, content, published, event_id, created_at')
      .eq('property_id', meta.id)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(6);
    for (const p of pages ?? []) {
      const c = (p.content ?? {}) as { headline?: string; eventDates?: string };
      const target = `https://${meta.domain}/events/${p.slug}`;
      let href = target;
      const t = await getOrCreateTrackedLink(supabase, {
        propertyId: meta.id,
        label: c.headline ?? p.slug,
        targetUrl: target,
        kind: 'event',
      });
      if (t) href = t.relUrl;
      links.push({ label: c.headline ?? 'Event stay', sub: c.eventDates, href });
    }
  }

  // Always offer the main site
  links.push({ label: `Visit ${meta.name}`, sub: meta.domain, href: `https://${meta.domain}` });

  return (
    <main
      className={`${serif.variable} ${sans.variable}`}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #211d16 0%, #2c2519 100%)',
        color: '#f3ede1',
        fontFamily: 'var(--l-sans), system-ui, sans-serif',
        fontWeight: 300,
        display: 'flex',
        justifyContent: 'center',
        padding: '48px 20px 64px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '.3em', textTransform: 'uppercase', opacity: 0.7 }}>{meta.locality}</div>
        <h1 style={{ fontFamily: 'var(--l-serif), Georgia, serif', fontWeight: 400, fontSize: 'clamp(34px, 9vw, 46px)', margin: '10px 0 12px', lineHeight: 1.05 }}>
          {meta.name}
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.85, maxWidth: 360, margin: '0 auto 34px' }}>{meta.tagline}</p>

        <div style={{ display: 'grid', gap: 12 }}>
          {links.map((l, i) => (
            <a
              key={i}
              href={l.href}
              style={{
                display: 'block',
                textDecoration: 'none',
                padding: '16px 18px',
                borderRadius: 14,
                border: '1px solid rgba(243,237,225,.25)',
                background: l.primary ? '#f3ede1' : 'rgba(243,237,225,.06)',
                color: l.primary ? '#211d16' : '#f3ede1',
                transition: 'transform .15s',
              }}
            >
              <div style={{ fontSize: 15.5, fontWeight: 500, letterSpacing: '.01em' }}>{l.label}</div>
              {l.sub && (
                <div style={{ fontSize: 12.5, opacity: l.primary ? 0.65 : 0.7, marginTop: 3 }}>{l.sub}</div>
              )}
            </a>
          ))}
        </div>

        <div style={{ marginTop: 40, fontSize: 11.5, letterSpacing: '.05em', opacity: 0.5 }}>
          © {meta.name} · book direct, stay local
        </div>
      </div>
    </main>
  );
}
