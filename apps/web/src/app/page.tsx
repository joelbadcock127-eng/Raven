import { supabaseAdmin } from '@/lib/supabase';

export const revalidate = 300; // refresh feed every 5 minutes

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  venue_name: string | null;
  locality: string | null;
  url: string | null;
  tags: string[];
}

interface ScoreRow {
  property_id: string;
  total: number;
  rationale: string[];
}

interface OpportunityRow {
  id: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
  recommended_property_id: string | null;
  events: (EventRow & { event_scores: ScoreRow[] }) | null;
  properties: { name: string } | null;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
const PRIORITY_DOT = { high: 'var(--ruby)', medium: 'var(--primary-soft)', low: 'var(--ink-mute)' } as const;

const PROPERTY_NAMES: Record<string, string> = {
  'ten-fifty-bakers': 'Ten Fifty Bakers',
  'prescription-pad': 'The Prescription Pad',
  'annie-may': 'Annie May',
};

function daysUntil(date: string): number {
  return Math.round((Date.parse(date) - Date.now()) / 86_400_000);
}

function fmtDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

async function getOpportunities(): Promise<OpportunityRow[] | null> {
  const supabase = supabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('opportunities')
    .select(
      'id, priority, status, recommended_property_id, events(id, title, description, start_date, end_date, venue_name, locality, url, tags, event_scores(property_id, total, rationale)), properties(name)',
    )
    .eq('status', 'new')
    .gte('events.start_date', new Date().toISOString().slice(0, 10));
  if (error) throw new Error(error.message);
  const rows = (data as unknown as OpportunityRow[]).filter((o) => o.events);
  return rows.sort(
    (a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      a.events!.start_date.localeCompare(b.events!.start_date),
  );
}

export default async function Home() {
  const opportunities = await getOpportunities();

  return (
    <main style={{ position: 'relative', minHeight: '100vh' }}>
      <div className="mesh" />
      <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: '0 24px 96px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0 64px' }}>
          <span className="heading-md" style={{ fontWeight: 400, letterSpacing: '-0.4px' }}>
            Raven
          </span>
          <span className="caption">Opportunity Feed · Module 2 preview</span>
        </nav>

        <header style={{ marginBottom: 48 }}>
          <h1 className="display-lg" style={{ marginBottom: 12 }}>
            Where is the next booking likely to come from?
          </h1>
          <p className="caption" style={{ maxWidth: 560 }}>
            Events and demand signals discovered by the Event Monitor, scored separately for each
            property. Every recommendation stays editable and approval-led.
          </p>
        </header>

        {opportunities === null ? (
          <section className="card" style={{ padding: 32, maxWidth: 560 }}>
            <h2 className="heading-md" style={{ marginBottom: 8 }}>Almost there — connect Supabase</h2>
            <p style={{ marginBottom: 8 }}>
              Set <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> in the Vercel
              project&apos;s environment variables, then redeploy.
            </p>
          </section>
        ) : opportunities.length === 0 ? (
          <section className="card" style={{ padding: 32, maxWidth: 560 }}>
            <h2 className="heading-md">No open opportunities</h2>
            <p className="caption">Run the event monitor to discover new demand signals.</p>
          </section>
        ) : (
          <section style={{ display: 'grid', gap: 16 }}>
            {opportunities.map((o) => {
              const e = o.events!;
              const scores = [...e.event_scores].sort((a, b) => b.total - a.total);
              const best = scores[0];
              const days = daysUntil(e.start_date);
              return (
                <article key={o.id} className="card" style={{ padding: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: PRIORITY_DOT[o.priority],
                        display: 'inline-block',
                      }}
                    />
                    <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>
                      {o.priority} priority
                    </span>
                    <span className="caption tnum">
                      {fmtDate(e.start_date)}
                      {e.end_date !== e.start_date ? ` – ${fmtDate(e.end_date)}` : ''} · in {days}{' '}
                      {days === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  <h2 className="heading-md" style={{ marginBottom: 4 }}>
                    {e.url ? <a href={e.url} style={{ color: 'inherit' }}>{e.title}</a> : e.title}
                  </h2>
                  <p className="caption" style={{ marginBottom: 16 }}>
                    {[e.venue_name, e.locality].filter(Boolean).join(' · ')}
                  </p>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {e.tags.map((t) => (
                      <span key={t} className="tag-soft">{t}</span>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                    {scores.map((s) => {
                      const isBest = s.property_id === best.property_id;
                      return (
                        <div
                          key={s.property_id}
                          style={{
                            padding: '12px 16px',
                            borderRadius: 'var(--r-md)',
                            border: `1px solid ${isBest ? 'var(--primary)' : 'var(--hairline)'}`,
                            background: isBest ? 'var(--canvas-soft)' : 'var(--canvas)',
                          }}
                        >
                          <div className="caption" style={{ color: 'var(--ink-secondary)' }}>
                            {PROPERTY_NAMES[s.property_id] ?? s.property_id}
                            {isBest ? ' · recommended' : ''}
                          </div>
                          <div className="tnum" style={{ fontSize: 26, letterSpacing: '-0.26px' }}>
                            {s.total}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <details>
                    <summary className="caption" style={{ cursor: 'pointer', color: 'var(--primary)' }}>
                      Why {o.properties?.name ?? PROPERTY_NAMES[o.recommended_property_id ?? ''] ?? 'this property'}?
                    </summary>
                    <ul style={{ margin: '8px 0 0 18px' }}>
                      {best.rationale.map((r, i) => (
                        <li key={i} className="caption" style={{ marginBottom: 4 }}>{r}</li>
                      ))}
                    </ul>
                  </details>
                </article>
              );
            })}
          </section>
        )}

        <footer className="caption" style={{ paddingTop: 64 }}>
          Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie
          May. Data refreshes every 5 minutes.
        </footer>
      </div>
    </main>
  );
}
