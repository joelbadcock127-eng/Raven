import { supabaseAdmin } from '@/lib/supabase';
import OpportunityBoard, {
  type BoardOpportunity,
  type BoardProperty,
} from '@/components/OpportunityBoard';

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
  source: string | null;
  source_url: string | null;
  lat: number | null;
  lon: number | null;
  tags: string[];
  ai_demand: number | null;
  ai_summary: string | null;
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
}

interface GapRow {
  property_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  nights: number;
  kind: string;
}

// Fallback when the properties table hasn't been seeded yet.
const FALLBACK_PROPERTIES: BoardProperty[] = [
  { id: 'ten-fifty-bakers', name: 'Ten Fifty Bakers', locality: 'Bakers Beach', lat: -41.24, lon: 146.63 },
  { id: 'prescription-pad', name: 'The Prescription Pad', locality: 'Shearwater', lat: -41.157, lon: 146.542 },
  { id: 'annie-may', name: 'Annie May', locality: 'Devonport', lat: -41.18, lon: 146.36 },
];

function fmtDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface FeedData {
  properties: BoardProperty[];
  opportunities: BoardOpportunity[];
  gaps: GapRow[];
}

function availabilityCheck(
  availability: Map<string, { open: number; total: number }>,
  propertyId: string,
  start: string,
  end: string,
): { badge: string | null; bookedOut: boolean } {
  let open = 0;
  let total = 0;
  const d = new Date(start + 'T00:00:00Z');
  const endD = new Date(end + 'T00:00:00Z');
  while (d <= endD) {
    const agg = availability.get(`${propertyId}|${d.toISOString().slice(0, 10)}`);
    if (agg) {
      open += agg.open;
      total += agg.total;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  if (!total) return { badge: null, bookedOut: false };
  return { badge: `${open}/${total} unit-nights open`, bookedOut: open === 0 };
}

async function getFeedData(): Promise<FeedData | null> {
  const supabase = supabaseAdmin();
  if (!supabase) return null;
  const today = new Date().toISOString().slice(0, 10);

  const [propRes, oppRes, gapRes, availRes] = await Promise.all([
    supabase.from('properties').select('id, name, locality, lat, lon'),
    supabase
      .from('opportunities')
      .select(
        'id, priority, status, recommended_property_id, events(id, title, description, start_date, end_date, venue_name, locality, url, source, source_url, lat, lon, tags, ai_demand, ai_summary, event_scores(property_id, total, rationale))',
      )
      .eq('status', 'new')
      .gte('events.start_date', today),
    supabase
      .from('occupancy_gaps')
      .select('property_id, unit_id, start_date, end_date, nights, kind')
      .is('resolved_at', null)
      .gte('start_date', today)
      .order('start_date')
      .limit(12),
    supabase
      .from('availability_days')
      .select('property_id, date, is_available')
      .gte('date', today),
  ]);

  if (oppRes.error) throw new Error(oppRes.error.message);

  const properties: BoardProperty[] =
    propRes.data && propRes.data.length > 0
      ? (propRes.data as BoardProperty[])
      : FALLBACK_PROPERTIES;

  // Aggregate room-level rows into open/total per property+date
  const availability = new Map<string, { open: number; total: number }>();
  for (const row of availRes.data ?? []) {
    const key = `${row.property_id}|${row.date}`;
    const agg = availability.get(key) ?? { open: 0, total: 0 };
    agg.total++;
    if (row.is_available) agg.open++;
    availability.set(key, agg);
  }

  const rows = (oppRes.data as unknown as OpportunityRow[]).filter((o) => o.events);

  const opportunities: BoardOpportunity[] = rows.map((o) => {
    const e = o.events!;
    const scores: BoardOpportunity['scores'] = {};
    for (const s of e.event_scores) {
      scores[s.property_id] = { total: Number(s.total), rationale: s.rationale ?? [] };
    }
    return {
      id: o.id,
      priority: o.priority,
      title: e.title,
      summary: e.ai_summary,
      startDate: e.start_date,
      endDate: e.end_date,
      venue: e.venue_name,
      locality: e.locality,
      url: e.url,
      sourceUrl: e.source_url,
      source: e.source,
      tags: e.tags ?? [],
      demand: e.ai_demand,
      lat: e.lat,
      lon: e.lon,
      recommendedPropertyId: o.recommended_property_id,
      scores,
      ...(o.recommended_property_id
        ? (() => {
            const a = availabilityCheck(availability, o.recommended_property_id, e.start_date, e.end_date);
            return { availabilityBadge: a.badge, bookedOut: a.bookedOut };
          })()
        : { availabilityBadge: null, bookedOut: false }),
    };
  });

  return { properties, opportunities, gaps: (gapRes.data as GapRow[]) ?? [] };
}

export default async function Home() {
  const data = await getFeedData();
  const propertyNames = new Map(
    (data?.properties ?? FALLBACK_PROPERTIES).map((p) => [p.id, p.name]),
  );

  return (
    <>

        <header style={{ marginBottom: 22 }}>
          <h1 className="display-lg" style={{ marginBottom: 8 }}>Feed</h1>
          <p className="caption" style={{ maxWidth: 560, color: 'var(--ink-mute)' }}>
            Reasons people will need a bed, matched to your properties. Approve the good ones and
            Raven builds the campaign.
          </p>
        </header>

        {data === null ? (
          <section className="card" style={{ padding: 32, maxWidth: 560 }}>
            <h2 className="heading-md" style={{ marginBottom: 8 }}>Almost there — connect Supabase</h2>
            <p>
              Set <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> in the Vercel
              project&apos;s environment variables, then redeploy.
            </p>
          </section>
        ) : (
          <>
            {data.gaps.length > 0 && (
              <section className="card" style={{ padding: '20px 24px', marginBottom: 24, borderColor: 'var(--primary-subdued)' }}>
                <h2 className="heading-md" style={{ marginBottom: 12 }}>Vacant nights needing attention</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {data.gaps.map((g, i) => (
                    <span key={i} className="tag-soft" style={{ fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>
                      {propertyNames.get(g.property_id) ?? g.property_id}
                      {g.unit_id !== 'whole' ? ` · room ${g.unit_id}` : ''} · {fmtDate(g.start_date)} ·{' '}
                      {g.nights} {g.nights === 1 ? 'night' : 'nights'} ({g.kind})
                    </span>
                  ))}
                </div>
              </section>
            )}

            {data.opportunities.length === 0 ? (
              <section className="card" style={{ padding: 32, maxWidth: 560 }}>
                <h2 className="heading-md">No open opportunities</h2>
                <p className="caption">Run the event monitor to discover new demand signals.</p>
              </section>
            ) : (
              <OpportunityBoard properties={data.properties} opportunities={data.opportunities} />
            )}
          </>
        )}

        <footer className="caption" style={{ paddingTop: 64 }}>
          Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie
          May. Data refreshes every 5 minutes.
        </footer>
    </>
  );
}
