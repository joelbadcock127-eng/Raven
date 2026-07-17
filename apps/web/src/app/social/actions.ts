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
    for (const mid of post.media_ids) {
      await supabase.rpc('increment_media_use', { asset_id: mid }).then(
        () => undefined,
        () => undefined, // rpc optional; ignore if missing
      );
    }
  }

  revalidatePath('/social');
  return { ok, message: results.join(' · ') };
}

/**
 * Draft a new post/reel from the media library with an AI caption.
 * Used by the "Draft one now" button and the cadence cron.
 */
export async function draftPost(propertyId: string, kind: 'post' | 'reel'): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  // least-used, newest-first media of the right type
  const { data: assets } = await supabase
    .from('media_assets')
    .select('id, kind, public_url, tags, caption, times_used')
    .eq('property_id', propertyId)
    .eq('kind', kind === 'reel' ? 'video' : 'image')
    .order('times_used', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(kind === 'reel' ? 1 : 3);

  if (!assets?.length)
    return {
      ok: false,
      message: `No ${kind === 'reel' ? 'videos' : 'images'} in the media library for this property yet — upload some in the Media tab.`,
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
        'You write Instagram captions for boutique Tasmanian accommodation. Warm, understated, no hype words, no emoji spam (one or two max), 2-4 short lines, end with a soft call to action to book direct, then 5-8 relevant hashtags on a final line.',
      messages: [
        {
          role: 'user',
          content: `Property: ${propertyNames[propertyId] ?? propertyId}\nMedia notes: ${assets
            .map((a) => [a.caption, ...(a.tags ?? [])].filter(Boolean).join(', ') || 'no notes')
            .join(' | ')}\nFormat: ${kind}`,
        },
      ],
    });
    caption = res.content.find((b) => b.type === 'text')?.text?.trim() ?? '';
  }

  const { error } = await supabase.from('social_posts').insert({
    property_id: propertyId,
    kind,
    platform: 'instagram',
    caption,
    media_ids: assets.map((a) => a.id),
    status: 'draft',
    scheduled_for: new Date().toISOString().slice(0, 10),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/social');
  return { ok: true, message: 'Draft created' };
}
