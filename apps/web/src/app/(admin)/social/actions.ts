'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { anthropic, MODELS, HOUSE_STYLE, stripDashes } from '@/lib/ai';
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

/** Replace a post's attached media (used after editing an image). */
export async function setPostMedia(id: string, mediaIds: string[]): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase
    .from('social_posts')
    .update({ media_ids: mediaIds, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/social');
  return { ok: true, message: 'Image updated' };
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

  // published_at is a 0014 column — set it separately and ignore any error so
  // publishing still records status/external_id before the migration is run
  if (ok) {
    await supabase.from('social_posts').update({ published_at: new Date().toISOString() }).eq('id', id);
  }

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
  alsoStory?: boolean; // additionally draft the same media as a story
  folderId?: string; // restrict selection to a media folder
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
  if (options.folderId) query = query.contains('folder_ids', [options.folderId]);
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
        'You write social captions for boutique Tasmanian accommodation. Plain text ONLY, never markdown, no # headings, no asterisks, no title line. Warm, understated, no hype words, no emoji spam (one or two max), 2-4 short lines, end with a soft call to action to book direct, then 5-8 relevant hashtags on a final line. Stories get a single short line, no hashtags.' +
        HOUSE_STYLE,
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
    // strip any markdown artifacts that slip through
    caption = stripDashes(
      caption
        .split('\n')
        .filter((l) => !/^#{1,3}\s/.test(l.trim()))
        .join('\n')
        .replace(/\*\*/g, ''),
    ).trim();
  }

  const { error } = await supabase.from('social_posts').insert({
    property_id: propertyId,
    kind,
    platform: options.platform ?? 'instagram',
    caption,
    direction: options.direction ?? null,
    media_ids: assets.map((a) => a.id),
    status: 'draft',
    scheduled_for: new Date().toISOString().slice(0, 10),
  });
  if (error) return { ok: false, message: error.message };

  // optional story cross-post: same lead media, first caption line only
  if (options.alsoStory && kind !== 'story') {
    await supabase.from('social_posts').insert({
      property_id: propertyId,
      kind: 'story',
      platform: options.platform ?? 'instagram',
      caption: caption.split('\n')[0] ?? '',
      media_ids: [assets[0].id],
      status: 'draft',
      scheduled_for: new Date().toISOString().slice(0, 10),
    });
  }

  revalidatePath('/social');
  return { ok: true, message: options.alsoStory && kind !== 'story' ? 'Draft + story created' : 'Draft created' };
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
  alsoStory?: boolean;
  folderId?: string | null;
  maxClips?: number;
  mode?: 'recurring' | 'once'; // once = a single scheduled post
  runOn?: string; // yyyy-mm-dd, for one-off plans
}

export async function savePlan(input: PlanInput, id?: string): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const shared = {
    property_id: input.propertyId,
    name: input.name,
    format: input.format,
    platform: input.platform,
    direction: input.direction ?? null,
    reuse_cooldown_days: input.reuseCooldownDays ?? 60,
    allow_reuse: input.allowReuse ?? true,
    also_story: input.alsoStory ?? false,
    folder_id: input.folderId ?? null,
    max_clips: Math.max(1, Math.min(input.maxClips ?? 5, 8)),
  };

  // ── One-off: draft now if the date has arrived, otherwise schedule once ──
  if (input.mode === 'once') {
    const today = new Date().toISOString().slice(0, 10);
    const runOn = input.runOn && /^\d{4}-\d{2}-\d{2}$/.test(input.runOn) ? input.runOn : today;
    if (runOn <= today) {
      const res = await draftPost(input.propertyId, input.format, {
        platform: input.platform,
        direction: input.direction || undefined,
        reuseCooldownDays: input.reuseCooldownDays,
        allowReuse: input.allowReuse,
        alsoStory: input.alsoStory,
        folderId: input.folderId ?? undefined,
      });
      return res.ok ? { ok: true, message: 'Drafted — waiting in the queue below' } : res;
    }
    const { error } = await supabase
      .from('posting_plans')
      .insert({ ...shared, mode: 'once', every_days: 1, next_run_at: runOn });
    if (error) return { ok: false, message: error.message };
    revalidatePath('/social');
    return { ok: true, message: `Scheduled for ${runOn}` };
  }

  // ── Recurring: omit `mode` so recurring plans keep working pre-migration ──
  const row = { ...shared, every_days: Math.max(1, input.everyDays) };
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
  options: {
    filter?: 'none' | 'warm' | 'cool' | 'mono' | 'punchy';
    caption?: string;
    clipCount?: number;
    musicHint?: string; // matches against music tags/captions; defaults to the post's direction
    source?: 'auto' | 'videos' | 'photos'; // auto = videos, topped up with photos
    folderId?: string; // restrict source clips to a folder
  } = {},
): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const { data: post } = await supabase
    .from('social_posts')
    .select('id, property_id, kind, direction')
    .eq('id', postId)
    .maybeSingle();
  if (!post?.property_id) return { ok: false, message: 'Post not found.' };

  const clipCount = Math.min(options.clipCount ?? 5, 8);
  const source = options.source ?? 'auto';

  const pick = async (kind: 'video' | 'image', limit: number) => {
    let q = supabase
      .from('media_assets')
      .select('public_url, kind')
      .eq('property_id', post.property_id)
      .eq('kind', kind)
      .eq('retired', false)
      .not('tags', 'cs', '{rendered-reel}');
    if (options.folderId) q = q.contains('folder_ids', [options.folderId]);
    const { data } = await q
      .order('times_used', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []).map((m) => ({ url: m.public_url as string, type: kind }));
  };

  // Build the clip list per source. Ken Burns lets a reel be all stills.
  let clips: { url: string; type: 'image' | 'video' }[] = [];
  if (source === 'photos') {
    clips = await pick('image', clipCount);
  } else if (source === 'videos') {
    clips = await pick('video', clipCount);
  } else {
    const vids = await pick('video', clipCount);
    clips = vids;
    if (vids.length < clipCount) clips = [...vids, ...(await pick('image', clipCount - vids.length))];
  }
  if (!clips.length)
    return {
      ok: false,
      message:
        source === 'videos'
          ? 'No source videos in the library for this property. Try Photos to build a reel from stills.'
          : 'No source media in the library for this property.',
    };

  // Music selection follows the style direction: hint words are matched
  // against each track's tags/caption; best match wins, least-used breaks
  // ties. No hint → least-used rotation. No matching mood → least-used.
  const hint = String(options.musicHint ?? post.direction ?? '').toLowerCase();
  const hintWords = hint.split(/[^a-z0-9]+/).filter((w: string) => w.length > 2);
  const { data: allMusic } = await supabase
    .from('media_assets')
    .select('id, public_url, tags, caption, times_used, property_id')
    .contains('tags', ['music'])
    .eq('retired', false)
    .or(`property_id.eq.${post.property_id},property_id.is.null`)
    .order('times_used', { ascending: true })
    .limit(24);
  const scored = (allMusic ?? [])
    .map((m) => {
      const hay = `${(m.tags ?? []).join(' ')} ${m.caption ?? ''}`.toLowerCase();
      return { m, score: hintWords.filter((w) => hay.includes(w)).length };
    })
    .sort((a, b) => b.score - a.score || a.m.times_used - b.m.times_used);
  const music = scored.length ? [scored[0].m] : [];

  const { enqueueRenderJob } = await import('@/lib/render');
  const res = await enqueueRenderJob(supabase, {
    propertyId: post.property_id,
    socialPostId: post.id,
    spec: {
      clips,
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
