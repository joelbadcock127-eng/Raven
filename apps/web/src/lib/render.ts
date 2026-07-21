import type { SupabaseClient } from '@supabase/supabase-js';
import { createStorageUploadUrl } from './storage';

/**
 * Reel render pipeline — ffmpeg on GitHub Actions (free compute).
 *
 * Env vars:
 *   GH_DISPATCH_TOKEN  fine-grained GitHub token with Actions read/write
 *                      on the Raven repo (fires the render workflow)
 *   GH_REPO            owner/repo, default joelbadcock127-eng/Raven
 *   NEXT_PUBLIC_APP_URL  the deployed app URL (for the completion callback)
 *   RAVEN_UPLOAD_TOKEN   shared secret for the completion callback
 */

export interface RenderSpec {
  width?: number;
  height?: number;
  clipSeconds?: number;
  maxDuration?: number;
  // type defaults to 'video'; 'image' clips become Ken Burns pan/zoom shots
  clips: { url: string; type?: 'image' | 'video' }[];
  filter?: 'none' | 'warm' | 'cool' | 'mono' | 'punchy';
  caption?: string;
  musicUrl?: string;
}

export function renderConfigured(): boolean {
  return Boolean(process.env.GH_DISPATCH_TOKEN && process.env.RAVEN_UPLOAD_TOKEN);
}

export async function enqueueRenderJob(
  supabase: SupabaseClient,
  input: { propertyId: string; socialPostId?: string; spec: RenderSpec },
): Promise<{ ok: boolean; message: string; jobId?: string }> {
  const { data: job, error } = await supabase
    .from('render_jobs')
    .insert({
      property_id: input.propertyId,
      social_post_id: input.socialPostId ?? null,
      spec: input.spec,
      status: 'queued',
    })
    .select('id')
    .single();
  if (error || !job) return { ok: false, message: error?.message ?? 'Could not create job' };

  if (!renderConfigured())
    return {
      ok: true,
      jobId: job.id,
      message:
        'Job queued, but rendering is not connected yet — set GH_DISPATCH_TOKEN (GitHub token with Actions write) and RAVEN_UPLOAD_TOKEN in Vercel.',
    };

  // presigned destination for the finished MP4
  const ticket = await createStorageUploadUrl(`reel-${job.id}.mp4`, 'video/mp4');
  if (!ticket.ok || !ticket.signedUrl)
    return { ok: false, message: ticket.message ?? 'Could not create output upload URL' };

  const repo = process.env.GH_REPO || 'joelbadcock127-eng/Raven';
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.GH_DISPATCH_TOKEN}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'render-reel',
      client_payload: {
        jobId: job.id,
        spec: input.spec,
        uploadUrl: ticket.signedUrl,
        publicUrl: ticket.publicUrl,
        completeUrl: base ? `${base}/api/render/complete` : null,
        completeToken: process.env.RAVEN_UPLOAD_TOKEN,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    await supabase.from('render_jobs').update({ status: 'failed', error: `dispatch: ${text}` }).eq('id', job.id);
    return { ok: false, message: `GitHub dispatch failed (${res.status})` };
  }

  await supabase
    .from('render_jobs')
    .update({ status: 'dispatched', output_url: ticket.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', job.id);
  return { ok: true, jobId: job.id, message: 'Rendering — usually 2-5 minutes; the reel will attach itself when done.' };
}
