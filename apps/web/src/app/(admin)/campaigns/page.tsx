import { supabaseAdmin } from '@/lib/supabase';
import CampaignBoard, { type CampaignRow } from '@/components/CampaignBoard';

export const revalidate = 0;

export default async function CampaignsPage() {
  const supabase = supabaseAdmin();
  let campaigns: CampaignRow[] = [];
  if (supabase) {
    const { data } = await supabase
      .from('campaigns')
      .select(
        'id, status, assets, revenue, bookings, started_at, stopped_at, created_at, property:properties(name), event:events(title, start_date, end_date, venue_name, locality, organiser, ticket_url, url)',
      )
      .order('created_at', { ascending: false });
    campaigns = (data as unknown as CampaignRow[]) ?? [];
  }

  return (
    <>
        <header style={{ marginBottom: 32 }}>
          <h1 className="display-lg" style={{ marginBottom: 12 }}>Campaigns</h1>
          <p className="caption" style={{ maxWidth: 620 }}>
            One campaign per approved opportunity, tracked through the full pipeline: discover →
            availability → property → page → content → approval → publish → bookings → revenue.
          </p>
        </header>
        <CampaignBoard campaigns={campaigns} />
        <footer className="caption" style={{ paddingTop: 64 }}>
          Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
        </footer>
    </>
  );
}
