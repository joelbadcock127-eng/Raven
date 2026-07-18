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
