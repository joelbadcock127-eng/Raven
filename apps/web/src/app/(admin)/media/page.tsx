import { supabaseAdmin } from '@/lib/supabase';
import MediaLibrary, { type MediaAsset } from '@/components/MediaLibrary';

export const revalidate = 0;

export default async function MediaPage() {
  const supabase = supabaseAdmin();
  let assets: MediaAsset[] = [];
  if (supabase) {
    const { data } = await supabase
      .from('media_assets')
      .select('id, property_id, kind, public_url, file_name, tags, caption, times_used, created_at')
      .order('created_at', { ascending: false });
    assets = (data as MediaAsset[]) ?? [];
  }

  return (
    <>
        <header style={{ marginBottom: 32 }}>
          <h1 className="display-lg" style={{ marginBottom: 12 }}>Media library</h1>
          <p className="caption" style={{ maxWidth: 620 }}>
            Raw photos and reels of the properties. Everything uploaded here becomes ammunition:
            campaign reels, social posts and event pages draw on this library automatically.
          </p>
        </header>
        <MediaLibrary assets={assets} />
        <footer className="caption" style={{ paddingTop: 64 }}>
          Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
        </footer>
    </>
  );
}
