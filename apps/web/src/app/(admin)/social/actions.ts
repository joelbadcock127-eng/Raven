'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { anthropic, MODELS, HOUSE_STYLE, stripDashes } from '@/lib/ai';
import { publishToInstagram, publishToFacebook, metaConfigured } from '@/lib/meta';
import {
  loadStyleGuide,
  guideHasContent,
  guideSystemBlock,
  guideFilterDefault,
  type StyleGuide,
} from '@/lib/styleGuides';

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
    const guide = await loadStyleGuide(supabase, propertyId);
    const res = await client.messages.create({
      model: MODELS.classify,
      max_tokens: 400,
      system:
        'You write social captions for boutique Tasmanian accommodation. Plain text ONLY, never markdown, no # headings, no asterisks, no title line. Warm, understated, no hype words, no emoji spam (one or two max), 2-4 short lines, end with a soft call to action to book direct, then 5-8 relevant hashtags on a final line. Stories get a single short line, no hashtags.' +
        HOUSE_STYLE +
        (guideHasContent(guide) ? guideSystemBlock(guide) : ''),
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
const REEL_ASPECTS = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
} as const;

export interface ReelOptions {
  filter?: 'none' | 'warm' | 'cool' | 'mono' | 'punchy';
  caption?: string; // may contain newlines
  captionPosition?: 'top' | 'middle' | 'bottom';
  captionSize?: 'small' | 'medium' | 'large';
  captionTiming?: 'whole' | 'intro';
  clipCount?: number;
  clipSeconds?: number; // 1.5–6s per clip
  transition?: 'cut' | 'fade';
  aspect?: keyof typeof REEL_ASPECTS;
  musicHint?: string; // matches against music tags/captions; defaults to direction, then style guide
  musicAssetId?: string; // explicit track choice ('' / undefined = auto match)
  noMusic?: boolean;
  source?: 'auto' | 'videos' | 'photos'; // auto = videos, topped up with photos
  folderId?: string; // restrict source clips to a folder
  mediaIds?: string[]; // hand-picked clips in play order; overrides source/clipCount
}

export async function renderReel(postId: string, options: ReelOptions = {}): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const { data: post } = await supabase
    .from('social_posts')
    .select('id, property_id, kind, direction')
    .eq('id', postId)
    .maybeSingle();
  if (!post?.property_id) return { ok: false, message: 'Post not found.' };

  const guide = await loadStyleGuide(supabase, post.property_id);
  const clipCount = Math.min(options.clipCount ?? 5, 10);
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

  // Build the clip list: hand-picked ids (in the order given) beat auto-pick.
  let clips: { url: string; type: 'image' | 'video' }[] = [];
  if (options.mediaIds?.length) {
    const { data: chosen } = await supabase
      .from('media_assets')
      .select('id, public_url, kind')
      .in('id', options.mediaIds.slice(0, 10));
    clips = options.mediaIds
      .map((id) => chosen?.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => ({ url: m!.public_url as string, type: m!.kind as 'image' | 'video' }));
  } else if (source === 'photos') {
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

  // Music: explicit track > hint matching (hint falls back to the post's
  // direction, then the property style guide's music notes) > least-used.
  let musicUrl: string | undefined;
  if (!options.noMusic) {
    if (options.musicAssetId) {
      const { data: track } = await supabase
        .from('media_assets')
        .select('public_url')
        .eq('id', options.musicAssetId)
        .maybeSingle();
      musicUrl = track?.public_url ?? undefined;
    }
    if (!musicUrl) {
      const hint = String(options.musicHint ?? post.direction ?? guide?.music ?? '').toLowerCase();
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
      musicUrl = scored[0]?.m.public_url ?? undefined;
    }
  }

  const aspect = REEL_ASPECTS[options.aspect ?? '9:16'] ?? REEL_ASPECTS['9:16'];
  const { enqueueRenderJob } = await import('@/lib/render');
  const res = await enqueueRenderJob(supabase, {
    propertyId: post.property_id,
    socialPostId: post.id,
    spec: {
      clips,
      width: aspect.width,
      height: aspect.height,
      clipSeconds: options.clipSeconds,
      transition: options.transition ?? 'cut',
      filter: options.filter ?? guideFilterDefault(guide) ?? 'warm',
      caption: options.caption,
      captionStyle: options.caption
        ? {
            position: options.captionPosition ?? 'bottom',
            size: options.captionSize ?? 'medium',
            timing: options.captionTiming ?? 'whole',
          }
        : undefined,
      musicUrl,
    },
  });
  revalidatePath('/social');
  return { ok: res.ok, message: res.message };
}

// ── Property style guides ──

export async function saveStyleGuide(guide: StyleGuide): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase.from('style_guides').upsert(
    {
      property_id: guide.property_id,
      voice: guide.voice ?? '',
      vibe: guide.vibe ?? '',
      visual: guide.visual ?? '',
      music: guide.music ?? '',
      hashtags: guide.hashtags ?? [],
      cta: guide.cta ?? '',
      avoid: guide.avoid ?? '',
      example_captions: guide.example_captions ?? [],
      source_notes: guide.source_notes ?? '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'property_id' },
  );
  if (error)
    return {
      ok: false,
      message: /style_guides/.test(error.message)
        ? 'Run the 0015 migration first (supabase/migrations/0015_style_guides.sql).'
        : error.message,
    };
  revalidatePath('/social');
  return { ok: true, message: 'Style guide saved — it now steers every caption and reel for this property.' };
}

const GUIDE_SCHEMA = {
  type: 'object',
  properties: {
    voice: { type: 'string', description: 'Tone of voice for captions, 1-2 sentences' },
    vibe: { type: 'string', description: "The feed's overall feel and mood, 1-2 sentences" },
    visual: { type: 'string', description: 'The look: light, colours, grading, framing, 1-2 sentences' },
    music: { type: 'string', description: 'Music vibe keywords for reels, e.g. "calm acoustic, soft piano"' },
    hashtags: { type: 'array', items: { type: 'string' }, description: '8-15 hashtags this account should draw from, each starting with #' },
    cta: { type: 'string', description: 'How captions should close, one sentence' },
    avoid: { type: 'string', description: 'Words, tones and moves this account never uses' },
    example_captions: { type: 'array', items: { type: 'string' }, description: '3 short example captions written in exactly this style' },
  },
  required: ['voice', 'vibe', 'visual', 'music', 'hashtags', 'cta', 'avoid', 'example_captions'],
  additionalProperties: false,
} as const;

export interface GenerateGuideInput {
  propertyId: string;
  handle?: string; // e.g. @anniemaybnb — recorded in source notes
  notes?: string; // owner's description of the account's vibe
  pastedExamples?: string; // captions pasted from the account, blank-line separated
  usePublished?: boolean; // also learn from this property's published posts
}

/**
 * Distil a style guide with AI from whatever reference material exists:
 * pasted captions from the account being replicated, the owner's own
 * description, and/or the property's already-published posts. Returns the
 * guide for review — nothing is saved until the owner hits Save.
 */
export async function generateStyleGuide(
  input: GenerateGuideInput,
): Promise<ActionResult & { guide?: StyleGuide }> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const client = anthropic();
  if (!client) return { ok: false, message: 'ANTHROPIC_API_KEY is not set.' };

  const examples = (input.pastedExamples ?? '')
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  let published: string[] = [];
  if (input.usePublished) {
    const { data } = await supabase
      .from('social_posts')
      .select('caption')
      .eq('property_id', input.propertyId)
      .eq('status', 'published')
      .neq('caption', '')
      .order('published_at', { ascending: false })
      .limit(12);
    published = (data ?? []).map((p) => p.caption as string);
  }

  if (!examples.length && !published.length && !input.notes?.trim())
    return {
      ok: false,
      message: 'Give it something to learn from: paste a few captions, describe the vibe, or tick "learn from published posts".',
    };

  const propertyNames: Record<string, string> = {
    'ten-fifty-bakers': 'Ten Fifty Bakers, off-grid luxury wilderness retreat at Bakers Beach, Tasmania',
    'prescription-pad': 'The Prescription Pad, group accommodation in Shearwater, Tasmania',
    'annie-may': 'Annie May, refined adults-only heritage guesthouse in Devonport, Tasmania',
  };

  const parts: string[] = [`Property: ${propertyNames[input.propertyId] ?? input.propertyId}`];
  if (input.handle) parts.push(`Instagram account being replicated: ${input.handle}`);
  if (input.notes?.trim()) parts.push(`Owner's description of the account's theme:\n${input.notes.trim()}`);
  if (examples.length) parts.push(`Example captions from the account:\n${examples.map((e, i) => `${i + 1}. ${e}`).join('\n')}`);
  if (published.length) parts.push(`Captions already published for this property:\n${published.map((e, i) => `${i + 1}. ${e}`).join('\n')}`);

  try {
    const res = await client.messages.create({
      model: MODELS.generate,
      max_tokens: 1500,
      system:
        'You distil social media style guides for boutique accommodation Instagram accounts. ' +
        'Study the reference material and capture what makes this feed feel like itself: the voice, the mood, the visual look, the music that would fit it, how captions close, and what it never does. ' +
        'Be specific and usable, not generic marketing speak. Example captions must be plain text, no markdown.' +
        HOUSE_STYLE,
      messages: [{ role: 'user', content: parts.join('\n\n') }],
      output_config: { format: { type: 'json_schema', schema: GUIDE_SCHEMA } },
    });
    const text = res.content.find((b) => b.type === 'text')?.text ?? '{}';
    const parsed = JSON.parse(text) as Omit<StyleGuide, 'property_id' | 'source_notes'>;
    const guide: StyleGuide = {
      property_id: input.propertyId,
      voice: stripDashes(parsed.voice ?? ''),
      vibe: stripDashes(parsed.vibe ?? ''),
      visual: stripDashes(parsed.visual ?? ''),
      music: parsed.music ?? '',
      hashtags: (parsed.hashtags ?? []).map((h) => (h.startsWith('#') ? h : `#${h}`)),
      cta: stripDashes(parsed.cta ?? ''),
      avoid: stripDashes(parsed.avoid ?? ''),
      example_captions: (parsed.example_captions ?? []).map((c) => stripDashes(c)),
      source_notes: [
        input.handle && `Distilled from ${input.handle}`,
        examples.length && `${examples.length} pasted captions`,
        published.length && `${published.length} published posts`,
      ]
        .filter(Boolean)
        .join(' · '),
    };
    return { ok: true, message: 'Guide drafted — review it, tweak anything, then Save.', guide };
  } catch (err) {
    return { ok: false, message: `Generation failed: ${(err as Error).message}` };
  }
}

export async function deletePlan(id: string): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase.from('posting_plans').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/social');
  return { ok: true, message: 'Plan deleted' };
}
