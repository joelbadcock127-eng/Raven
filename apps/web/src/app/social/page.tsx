import { supabaseAdmin } from '@/lib/supabase';
import { metaConfigured } from '@/lib/meta';
import TopNav from '@/components/TopNav';
import SocialQueue, { type SocialPost, type MediaRef } from '@/components/SocialQueue';

export const revalidate = 0;

export default async function SocialPage() {
  const supabase = supabaseAdmin();
  let posts: SocialPost[] = [];
  let media: MediaRef[] = [];
  if (supabase) {
    const [postRes, mediaRes] = await Promise.all([
      supabase
        .from('social_posts')
        .select('id, campaign_id, property_id, kind, platform, caption, media_ids, scheduled_for, status, external_url, error, created_at')
        .neq('status', 'dismissed')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('media_assets').select('id, kind, public_url'),
    ]);
    posts = (postRes.data as SocialPost[]) ?? [];
    media = (mediaRes.data as MediaRef[]) ?? [];
  }

  return (
    <main style={{ position: 'relative', minHeight: '100vh' }}>
      <div className="mesh" />
      <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '0 24px 96px' }}>
        <TopNav active="Social" />
        <header style={{ marginBottom: 32 }}>
          <h1 className="display-lg" style={{ marginBottom: 12 }}>Social queue</h1>
          <p className="caption" style={{ maxWidth: 620 }}>
            Every post and reel Raven prepares — the 3-day regular and campaign content both land
            here as drafts. Nothing goes out without your approval.
          </p>
        </header>
        <SocialQueue posts={posts} media={media} metaConnected={metaConfigured()} />
        <footer className="caption" style={{ paddingTop: 64 }}>
          Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
        </footer>
      </div>
    </main>
  );
}
