'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { anthropic, MODELS } from '@/lib/ai';
import { publishToInstagram, publishToFacebook, metaConfigured } from '@/lib/meta';

export interface ActionResult {
  ok: boolean;
  message: string;
}

export async function updatePost(
  id: string,
  patch: { caption?: string; scheduled_for?: string | null; kind?: string; platform?: string },
): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase
    .from('social_posts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/social');
  return { ok: true, message: 'Updated' };
}

export async function setPostStatus(id: string, status: 'approved' | 'dismissed' | 'draft'): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase
    .from('social_posts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/social');
  return { ok: true, message: status === 'approved' ? 'Approved' : 'Updated' };
}

/** Publish an approved post through the Meta Graph API. */
export async function publishPost(id: string): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const { data: post } = await supabase
    .from('social_posts')
    .select('id, kind, platform, caption, media_ids, status')
    .eq('id', id)
    .maybeSingle();
  if (!post) return { ok: false, message: 'Post not found.' };
  if (!metaConfigured())
    return {
      ok: false,
      message:
        'Meta API not connected yet — set META_ACCESS_TOKEN and IG_USER_ID in Vercel env vars. Until then, copy the caption and media manually.',
    };

  const { data: media } = await supabase
    .from('media_assets')
    .select('id, public_url')
    .in('id', post.media_ids ?? []);
  const urls = (post.media_ids ?? [])
    .map((mid: string) => media?.find((m) => m.id === mid)?.public_url)
    .filter(Boolean) as string[];
  if (urls.length === 0) return { ok: false, message: 'Post has no media attached.' };

  await supabase.from('social_posts').update({ status: 'publishing' }).eq('id', id);

  const kind = post.kind === 'carousel' || urls.length > 1 ? 'carousel' : post.kind;
  const results: string[] = [];
  let ok = true;
  let externalId: string | undefined;
  let externalUrl: string | undefined;

  if (post.platform === 'instagram' || post.platform === 'both') {
    const r = await publishToInstagram({ kind: kind as 'post' | 'carousel' | 'reel' | 'story', caption: post.caption, mediaUrls: urls });
    ok &&= r.ok;
    if (r.ok) {
      externalId = r.id;
      externalUrl = r.url;
      results.push('Instagram ✓');
    } else results.push(`Instagram ✗ ${r.error}`);
  }
  if (post.platform === 'facebook' || post.platform === 'both') {
    const r = await publishToFacebook({ caption: post.caption, mediaUrls: urls });
    ok &&= r.ok;
    results.push(r.ok ? 'Facebook ✓' : `Facebook ✗ ${r.error}`);
  }

  await supabase
    .from('social_posts')
    .update({
      status: ok ? 'published' : 'failed',
      external_id: externalId ?? null,
      external_url: externalUrl ?? null,
      error: ok ? null : results.join(' · '),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (ok && post.media_ids?.length) {
    // reuse-rule bookkeeping: bump use count and stamp last use
    for (const mid of post.media_ids) {
      const { data: asset } = await supabase
        .from('media_assets')
        .select('times_used')
        .eq('id', mid)
        .maybeSingle();
      await supabase
        .from('media_assets')
        .update({
          times_used: (asset?.times_used ?? 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', mid);
    }
  }

  revalidatePath('/social');
  return { ok, message: results.join(' · ') };
}

export interface DraftOptions {
  platform?: 'instagram' | 'facebook' | 'both';
  direction?: string; // freeform style guidance
  reuseCooldownDays?: number; // skip assets used within this window
  allowReuse?: boolean; // false = only never-used assets
  planId?: string;
}

/**
 * Draft a new post/reel/story from the media library with an AI caption.
 * Used by the "Draft one now" buttons, posting plans and campaign kits.
 * Asset selection is deterministic: not retired, outside the reuse
 * cooldown, least-used first, newest first.
 */
export async function draftPost(
  propertyId: string,
  kind: 'post' | 'reel' | 'story' | 'carousel',
  options: DraftOptions = {},
): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const wantVideo = kind === 'reel';
  const limit = kind === 'reel' || kind === 'story' ? 1 : kind === 'carousel' ? 5 : 3;

  let query = supabase
    .from('media_assets')
    .select('id, kind, public_url, tags, caption, times_used, last_used_at')
    .eq('property_id', propertyId)
    .eq('kind', wantVideo ? 'video' : 'image')
    .eq('retired', false);
  if (options.allowReuse === false) query = query.eq('times_used', 0);
  const { data: allAssets } = await query
    .order('times_used', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit * 4);

  const cooldownMs = (options.reuseCooldownDays ?? 0) * 86_400_000;
  const assets = (allAssets ?? [])
    .filter((a) => !cooldownMs || !a.last_used_at || Date.now() - Date.parse(a.last_used_at) > cooldownMs)
    .slice(0, limit);

  if (!assets.length)
    return {
      ok: false,
      message: `No eligible ${wantVideo ? 'videos' : 'images'} for this property — upload media or relax the reuse rules.`,
    };

  const client = anthropic();
  let caption = '';
  const propertyNames: Record<string, string> = {
    'ten-fifty-bakers': 'Ten Fifty Bakers — off-grid luxury wilderness retreat at Bakers Beach, Tasmania',
    'prescription-pad': 'The Prescription Pad — group accommodation in Shearwater, Tasmania',
    'annie-may': 'Annie May — refined adults-only heritage guesthouse in Devonport, Tasmania',
  };
  if (client) {
    const res = await client.messages.create({
      model: MODELS.classify,
      max_tokens: 400,
      system:
        'You write social captions for boutique Tasmanian accommodation. Warm, understated, no hype words, no emoji spam (one or two max), 2-4 short lines, end with a soft call to action to book direct, then 5-8 relevant hashtags on a final line. Stories get a single short line, no hashtags.',
      messages: [
        {
          role: 'user',
          content: `Property: ${propertyNames[propertyId] ?? propertyId}\nMedia notes: ${assets
            .map((a) => [a.caption, ...(a.tags ?? [])].filter(Boolean).join(', ') || 'no notes')
            .join(' | ')}\nFormat: ${kind}${options.direction ? `\nOwner direction: ${options.direction}` : ''}`,
        },
      ],
    });
    caption = res.content.find((b) => b.type === 'text')?.text?.trim() ?? '';
  }

  const { error } = await supabase.from('social_posts').insert({
    property_id: propertyId,
    kind,
    platform: options.platform ?? 'instagram',
    caption,
    media_ids: assets.map((a) => a.id),
    status: 'draft',
    scheduled_for: new Date().toISOString().slice(0, 10),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/social');
  return { ok: true, message: 'Draft created' };
}

// ── Posting plans ──

export interface PlanInput {
  propertyId: string;
  name: string;
  format: 'post' | 'reel' | 'story' | 'carousel';
  platform: 'instagram' | 'facebook' | 'both';
  everyDays: number;
  direction?: string;
  reuseCooldownDays?: number;
  allowReuse?: boolean;
}

export async function savePlan(input: PlanInput, id?: string): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const row = {
    property_id: input.propertyId,
    name: input.name,
    format: input.format,
    platform: input.platform,
    every_days: Math.max(1, input.everyDays),
    direction: input.direction ?? null,
    reuse_cooldown_days: input.reuseCooldownDays ?? 60,
    allow_reuse: input.allowReuse ?? true,
  };
  const { error } = id
    ? await supabase.from('posting_plans').update(row).eq('id', id)
    : await supabase.from('posting_plans').insert(row);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/social');
  return { ok: true, message: 'Plan saved' };
}

export async function setPlanActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase.from('posting_plans').update({ active }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/social');
  return { ok: true, message: active ? 'Plan resumed' : 'Plan paused' };
}

/**
 * Assemble a multi-clip reel for a draft post: picks eligible source videos
 * from the property's library and hands them to the ffmpeg render pipeline
 * (GitHub Actions). The finished MP4 attaches itself to the post.
 */
export async function renderReel(
  postId: string,
  options: { filter?: 'none' | 'warm' | 'cool' | 'mono' | 'punchy'; caption?: string; clipCount?: number } = {},
): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const { data: post } = await supabase
    .from('social_posts')
    .select('id, property_id, kind')
    .eq('id', postId)
    .maybeSingle();
  if (!post?.property_id) return { ok: false, message: 'Post not found.' };

  const { data: videos } = await supabase
    .from('media_assets')
    .select('public_url')
    .eq('property_id', post.property_id)
    .eq('kind', 'video')
    .eq('retired', false)
    .not('tags', 'cs', '{rendered-reel}')
    .order('times_used', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(Math.min(options.clipCount ?? 5, 8));
  if (!videos?.length) return { ok: false, message: 'No source videos in the library for this property.' };

  // optional music: an audio/video asset tagged "music"
  const { data: music } = await supabase
    .from('media_assets')
    .select('public_url')
    .eq('property_id', post.property_id)
    .contains('tags', ['music'])
    .limit(1);

  const { enqueueRenderJob } = await import('@/lib/render');
  const res = await enqueueRenderJob(supabase, {
    propertyId: post.property_id,
    socialPostId: post.id,
    spec: {
      clips: videos.map((v) => ({ url: v.public_url })),
      filter: options.filter ?? 'warm',
      caption: options.caption,
      musicUrl: music?.[0]?.public_url,
    },
  });
  revalidatePath('/social');
  return { ok: res.ok, message: res.message };
}

export async function deletePlan(id: string): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase.from('posting_plans').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/social');
  return { ok: true, message: 'Plan deleted' };
}
