import { supabaseAdmin } from '@/lib/supabase';
import { fetchLiveCosts, liveConfigured } from '@/lib/usage';

export const revalidate = 0;

/**
 * Settings → usage & estimated costs.
 *
 * Raven doesn't meter provider billing directly (no billing APIs are
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

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 6 }}>{label}</div>
      <div className="tnum" style={{ fontSize: 30, letterSpacing: '-0.4px', lineHeight: 1 }}>{value}</div>
      {sub && <div className="caption" style={{ marginTop: 6 }}>{sub}</div>}
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
  const max = Math.max(...rows.map((r) => r.value), 0.01);

  return (
    <>
      <header style={{ marginBottom: 32 }}>
        <h1 className="display-lg" style={{ marginBottom: 12 }}>Settings</h1>
        <p className="caption" style={{ maxWidth: 620 }}>
          Usage and estimated running costs. Figures are computed from Raven&apos;s activity counts
          at list prices — estimates, not provider invoices.
        </p>
      </header>

      {!u ? (
        <section className="card" style={{ padding: 32, maxWidth: 560 }}>
          <p className="caption">Connect Supabase to see usage.</p>
        </section>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <Tile label="Estimated cost / month" value={`$${total < 10 ? total.toFixed(2) : total.toFixed(0)}`} sub="all services, month to date" />
            <Tile label="Media library" value={String(u.mediaCount)} sub={`${u.storageGb.toFixed(2)} GB in R2`} />
            <Tile label="Posts published" value={String(u.publishedPosts)} sub="via the Meta API" />
            <Tile label="Reels rendered" value={String(u.renderJobs)} sub="free on GitHub Actions" />
          </div>

          <section className="card" style={{ padding: '22px 24px', maxWidth: 720 }}>
            <h2 className="heading-md" style={{ marginBottom: 4 }}>Estimated cost by service</h2>
            <p className="caption" style={{ marginBottom: 18 }}>month to date, AUD</p>
            <div style={{ display: 'grid', gap: 14 }}>
              {rows.map((r) => (
                <div key={r.label} title={r.detail}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, color: 'var(--ink-secondary)' }}>{r.label}</span>
                    <span className="tnum" style={{ fontSize: 14, color: 'var(--ink)' }}>
                      ${r.value < 0.005 ? '0.00' : r.value.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 10, borderRadius: 4, background: 'var(--canvas-soft)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max((r.value / max) * 100, r.value > 0 ? 2 : 0)}%`,
                        borderRadius: 4,
                        background: 'var(--primary)',
                      }}
                    />
                  </div>
                  <div className="caption" style={{ marginTop: 3 }}>{r.detail}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <footer className="caption" style={{ paddingTop: 64 }}>
        Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
      </footer>
    </>
  );
}
