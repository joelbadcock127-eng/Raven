import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import CampaignDetail, { type CampaignRow } from '@/components/CampaignDetail';

export const revalidate = 0;

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  if (!supabase) notFound();

  const { data } = await supabase
    .from('campaigns')
    .select(
      'id, status, assets, kit, landing_page_slug, revenue, bookings, started_at, stopped_at, created_at, property_id, target_start, target_end, offer, distribution, property:properties(name), event:events(title, start_date, end_date, venue_name, locality, organiser, ticket_url, url, tags)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const campaign = data as unknown as CampaignRow;

  return (
    <>
      <header style={{ marginBottom: 24 }}>
        <Link href="/campaigns" className="caption" style={{ color: 'var(--primary)' }}>
          ‹ All campaigns
        </Link>
        <h1 className="display-lg" style={{ marginTop: 10 }}>
          {campaign.event?.title ?? 'Campaign'}
        </h1>
      </header>
      <CampaignDetail campaign={campaign} />
      <footer className="caption" style={{ paddingTop: 64 }}>
        Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
      </footer>
    </>
  );
}
