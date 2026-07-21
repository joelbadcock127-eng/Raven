import { supabaseAdmin } from '@/lib/supabase';
import { PROPERTY_META, propertyMeta } from '@/lib/properties';
import { appUrl } from '@/lib/links';
import CopyButton from '@/components/CopyButton';

export const revalidate = 0;

const DAY = 86_400_000;
const shortDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
const propName = (id: string | null) => propertyMeta(id)?.short ?? id ?? 'shared';

interface BasePost { id: string; property_id: string | null; kind: string; created_at: string; external_url: string | null }
interface Insight { reach: number | null; likes: number | null; comments: number | null; saves: number | null }
interface TrackedLink { id: string; property_id: string | null; campaign_id: string | null; label: string; kind: string; clicks: number }
interface CampaignRow { id: string; revenue: number; bookings: number; status: string; property_id: string | null; event: { title: string } | null }

export default async function AnalyticsPage() {
  const supabase = supabaseAdmin();

  let publishedPosts: BasePost[] = [];
  const insights = new Map<string, Insight>();
  let insightsMigrated = true;
  let links: TrackedLink[] = [];
  let linksMigrated = true;
  let dailyClicks: Array<{ date: string; n: number }> = [];
  let campaigns: CampaignRow[] = [];

  if (supabase) {
    // published posts (no new columns → always works)
    const { data } = await supabase
      .from('social_posts')
      .select('id, property_id, kind, created_at, external_url')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(200);
    publishedPosts = (data as BasePost[]) ?? [];

    // insights columns (need the 0014 migration)
    try {
      const { data: ins, error } = await supabase
        .from('social_posts')
        .select('id, reach, likes, comments, saves')
        .eq('status', 'published')
        .limit(200);
      if (error) throw error;
      for (const r of ins ?? []) insights.set(r.id as string, r as Insight);
    } catch {
      insightsMigrated = false;
    }

    // tracked links (need the 0014 migration)
    try {
      const { data: tl, error } = await supabase
        .from('tracked_links')
        .select('id, property_id, campaign_id, label, kind, clicks')
        .order('clicks', { ascending: false })
        .limit(50);
      if (error) throw error;
      links = (tl as TrackedLink[]) ?? [];

      const since = new Date(Date.now() - 30 * DAY).toISOString();
      const { data: clicks } = await supabase.from('link_clicks').select('clicked_at').gte('clicked_at', since);
      const byDay = new Map<string, number>();
      for (let i = 29; i >= 0; i--) byDay.set(new Date(Date.now() - i * DAY).toISOString().slice(0, 10), 0);
      for (const c of clicks ?? []) {
        const d = (c.clicked_at as string).slice(0, 10);
        if (byDay.has(d)) byDay.set(d, (byDay.get(d) ?? 0) + 1);
      }
      dailyClicks = [...byDay.entries()].map(([date, n]) => ({ date, n }));
    } catch {
      linksMigrated = false;
    }

    const { data: camps } = await supabase
      .from('campaigns')
      .select('id, revenue, bookings, status, property_id, event:events(title)')
      .order('created_at', { ascending: false });
    campaigns = (camps as unknown as CampaignRow[]) ?? [];
  }

  // ── derived ──
  const now = Date.now();
  const posts90 = publishedPosts.filter((p) => now - Date.parse(p.created_at) < 90 * DAY);
  const totalClicks = links.reduce((n, l) => n + Number(l.clicks || 0), 0);
  const totalRevenue = campaigns.reduce((n, c) => n + Number(c.revenue || 0), 0);
  const totalBookings = campaigns.reduce((n, c) => n + Number(c.bookings || 0), 0);
  const clicksByCampaign = new Map<string, number>();
  for (const l of links) if (l.campaign_id) clicksByCampaign.set(l.campaign_id, (clicksByCampaign.get(l.campaign_id) ?? 0) + l.clicks);

  const maxDaily = Math.max(1, ...dailyClicks.map((d) => d.n));
  const hasInsightData = [...insights.values()].some((i) => i.reach != null || i.likes != null);

  const tiles = [
    { v: String(posts90.length), l: 'posts published · 90d' },
    { v: linksMigrated ? String(totalClicks) : '—', l: 'tracked link clicks' },
    { v: `$${totalRevenue.toFixed(0)}`, l: 'campaign revenue' },
    { v: String(totalBookings), l: 'bookings attributed' },
  ];

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <h1 className="display-lg" style={{ marginBottom: 8 }}>Analytics</h1>
        <p className="caption" style={{ maxWidth: 620, color: 'var(--ink-mute)' }}>
          What the social effort is actually doing: posts published, link clicks, and the bookings
          and revenue campaigns generated. Reach and engagement fill in once Meta is connected.
        </p>
      </header>

      {(!insightsMigrated || !linksMigrated) && (
        <div className="card" style={{ padding: '12px 18px', marginBottom: 18, background: '#fff8e1', borderColor: '#e8d9a0' }}>
          <span className="caption" style={{ color: '#8a6410' }}>
            Run the 0014 migration to switch on link tracking and post insights (the SQL is in the
            chat). Everything below still shows what it can meanwhile.
          </span>
        </div>
      )}

      {/* summary tiles */}
      <section style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        {tiles.map((t) => (
          <div key={t.l} className="card" style={{ padding: '16px 22px', minWidth: 150 }}>
            <div className="tnum" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.1 }}>{t.v}</div>
            <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginTop: 5 }}>{t.l}</div>
          </div>
        ))}
      </section>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', alignItems: 'start' }}>
        {/* link performance */}
        <section className="card" style={{ padding: 22 }}>
          <h2 className="heading-md" style={{ marginBottom: 4 }}>Link performance</h2>
          <p className="caption" style={{ color: 'var(--ink-mute)', marginBottom: 14 }}>Clicks on tracked booking and event links.</p>
          {linksMigrated && dailyClicks.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60, marginBottom: 14 }}>
              {dailyClicks.map((d) => (
                <div key={d.date} title={`${shortDate(d.date)}: ${d.n}`} style={{ flex: 1, height: `${(d.n / maxDaily) * 100}%`, minHeight: 2, background: d.n ? 'var(--primary)' : 'var(--hairline)', borderRadius: 2 }} />
              ))}
            </div>
          )}
          {!linksMigrated ? (
            <p className="caption">Needs the 0014 migration.</p>
          ) : links.length === 0 ? (
            <p className="caption">No tracked links yet. They&apos;re created automatically on campaign kits and bio pages.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {links.slice(0, 12).map((l) => (
                <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span className="micro-cap" style={{ color: 'var(--ink-mute)', width: 62 }}>{propName(l.property_id)}</span>
                  <span className="caption" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label || l.kind}</span>
                  <span className="tnum caption" style={{ color: 'var(--primary-deep)' }}>{l.clicks}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* post performance */}
        <section className="card" style={{ padding: 22 }}>
          <h2 className="heading-md" style={{ marginBottom: 4 }}>Top posts</h2>
          <p className="caption" style={{ color: 'var(--ink-mute)', marginBottom: 14 }}>Published posts by reach.</p>
          {!insightsMigrated ? (
            <p className="caption">Needs the 0014 migration.</p>
          ) : publishedPosts.length === 0 ? (
            <p className="caption">Nothing published yet.</p>
          ) : !hasInsightData ? (
            <p className="caption">Connect Meta and the nightly insights sync fills in reach, likes, comments and saves here.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {publishedPosts
                .map((p) => ({ p, i: insights.get(p.id) }))
                .filter((x) => x.i)
                .sort((a, b) => (b.i!.reach ?? 0) - (a.i!.reach ?? 0))
                .slice(0, 8)
                .map(({ p, i }) => (
                  <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span className="micro-cap" style={{ color: 'var(--ink-mute)', width: 62 }}>{propName(p.property_id)}</span>
                    <span className="caption" style={{ flex: 1 }}>{p.kind}</span>
                    <span className="caption tnum" style={{ color: 'var(--ink-mute)' }}>
                      {i!.reach != null && `${i!.reach} reach`}
                      {i!.likes != null && ` · ${i!.likes}♥`}
                      {i!.saves != null && ` · ${i!.saves} saved`}
                    </span>
                    {p.external_url && <a href={p.external_url} target="_blank" rel="noopener noreferrer" className="caption">↗</a>}
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* campaign results */}
        <section className="card" style={{ padding: 22 }}>
          <h2 className="heading-md" style={{ marginBottom: 4 }}>Campaign results</h2>
          <p className="caption" style={{ color: 'var(--ink-mute)', marginBottom: 14 }}>Bookings and revenue per campaign.</p>
          {campaigns.length === 0 ? (
            <p className="caption">No campaigns yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {campaigns.slice(0, 12).map((c) => (
                <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span className="caption" style={{ flex: 1, minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.event?.title ?? 'Campaign'}</span>
                  <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>{propName(c.property_id)}</span>
                  {linksMigrated && clicksByCampaign.get(c.id) != null && (
                    <span className="caption tnum" style={{ color: 'var(--ink-mute)' }}>{clicksByCampaign.get(c.id)} clicks</span>
                  )}
                  <span className="caption tnum">{c.bookings} bkg · ${Number(c.revenue).toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* cadence health */}
        <section className="card" style={{ padding: 22 }}>
          <h2 className="heading-md" style={{ marginBottom: 4 }}>Posting cadence</h2>
          <p className="caption" style={{ color: 'var(--ink-mute)', marginBottom: 14 }}>Published in the last 30 days, and time since the last post.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {PROPERTY_META.map((m) => {
              const mine = publishedPosts.filter((p) => p.property_id === m.id);
              const last = mine[0]?.created_at;
              const in30 = mine.filter((p) => now - Date.parse(p.created_at) < 30 * DAY).length;
              const daysSince = last ? Math.floor((now - Date.parse(last)) / DAY) : null;
              const stale = daysSince == null || daysSince > 10;
              return (
                <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span className="caption" style={{ flex: 1, fontWeight: 500 }}>{m.short}</span>
                  <span className="caption tnum" style={{ color: 'var(--ink-mute)' }}>{in30} in 30d</span>
                  <span className="caption tnum" style={{ color: stale ? '#8a6410' : 'var(--ink-mute)' }}>
                    {daysSince == null ? 'none yet' : daysSince === 0 ? 'today' : `${daysSince}d ago`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* link-in-bio */}
      <section className="card" style={{ padding: 22, marginTop: 16 }}>
        <h2 className="heading-md" style={{ marginBottom: 4 }}>Link in bio</h2>
        <p className="caption" style={{ color: 'var(--ink-mute)', marginBottom: 14 }}>
          Put these in each property&apos;s Instagram and Facebook bio. They list the booking link and
          current event pages, and every tap is tracked.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {PROPERTY_META.map((m) => {
            const url = `${appUrl()}/l/${m.id}`;
            return (
              <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="caption" style={{ width: 90, fontWeight: 500 }}>{m.short}</span>
                <a href={`/l/${m.id}`} target="_blank" rel="noopener noreferrer" className="caption tnum" style={{ flex: 1, minWidth: 200, color: 'var(--primary)' }}>{url}</a>
                <CopyButton text={url} />
              </div>
            );
          })}
        </div>
      </section>

      <footer className="caption" style={{ paddingTop: 64 }}>
        Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
      </footer>
    </>
  );
}
