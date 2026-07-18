import { supabaseAdmin } from '@/lib/supabase';
import MediaLibrary, { type MediaAsset, type MediaFolder } from '@/components/MediaLibrary';

export const revalidate = 0;

export default async function MediaPage() {
  const supabase = supabaseAdmin();
  let assets: MediaAsset[] = [];
  let folders: MediaFolder[] = [];
  if (supabase) {
    const [assetRes, folderRes] = await Promise.all([
      supabase
        .from('media_assets')
        .select('id, property_id, kind, public_url, file_name, tags, caption, times_used, folder_ids, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('media_folders').select('id, property_id, name').order('name'),
    ]);
    assets = (assetRes.data as MediaAsset[]) ?? [];
    folders = (folderRes.data as MediaFolder[]) ?? [];
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
        <MediaLibrary assets={assets} folders={folders} />
        <footer className="caption" style={{ paddingTop: 64 }}>
          Raven · booking-generation platform for Ten Fifty Bakers, The Prescription Pad and Annie May.
        </footer>
    </>
  );
}
