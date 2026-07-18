import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { supabaseAdmin } from './supabase';

/**
 * Media blob storage driver.
 *
 * Backbone: Cloudflare R2 (zero egress — every reel render, Meta fetch and
 * page view serves from here for free). Supabase Storage remains as the
 * fallback driver and continues to serve legacy rows, so nothing breaks
 * before the R2 env vars are set.
 *
 * R2 env vars (Vercel → Settings → Environment Variables):
 *   R2_ACCOUNT_ID         Cloudflare account id
 *   R2_ACCESS_KEY_ID      S3 API token key
 *   R2_SECRET_ACCESS_KEY  S3 API token secret
 *   R2_BUCKET             bucket name (default: raven-media)
 *   R2_PUBLIC_BASE        public base URL — the bucket's r2.dev public URL
 *                         or a connected custom domain, no trailing slash
 */

export type StorageProvider = 'r2' | 'supabase';

export interface UploadTicket {
  ok: boolean;
  message?: string;
  provider?: StorageProvider;
  signedUrl?: string;
  storagePath?: string;
  publicUrl?: string;
}

export function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_PUBLIC_BASE,
  );
}

export function activeProvider(): StorageProvider {
  return r2Configured() ? 'r2' : 'supabase';
}

function r2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const r2Bucket = () => process.env.R2_BUCKET || 'raven-media';

function cleanPath(fileName: string): string {
  const clean = fileName.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-');
  return `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID().slice(0, 8)}-${clean}`;
}

/** Signed URL the client (browser or iOS Shortcut) PUTs the file to directly. */
export async function createStorageUploadUrl(
  fileName: string,
  mimeType: string,
): Promise<UploadTicket> {
  const storagePath = cleanPath(fileName);

  if (r2Configured()) {
    try {
      const signedUrl = await getSignedUrl(
        r2Client(),
        new PutObjectCommand({
          Bucket: r2Bucket(),
          Key: storagePath,
          ContentType: mimeType || 'application/octet-stream',
        }),
        { expiresIn: 3600 },
      );
      return {
        ok: true,
        provider: 'r2',
        signedUrl,
        storagePath,
        publicUrl: `${process.env.R2_PUBLIC_BASE!.replace(/\/$/, '')}/${storagePath}`,
      };
    } catch (err) {
      return { ok: false, message: `R2 error: ${(err as Error).message}` };
    }
  }

  // Fallback: Supabase Storage (legacy driver)
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'No storage configured (set R2_* or Supabase env vars).' };
  const { data, error } = await supabase.storage.from('media').createSignedUploadUrl(storagePath);
  if (error || !data) return { ok: false, message: error?.message ?? 'Could not create upload URL' };
  const { data: pub } = supabase.storage.from('media').getPublicUrl(storagePath);
  return {
    ok: true,
    provider: 'supabase',
    signedUrl: data.signedUrl,
    storagePath,
    publicUrl: pub.publicUrl,
  };
}

/** Delete a blob from whichever store holds it. */
export async function deleteStorageObject(
  provider: StorageProvider,
  storagePath: string,
): Promise<void> {
  if (provider === 'r2' && r2Configured()) {
    await r2Client().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: storagePath }));
    return;
  }
  const supabase = supabaseAdmin();
  if (supabase) await supabase.storage.from('media').remove([storagePath]);
}
