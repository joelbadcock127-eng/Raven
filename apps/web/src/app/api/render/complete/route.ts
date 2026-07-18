import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Callback from the GitHub Actions renderer: job status + output. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    token?: string;
    jobId?: string;
    status?: string;
    outputUrl?: string;
    error?: string;
  };
  if (!process.env.RAVEN_UPLOAD_TOKEN || body.token !== process.env.RAVEN_UPLOAD_TOKEN)
    return NextResponse.json({ ok: false }, { status: 401 });
  if (!body.jobId || !body.status) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  await supabase
    .from('render_jobs')
    .update({
      status: body.status,
      output_url: body.outputUrl ?? undefined,
      error: body.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.jobId);

  // when done: register the reel in the media library and attach it to the post
  if (body.status === 'done' && body.outputUrl) {
    const { data: job } = await supabase
      .from('render_jobs')
      .select('property_id, social_post_id')
      .eq('id', body.jobId)
      .maybeSingle();

    const { data: asset } = await supabase
      .from('media_assets')
      .insert({
        property_id: job?.property_id ?? null,
        kind: 'video',
        storage_provider: 'r2',
        storage_path: new URL(body.outputUrl).pathname.replace(/^\//, ''),
        public_url: body.outputUrl,
        file_name: `reel-${body.jobId}.mp4`,
        mime_type: 'video/mp4',
        tags: ['rendered-reel'],
      })
      .select('id')
      .single();

    if (job?.social_post_id && asset) {
      await supabase
        .from('social_posts')
        .update({ media_ids: [asset.id], updated_at: new Date().toISOString() })
        .eq('id', job.social_post_id);
    }
  }

  return NextResponse.json({ ok: true });
}
