/**
 * Instagram/Facebook publishing via the Meta Graph API.
 *
 * Two connection routes, auto-detected from the token prefix:
 *
 *  - "Instagram API with Instagram Login" (recommended, Instagram-only):
 *    token starts with "IG", calls go to graph.instagram.com. No Facebook
 *    Page needed. Tokens last 60 days; the nightly cron refreshes the token
 *    and stores the newest copy in app_config (key 'ig_token'), so the env
 *    var only ever holds the *first* token — set it once and forget it.
 *
 *  - Facebook-login route (Page token, starts with "EAA"): calls go to
 *    graph.facebook.com, token never expires, also unlocks Facebook posts.
 *
 * Required env vars (Vercel → Settings → Environment Variables):
 *   META_ACCESS_TOKEN   — the access token from either route
 *   IG_USER_ID          — the Instagram professional account ID
 *   FB_PAGE_ID          — (optional) Facebook Page ID, Facebook-login route only
 *
 * Without them, publishing is disabled and posts stay 'approved' for manual
 * publishing — the UI shows exactly what to copy where.
 */

import { supabaseAdmin } from './supabase';

const FB_GRAPH = 'https://graph.facebook.com/v21.0';
const IG_GRAPH = 'https://graph.instagram.com/v21.0';

export function metaConfigured(): boolean {
  return Boolean(process.env.META_ACCESS_TOKEN && process.env.IG_USER_ID);
}

/** Instagram-login tokens start with "IG…"; Facebook Page tokens with "EAA…". */
function isInstagramLoginToken(token: string): boolean {
  return token.startsWith('IG');
}

function graphBase(token: string): string {
  return isInstagramLoginToken(token) ? IG_GRAPH : FB_GRAPH;
}

/**
 * The token to call Meta with. The env var seeds it; once the refresh cron
 * has run, the newest token lives in app_config ('ig_token') and wins.
 * Cached for a minute so publish flows don't hammer the table.
 */
let tokenCache: { token: string; at: number } | null = null;

export async function activeToken(): Promise<string | null> {
  const envToken = process.env.META_ACCESS_TOKEN;
  if (!envToken) return null;
  if (tokenCache && Date.now() - tokenCache.at < 60_000) return tokenCache.token;

  let token = envToken;
  // only the Instagram-login route rotates tokens; the DB copy is the
  // refreshed descendant of the env token
  if (isInstagramLoginToken(envToken)) {
    const supabase = supabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'ig_token')
          .maybeSingle();
        const stored = (data?.value as { token?: string } | null)?.token;
        if (stored) token = stored;
      } catch {
        /* pre-0017 migration — env token still works for its 60 days */
      }
    }
  }
  tokenCache = { token, at: Date.now() };
  return token;
}

/**
 * Keep the Instagram-login token alive forever: refresh it weekly (Meta
 * requires the token to be ≥24h old and not expired; each refresh grants a
 * fresh 60 days) and store the newest copy in app_config. Safe to call every
 * cron run — it no-ops on the Facebook route, when nothing is configured,
 * or when the last refresh is recent. Never throws.
 */
export async function refreshInstagramTokenIfDue(): Promise<{ refreshed: boolean; note: string }> {
  const token = await activeToken();
  if (!token) return { refreshed: false, note: 'not configured' };
  if (!isInstagramLoginToken(token)) return { refreshed: false, note: 'facebook-route token, never expires' };

  const supabase = supabaseAdmin();
  if (!supabase) return { refreshed: false, note: 'supabase not configured' };

  try {
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'ig_token')
      .maybeSingle();
    const stored = (data?.value ?? {}) as { refreshed_at?: string };
    const age = stored.refreshed_at ? Date.now() - Date.parse(stored.refreshed_at) : Infinity;
    if (age < 7 * 86_400_000) return { refreshed: false, note: 'refreshed recently' };

    const res = await fetch(
      `${IG_GRAPH.replace(/\/v[\d.]+$/, '')}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
    );
    const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message?: string } };
    if (!res.ok || !json.access_token) {
      // a token under 24h old refuses to refresh — fine, next run gets it
      return { refreshed: false, note: json.error?.message ?? `refresh HTTP ${res.status}` };
    }

    await supabase.from('app_config').upsert(
      {
        key: 'ig_token',
        value: {
          token: json.access_token,
          refreshed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + (json.expires_in ?? 5_184_000) * 1000).toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );
    tokenCache = null;
    return { refreshed: true, note: 'token refreshed for another 60 days' };
  } catch (err) {
    return { refreshed: false, note: (err as Error).message };
  }
}

interface PublishResult {
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
}

async function graph(token: string, path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${graphBase(token)}/${path}`, { method: 'POST', body });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { message?: string } | undefined;
    throw new Error(err?.message ?? `Graph API ${res.status}`);
  }
  return json;
}

/** Poll a media container until Meta finishes processing it (videos take a while). */
async function waitForContainer(token: string, containerId: string, timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    const res = await fetch(`${graphBase(token)}/${containerId}?fields=status_code&access_token=${token}`);
    const json = (await res.json()) as { status_code?: string };
    if (json.status_code === 'FINISHED') return;
    if (json.status_code === 'ERROR') throw new Error('Meta could not process the media');
    if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for Meta to process media');
    await new Promise((r) => setTimeout(r, 4000));
  }
}

/**
 * Publish a single-image post, carousel, or reel to Instagram.
 * mediaUrls must be publicly reachable (the R2 media bucket is).
 */
export async function publishToInstagram(input: {
  kind: 'post' | 'carousel' | 'reel' | 'story';
  caption: string;
  mediaUrls: string[];
}): Promise<PublishResult> {
  try {
    const token = await activeToken();
    if (!token || !process.env.IG_USER_ID) return { ok: false, error: 'META_ACCESS_TOKEN / IG_USER_ID not set' };
    const ig = process.env.IG_USER_ID;
    let containerId: string;

    if (input.kind === 'reel') {
      const c = await graph(token, `${ig}/media`, {
        media_type: 'REELS',
        video_url: input.mediaUrls[0],
        caption: input.caption,
      });
      containerId = String(c.id);
      await waitForContainer(token, containerId);
    } else if (input.kind === 'carousel' && input.mediaUrls.length > 1) {
      const children: string[] = [];
      for (const url of input.mediaUrls.slice(0, 10)) {
        const c = await graph(token, `${ig}/media`, { image_url: url, is_carousel_item: 'true' });
        children.push(String(c.id));
      }
      const c = await graph(token, `${ig}/media`, {
        media_type: 'CAROUSEL',
        children: children.join(','),
        caption: input.caption,
      });
      containerId = String(c.id);
    } else if (input.kind === 'story') {
      const c = await graph(token, `${ig}/media`, {
        media_type: 'STORIES',
        ...(input.mediaUrls[0].match(/\.(mp4|mov)($|\?)/i)
          ? { video_url: input.mediaUrls[0] }
          : { image_url: input.mediaUrls[0] }),
      });
      containerId = String(c.id);
      await waitForContainer(token, containerId);
    } else {
      const c = await graph(token, `${ig}/media`, {
        image_url: input.mediaUrls[0],
        caption: input.caption,
      });
      containerId = String(c.id);
    }

    const pub = await graph(token, `${ig}/media_publish`, { creation_id: containerId });
    const mediaId = String(pub.id);

    // fetch the permalink for the UI
    let url: string | undefined;
    try {
      const res = await fetch(`${graphBase(token)}/${mediaId}?fields=permalink&access_token=${token}`);
      const json = (await res.json()) as { permalink?: string };
      url = json.permalink;
    } catch {
      /* permalink is nice-to-have */
    }
    return { ok: true, id: mediaId, url };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Pull performance for a published Instagram media item. likes/comments are
 * plain fields; reach/saved come from the insights edge. Returns nulls for
 * anything Meta won't give for that media type rather than throwing.
 */
export async function getMediaInsights(
  mediaId: string,
): Promise<{ reach: number | null; saves: number | null; likes: number | null; comments: number | null }> {
  const token = await activeToken();
  const out = { reach: null as number | null, saves: null as number | null, likes: null as number | null, comments: null as number | null };
  if (!token) return out;
  try {
    const fieldRes = await fetch(`${graphBase(token)}/${mediaId}?fields=like_count,comments_count&access_token=${token}`);
    const fields = (await fieldRes.json()) as { like_count?: number; comments_count?: number };
    out.likes = fields.like_count ?? null;
    out.comments = fields.comments_count ?? null;
  } catch {
    /* ignore */
  }
  try {
    const insRes = await fetch(`${graphBase(token)}/${mediaId}/insights?metric=reach,saved&access_token=${token}`);
    const ins = (await insRes.json()) as { data?: Array<{ name: string; values: Array<{ value: number }> }> };
    for (const m of ins.data ?? []) {
      const v = m.values?.[0]?.value ?? null;
      if (m.name === 'reach') out.reach = v;
      if (m.name === 'saved') out.saves = v;
    }
  } catch {
    /* insights not available for this media type */
  }
  return out;
}

/** Publish a photo or link post to the Facebook Page (Facebook-login route only). */
export async function publishToFacebook(input: {
  caption: string;
  mediaUrls: string[];
}): Promise<PublishResult> {
  try {
    const token = await activeToken();
    if (!token || !process.env.FB_PAGE_ID)
      return { ok: false, error: 'META_ACCESS_TOKEN / FB_PAGE_ID not set' };
    if (isInstagramLoginToken(token))
      return {
        ok: false,
        error:
          'This connection is Instagram-only (Instagram-login token). Facebook posting needs the Facebook-login route — see docs/meta-api-setup.md.',
      };
    const page = process.env.FB_PAGE_ID;
    const json = await graph(token, `${page}/photos`, {
      url: input.mediaUrls[0],
      message: input.caption,
    });
    return { ok: true, id: String(json.post_id ?? json.id) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
