import { supabaseAdmin } from '@/lib/supabase';
import OutreachBook, { type OutreachContact } from '@/components/OutreachBook';

export const revalidate = 0;

export default async function OutreachPage() {
  const supabase = supabaseAdmin();
  let contacts: OutreachContact[] = [];
  if (supabase) {
    const { data } = await supabase
      .from('outreach_contacts')
      .select('*')
      .order('next_follow_up', { ascending: true, nullsFirst: false })
      .order('organisation');
    contacts = (data as OutreachContact[]) ?? [];
  }

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <h1 className="display-lg" style={{ marginBottom: 8 }}>Outreach</h1>
        <p className="caption" style={{ maxWidth: 620, color: 'var(--ink-mute)' }}>
          Organisations that generate repeat accommodation demand: contractors, project managers,
          event organisers, sports bodies, agencies. Follow-ups surface here when they come due.
        </p>
      </header>
      <OutreachBook contacts={contacts} />
      <footer className="caption" style={{ paddingTop: 64 }}>
        Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
      </footer>
    </>
  );
}
