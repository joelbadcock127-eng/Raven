import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import CampaignBoard, { type CampaignRow } from '@/components/CampaignBoard';
import BestBets, { type BestBet } from '@/components/BestBets';

export const revalidate = 0;

const PROPERTIES = [
  { id: 'ten-fifty-bakers', name: 'Ten Fifty Bakers' },
  { id: 'prescription-pad', name: 'The Prescription Pad' },
  { id: 'annie-may', name: 'Annie May' },
];

interface BetOppRow {
  id: string;
  events: {
    title: string;
    start_date: string;
    end_date: string;
    locality: string | null;
    ai_demand: number | null;
    event_scores: Array<{ property_id: string; total: number }>;
  } | null;
}

function fmtShortDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/** For each property, the highest-scoring open opportunity from the feed. */
function pickBestBets(rows: BetOppRow[]): BestBet[] {
  const bets: BestBet[] = [];
  for (const p of PROPERTIES) {
    let best: { row: BetOppRow; score: number } | null = null;
    for (const row of rows) {
      const score = row.events?.event_scores.find((s) => s.property_id === p.id)?.total ?? 0;
      if (score > 0 && (!best || score > best.score)) best = { row, score };
    }
    if (!best?.row.events) continue;
    const e = best.row.events;
    const dates =
      e.start_date === e.end_date
        ? fmtShortDate(e.start_date)
        : `${fmtShortDate(e.start_date)} – ${fmtShortDate(e.end_date)}`;
    bets.push({
      opportunityId: best.row.id,
      propertyId: p.id,
      propertyName: p.name,
      line: [e.title, e.locality, dates, e.ai_demand != null ? `demand ${e.ai_demand}/100` : null]
        .filter(Boolean)
        .join(' · '),
    });
  }
  return bets;
}

export default async function CampaignsPage() {
  const supabase = supabaseAdmin();
  let campaigns: CampaignRow[] = [];
  let bets: BestBet[] = [];
  if (supabase) {
    const today = new Date().toISOString().slice(0, 10);
    const [campRes, oppRes] = await Promise.all([
      supabase
        .from('campaigns')
        .select(
          'id, status, assets, kit, landing_page_slug, revenue, bookings, started_at, stopped_at, created_at, property_id, target_start, target_end, offer, distribution, playbook, property:properties(name), event:events(title, start_date, end_date, venue_name, locality, organiser, ticket_url, url, tags)',
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('opportunities')
        .select(
          'id, events(title, start_date, end_date, locality, ai_demand, event_scores(property_id, total))',
        )
        .eq('status', 'new')
        .gte('events.start_date', today),
    ]);
    campaigns = (campRes.data as unknown as CampaignRow[]) ?? [];
    bets = pickBestBets(((oppRes.data as unknown as BetOppRow[]) ?? []).filter((r) => r.events));
  }

  return (
    <>
        <header style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 className="display-lg" style={{ marginBottom: 12 }}>Campaigns</h1>
            <p className="caption" style={{ maxWidth: 620 }}>
              One campaign per approved opportunity. This is the overview — click any campaign to
              open its page: goal dates, offer, kit assets, distribution and revenue.
            </p>
          </div>
          <Link
            href="/"
            className="caption"
            style={{
              padding: '7px 16px',
              borderRadius: 'var(--r-pill)',
              border: '1px solid var(--primary-subdued)',
              color: 'var(--primary)',
              whiteSpace: 'nowrap',
            }}
          >
            Open the feed →
          </Link>
        </header>
        <BestBets bets={bets} />
        <CampaignBoard campaigns={campaigns} />
        <footer className="caption" style={{ paddingTop: 64 }}>
          Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
        </footer>
    </>
  );
}
