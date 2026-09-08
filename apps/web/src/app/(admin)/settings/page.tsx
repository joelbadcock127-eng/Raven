import { supabaseAdmin } from '@/lib/supabase';
import { fetchLiveCosts, liveConfigured } from '@/lib/usage';
import PmsMenuToggle, { PromoMenuToggle } from '@/components/PmsMenuToggle';
import ThemeToggle from '@/components/ThemeToggle';
import PrivateBookingLinks, { type LinkRow, type RequestRow } from '@/components/PrivateBookingLinks';

export const revalidate = 0;

/**
 * Settings → usage & estimated costs.
 *
 * Decra doesn't meter provider billing directly (no billing APIs are
 * connected), so figures are computed from activity counts × current list
 * prices and clearly labelled estimates. Following the dataviz method:
 * a single measure (cost) across few categories → stat tiles + a
 * single-hue bar list with direct labels; no legend needed for one series.
 */

// unit-cost assumptions (AUD-ish, list prices, rounded up to be safe)
const COST = {
  enrichPerEvent: 0.004, // Haiku classify batch, per event
  captionPerPost: 0.003, // Haiku caption
  kitPerCampaign: 0.12, // Sonnet page + Haiku bundle
  aiSectionEdit: 0.004, // Haiku section edit (not yet metered — shown when logged)
  r2PerGbMonth: 0.023, // R2 storage $0.015 USD ≈ A$0.023
  renderPerJob: 0, // GitHub Actions free tier
};

interface Usage {
  enrichedEvents: number;
  captionedPosts: number;
  kits: number;
  storageGb: number;
  renderJobs: number;
  publishedPosts: number;
  mediaCount: number;
}

async function loadUsage(): Promise<Usage | null> {
  const supabase = supabaseAdmin();
  if (!supabase) return null;
  const monthStart = new Date();
  monthStart.setDate(1);
  const since = monthStart.toISOString();

  const [enriched, posts, kits, media, renders, published] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }).not('ai_enriched_at', 'is', null),
    supabase.from('social_posts').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).not('kit', 'eq', '{}'),
    supabase.from('media_assets').select('size_bytes'),
    supabase.from('render_jobs').select('id', { count: 'exact', head: true }),
    supabase.from('social_posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
  ]);

  const bytes = (media.data ?? []).reduce((n, m) => n + (m.size_bytes ?? 0), 0);
  return {
    enrichedEvents: enriched.count ?? 0,
    captionedPosts: posts.count ?? 0,
    kits: kits.count ?? 0,
    storageGb: bytes / 1024 ** 3,
    renderJobs: renders.count ?? 0,
    publishedPosts: published.count ?? 0,
    mediaCount: (media.data ?? []).length,
  };
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 4 }}>{label}</div>
      <div className="tnum" style={{ fontSize: 22, letterSpacing: '-0.3px', lineHeight: 1 }}>{value}</div>
      {sub && <div className="caption" style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/** One compact settings row: label (with optional hint) left, control right. */
function Row({
  label,
  hint,
  first,
  children,
}: {
  label: string;
  hint?: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 0',
        borderTop: first ? 'none' : '1px solid var(--hairline)',
      }}
    >
      <span style={{ fontSize: 14, color: 'var(--ink-secondary)', flex: 1, minWidth: 0 }}>
        {label}
        {hint && (
          <span className="caption" style={{ display: 'block', color: 'var(--ink-mute)' }}>{hint}</span>
        )}
      </span>
      {children}
    </div>
  );
}

export default async function SettingsPage() {
  const [u, live] = await Promise.all([loadUsage(), fetchLiveCosts()]);
  const configured = liveConfigured();

  const aiEstimate = u
    ? u.enrichedEvents * COST.enrichPerEvent + u.captionedPosts * COST.captionPerPost + u.kits * COST.kitPerCampaign
    : 0;
  const r2Gb = live.r2StorageBytes != null ? live.r2StorageBytes / 1024 ** 3 : u?.storageGb ?? 0;

  const rows = u
    ? [
        live.anthropicUsd != null
          ? { label: 'AI — Anthropic (live)', value: live.anthropicUsd, detail: 'month-to-date from the Anthropic cost API' }
          : { label: 'AI — all generation (estimated)', value: aiEstimate, detail: `${u.enrichedEvents} enrichments · ${u.captionedPosts} captions · ${u.kits} kits — add ANTHROPIC_ADMIN_KEY for live billing` },
        {
          label: `Storage — Cloudflare R2 ${live.r2StorageBytes != null ? '(live)' : '(estimated)'}`,
          value: r2Gb * COST.r2PerGbMonth,
          detail: `${r2Gb.toFixed(2)} GB${live.r2ClassAOps != null ? ` · ${live.r2ClassAOps} writes / ${live.r2ClassBOps} reads this month` : ''} — egress free${configured.r2 ? '' : ' — add CLOUDFLARE_API_TOKEN for live figures'}`,
        },
        { label: 'Reel rendering', value: u.renderJobs * COST.renderPerJob, detail: `${u.renderJobs} jobs on GitHub Actions free tier` },
      ]
    : [];
  const total = rows.reduce((n, r) => n + r.value, 0);

  // private booking links + their requests, for the card below
  let bookingLinks: LinkRow[] = [];
  let bookingRequests: RequestRow[] = [];
  {
    const supabase = supabaseAdmin();
    if (supabase) {
      const [{ data: links }, { data: reqs }] = await Promise.all([
        supabase.from('booking_links').select('*').order('created_at'),
        supabase.from('booking_requests').select('*').order('created_at', { ascending: false }).limit(30),
      ]);
      bookingLinks = (links as LinkRow[]) ?? [];
      bookingRequests = (reqs as RequestRow[]) ?? [];
    }
  }
  const appOrigin = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://decra-stays.vercel.app').replace(/\/$/, '');

  const max = Math.max(...rows.map((r) => r.value), 0.01);

  return (
    <>
      <header style={{ marginBottom: 24 }}>
        <h1 className="display-lg" style={{ marginBottom: 6 }}>Settings</h1>
        <p className="caption">Preferences, usage and estimated running costs.</p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
          gap: 16,
          maxWidth: 1060,
          marginBottom: 16,
          alignItems: 'start',
        }}
      >
        <section className="card" style={{ padding: '16px 20px' }}>
          <h2 className="heading-md" style={{ marginBottom: 2 }}>Preferences</h2>
          <p className="caption" style={{ marginBottom: 4 }}>Saved per device; admin only.</p>
          <Row first label="Theme" hint="The property websites keep their own designs.">
            <ThemeToggle />
          </Row>
          <Row label="PMS tabs in the side menu" hint="Dashboard, Reservations, Calendar — URLs work either way.">
            <PmsMenuToggle />
          </Row>
          <Row label="Booking codes tab" hint="Lodgify promo codes; the page stays at /promo-codes.">
            <PromoMenuToggle />
          </Row>
          <Row label="Outreach" hint="Organiser contacts and the partnership pipeline.">
            <a
              href="/outreach"
              className="caption"
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--r-pill)',
                border: '1px solid var(--primary-subdued)',
                color: 'var(--primary)',
                whiteSpace: 'nowrap',
              }}
            >
              Open →
            </a>
          </Row>
        </section>

        {!u ? (
          <section className="card" style={{ padding: '16px 20px' }}>
            <p className="caption">Connect Supabase to see usage.</p>
          </section>
        ) : (
          <section className="card" style={{ padding: '16px 20px' }}>
            <h2 className="heading-md" style={{ marginBottom: 2 }}>Usage &amp; costs</h2>
            <p className="caption" style={{ marginBottom: 14 }}>
              Month to date, AUD — activity counts at list prices, not provider invoices.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px 16px',
                paddingBottom: 14,
                marginBottom: 12,
                borderBottom: '1px solid var(--hairline)',
              }}
            >
              <Stat label="Estimated cost" value={`$${total < 10 ? total.toFixed(2) : total.toFixed(0)}`} sub="all services" />
              <Stat label="Media library" value={String(u.mediaCount)} sub={`${u.storageGb.toFixed(2)} GB in R2`} />
              <Stat label="Posts published" value={String(u.publishedPosts)} sub="via the Meta API" />
              <Stat label="Reels rendered" value={String(u.renderJobs)} sub="free on GitHub Actions" />
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {rows.map((r) => (
                <div key={r.label} title={r.detail}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3, gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--ink-secondary)', minWidth: 0 }}>{r.label}</span>
                    <span className="tnum" style={{ fontSize: 13, color: 'var(--ink)' }}>
                      ${r.value < 0.005 ? '0.00' : r.value.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--canvas-soft)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max((r.value / max) * 100, r.value > 0 ? 2 : 0)}%`,
                        borderRadius: 3,
                        background: 'var(--primary)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <PrivateBookingLinks links={bookingLinks} requests={bookingRequests} origin={appOrigin} />

      <footer className="caption" style={{ paddingTop: 40 }}>
        Decra · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
      </footer>
    </>
  );
}
