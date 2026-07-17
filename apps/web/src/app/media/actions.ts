'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';

export interface UploadTicket {
  ok: boolean;
  message?: string;
  signedUrl?: string;
  storagePath?: string;
  publicUrl?: string;
}

/** Issue a signed URL the browser can PUT the file to directly (no size limit through Vercel). */
export async function createUploadUrl(fileName: string, mimeType: string): Promise<UploadTicket> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const clean = fileName.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-');
  const storagePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID().slice(0, 8)}-${clean}`;

  const { data, error } = await supabase.storage.from('media').createSignedUploadUrl(storagePath);
  if (error || !data) return { ok: false, message: error?.message ?? 'Could not create upload URL' };

  const { data: pub } = supabase.storage.from('media').getPublicUrl(storagePath);
  return {
    ok: true,
    signedUrl: data.signedUrl,
    storagePath,
    publicUrl: pub.publicUrl,
  };
}

/** Record the asset row after the browser finishes uploading to storage. */
export async function registerAsset(input: {
  propertyId: string | null;
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
  patch: { tags?: string[]; caption?: string; propertyId?: string | null },
): Promise<{ ok: boolean; message?: string }> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const update: Record<string, unknown> = {};
  if (patch.tags) update.tags = patch.tags;
  if (patch.caption !== undefined) update.caption = patch.caption;
  if (patch.propertyId !== undefined) update.property_id = patch.propertyId;
  const { error } = await supabase.from('media_assets').update(update).eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/media');
  return { ok: true };
}

export async function deleteAsset(id: string): Promise<{ ok: boolean; message?: string }> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { data } = await supabase.from('media_assets').select('storage_path').eq('id', id).maybeSingle();
  if (data?.storage_path) await supabase.storage.from('media').remove([data.storage_path]);
  const { error } = await supabase.from('media_assets').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/media');
  return { ok: true };
}
