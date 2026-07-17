/**
 * Google Business Profile — publish event posts to each property's listing.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN
 *     — an OAuth client with the business.manage scope, authorised once
 *       for the Google account that owns the listings
 *   GBP_LOCATIONS — JSON map of property id → location resource name,
 *     e.g. {"ten-fifty-bakers":"locations/1234567890"}
 *
 * Until these are set, publishGbpPost() reports what's missing; the kit
 * still generates the post text for copy-paste.
 */

export function gbpConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GBP_LOCATIONS,
  );
}

async function accessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string };
  if (!json.access_token) throw new Error(json.error_description ?? 'Could not refresh Google token');
  return json.access_token;
}

export interface GbpResult {
  ok: boolean;
  message: string;
  postUrl?: string;
}

/** Publish an EVENT post to the property's Business Profile. */
export async function publishGbpPost(input: {
  propertyId: string;
  summary: string; // the post text (max ~1500 chars)
  eventTitle: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;
  linkUrl: string;
  photoUrl?: string;
}): Promise<GbpResult> {
  if (!gbpConfigured())
    return {
      ok: false,
      message:
        'Google Business Profile not connected — set GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN and GBP_LOCATIONS. The post text is ready to paste manually meanwhile.',
    };

  let locations: Record<string, string>;
  try {
    locations = JSON.parse(process.env.GBP_LOCATIONS!);
  } catch {
    return { ok: false, message: 'GBP_LOCATIONS is not valid JSON' };
  }
  const location = locations[input.propertyId];
  if (!location) return { ok: false, message: `No GBP location mapped for ${input.propertyId}` };

  const [sy, sm, sd] = input.startDate.split('-').map(Number);
  const [ey, em, ed] = input.endDate.split('-').map(Number);

  try {
    const token = await accessToken();
    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/-/${location}/localPosts`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          languageCode: 'en-AU',
          topicType: 'EVENT',
          summary: input.summary.slice(0, 1490),
          event: {
            title: input.eventTitle.slice(0, 58),
            schedule: {
              startDate: { year: sy, month: sm, day: sd },
              endDate: { year: ey, month: em, day: ed },
            },
          },
          callToAction: { actionType: 'BOOK', url: input.linkUrl },
          ...(input.photoUrl
            ? { media: [{ mediaFormat: 'PHOTO', sourceUrl: input.photoUrl }] }
            : {}),
        }),
      },
    );
    const json = (await res.json()) as { name?: string; searchUrl?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(json.error?.message ?? `GBP API ${res.status}`);
    return { ok: true, message: 'Posted to Google Business Profile', postUrl: json.searchUrl };
  } catch (err) {
    return { ok: false, message: `GBP error: ${(err as Error).message}` };
  }
}
