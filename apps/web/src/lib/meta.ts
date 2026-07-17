/**
 * Instagram/Facebook publishing via the Meta Graph API.
 *
 * Required env vars (Vercel → Settings → Environment Variables):
 *   META_ACCESS_TOKEN   — long-lived Page access token with instagram_content_publish
 *   IG_USER_ID          — the Instagram Business account ID
 *   FB_PAGE_ID          — (optional) Facebook Page ID for FB posts
 *
 * Without them, publishing is disabled and posts stay 'approved' for manual
 * publishing — the UI shows exactly what to copy where.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export function metaConfigured(): boolean {
  return Boolean(process.env.META_ACCESS_TOKEN && process.env.IG_USER_ID);
}

interface PublishResult {
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
}

async function graph(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({ ...params, access_token: process.env.META_ACCESS_TOKEN! });
  const res = await fetch(`${GRAPH}/${path}`, { method: 'POST', body });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { message?: string } | undefined;
    throw new Error(err?.message ?? `Graph API ${res.status}`);
  }
  return json;
}

/** Poll a media container until Meta finishes processing it (videos take a while). */
async function waitForContainer(containerId: string, timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    const res = await fetch(
      `${GRAPH}/${containerId}?fields=status_code&access_token=${process.env.META_ACCESS_TOKEN}`,
    );
    const json = (await res.json()) as { status_code?: string };
    if (json.status_code === 'FINISHED') return;
    if (json.status_code === 'ERROR') throw new Error('Meta could not process the media');
    if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for Meta to process media');
    await new Promise((r) => setTimeout(r, 4000));
  }
}

/**
 * Publish a single-image post, carousel, or reel to Instagram.
 * mediaUrls must be publicly reachable (the Supabase media bucket is).
 */
export async function publishToInstagram(input: {
  kind: 'post' | 'carousel' | 'reel' | 'story';
  caption: string;
  mediaUrls: string[];
}): Promise<PublishResult> {
  try {
    if (!metaConfigured()) return { ok: false, error: 'META_ACCESS_TOKEN / IG_USER_ID not set' };
    const ig = process.env.IG_USER_ID!;
    let containerId: string;

    if (input.kind === 'reel') {
      const c = await graph(`${ig}/media`, {
        media_type: 'REELS',
        video_url: input.mediaUrls[0],
        caption: input.caption,
      });
      containerId = String(c.id);
      await waitForContainer(containerId);
    } else if (input.kind === 'carousel' && input.mediaUrls.length > 1) {
      const children: string[] = [];
      for (const url of input.mediaUrls.slice(0, 10)) {
        const c = await graph(`${ig}/media`, { image_url: url, is_carousel_item: 'true' });
        children.push(String(c.id));
      }
      const c = await graph(`${ig}/media`, {
        media_type: 'CAROUSEL',
        children: children.join(','),
        caption: input.caption,
      });
      containerId = String(c.id);
    } else if (input.kind === 'story') {
      const c = await graph(`${ig}/media`, {
        media_type: 'STORIES',
        ...(input.mediaUrls[0].match(/\.(mp4|mov)($|\?)/i)
          ? { video_url: input.mediaUrls[0] }
          : { image_url: input.mediaUrls[0] }),
      });
      containerId = String(c.id);
      await waitForContainer(containerId);
    } else {
      const c = await graph(`${ig}/media`, {
        image_url: input.mediaUrls[0],
        caption: input.caption,
      });
      containerId = String(c.id);
    }

    const pub = await graph(`${ig}/media_publish`, { creation_id: containerId });
    const mediaId = String(pub.id);

    // fetch the permalink for the UI
    let url: string | undefined;
    try {
      const res = await fetch(
        `${GRAPH}/${mediaId}?fields=permalink&access_token=${process.env.META_ACCESS_TOKEN}`,
      );
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

/** Publish a photo or link post to the Facebook Page. */
export async function publishToFacebook(input: {
  caption: string;
  mediaUrls: string[];
}): Promise<PublishResult> {
  try {
    if (!process.env.META_ACCESS_TOKEN || !process.env.FB_PAGE_ID)
      return { ok: false, error: 'META_ACCESS_TOKEN / FB_PAGE_ID not set' };
    const page = process.env.FB_PAGE_ID;
    const json = await graph(`${page}/photos`, {
      url: input.mediaUrls[0],
      message: input.caption,
    });
    return { ok: true, id: String(json.post_id ?? json.id) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
