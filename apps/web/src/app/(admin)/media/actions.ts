'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import {
  createStorageUploadUrl,
  deleteStorageObject,
  type StorageProvider,
  type UploadTicket,
} from '@/lib/storage';

export type { UploadTicket };

/** Issue a signed URL the browser PUTs the file to directly (no size limit through Vercel). */
export async function createUploadUrl(fileName: string, mimeType: string): Promise<UploadTicket> {
  return createStorageUploadUrl(fileName, mimeType);
}

/** Record the asset row after the client finishes uploading to storage. */
export async function registerAsset(input: {
  propertyId: string | null;
  provider?: StorageProvider;
  storagePath: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<{ ok: boolean; message?: string }> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const kind = input.mimeType.startsWith('video') ? 'video' : 'image';
  const { error } = await supabase.from('media_assets').insert({
    property_id: input.propertyId,
    kind,
    storage_provider: input.provider ?? 'supabase',
    storage_path: input.storagePath,
    public_url: input.publicUrl,
    file_name: input.fileName,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/media');
  return { ok: true };
}

export async function updateAsset(
  id: string,
  patch: { tags?: string[]; caption?: string; propertyId?: string | null; retired?: boolean },
): Promise<{ ok: boolean; message?: string }> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const update: Record<string, unknown> = {};
  if (patch.tags) update.tags = patch.tags;
  if (patch.caption !== undefined) update.caption = patch.caption;
  if (patch.propertyId !== undefined) update.property_id = patch.propertyId;
  if (patch.retired !== undefined) update.retired = patch.retired;
  const { error } = await supabase.from('media_assets').update(update).eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/media');
  return { ok: true };
}

// ── Folders ──

export async function createFolder(
  propertyId: string | null,
  name: string,
  parentId?: string | null,
): Promise<{ ok: boolean; message?: string; id?: string }> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { data, error } = await supabase
    .from('media_folders')
    .insert({ property_id: propertyId, name: name.trim(), parent_id: parentId ?? null })
    .select('id')
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath('/media');
  return { ok: true, id: data.id };
}

export async function deleteFolder(id: string): Promise<{ ok: boolean; message?: string }> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  // remove the folder id from any assets that carry it, then drop the folder
  const { data: assets } = await supabase.from('media_assets').select('id, folder_ids').contains('folder_ids', [id]);
  for (const a of assets ?? []) {
    await supabase
      .from('media_assets')
      .update({ folder_ids: (a.folder_ids as string[]).filter((f) => f !== id) })
      .eq('id', a.id);
  }
  const { error } = await supabase.from('media_folders').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/media');
  return { ok: true };
}

export async function setAssetFolders(assetId: string, folderIds: string[]): Promise<{ ok: boolean; message?: string }> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase.from('media_assets').update({ folder_ids: folderIds }).eq('id', assetId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/media');
  return { ok: true };
}

// ── Free music via Openverse (CC0 / CC-BY, commercial use permitted) ──

export interface MusicResult {
  id: string;
  title: string;
  creator: string;
  license: string;
  duration: number; // seconds
  url: string; // direct audio file
}

export async function searchMusic(query: string): Promise<{ ok: boolean; message?: string; results?: MusicResult[] }> {
  try {
    const res = await fetch(
      `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(query)}&license=cc0,by&categories=music&page_size=12`,
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return { ok: false, message: `Openverse: HTTP ${res.status}` };
    const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
    const results: MusicResult[] = (json.results ?? [])
      .filter((r) => r.url)
      .map((r) => ({
        id: String(r.id),
        title: String(r.title ?? 'Untitled'),
        creator: String(r.creator ?? 'Unknown'),
        license: String(r.license ?? '').toUpperCase(),
        duration: Math.round(Number(r.duration ?? 0) / 1000),
        url: String(r.url),
      }));
    return { ok: true, results };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/** Download a CC track server-side into R2 and file it as library music. */
export async function importMusic(track: MusicResult, propertyId: string | null): Promise<{ ok: boolean; message?: string }> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  try {
    const res = await fetch(track.url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return { ok: false, message: `Download failed: HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 30 * 1024 * 1024) return { ok: false, message: 'Track too large' };

    const ext = track.url.split('?')[0].split('.').pop() || 'mp3';
    const mime = res.headers.get('content-type') ?? 'audio/mpeg';
    const ticket = await createStorageUploadUrl(`music-${track.title.slice(0, 40)}.${ext}`, mime);
    if (!ticket.ok || !ticket.signedUrl) return { ok: false, message: ticket.message ?? 'No upload URL' };
    const put = await fetch(ticket.signedUrl, { method: 'PUT', headers: { 'content-type': mime }, body: buf });
    if (!put.ok) return { ok: false, message: `Store failed: HTTP ${put.status}` };

    const attribution = track.license === 'BY' ? `"${track.title}" by ${track.creator} (CC BY, via Openverse)` : null;
    const { error } = await supabase.from('media_assets').insert({
      property_id: propertyId,
      kind: 'audio',
      storage_provider: ticket.provider ?? 'r2',
      storage_path: ticket.storagePath,
      public_url: ticket.publicUrl,
      file_name: `${track.title}.${ext}`,
      mime_type: mime,
      size_bytes: buf.length,
      tags: ['music'],
      caption: `${track.title} — ${track.creator}`,
      attribution,
    });
    if (error) return { ok: false, message: error.message };
    revalidatePath('/media');
    return { ok: true, message: `Imported "${track.title}"${attribution ? ' (credit saved for captions)' : ''}` };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function deleteAsset(id: string): Promise<{ ok: boolean; message?: string }> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { data } = await supabase
    .from('media_assets')
    .select('storage_path, storage_provider')
    .eq('id', id)
    .maybeSingle();
  if (data?.storage_path) {
    try {
      await deleteStorageObject((data.storage_provider as StorageProvider) ?? 'supabase', data.storage_path);
    } catch {
      // blob delete is best-effort; the row removal below is what matters
    }
  }
  const { error } = await supabase.from('media_assets').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/media');
  return { ok: true };
}
