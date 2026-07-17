/**
 * Meta Marketing API — boost a published Instagram post as a paid ad.
 *
 * Required env vars (on top of META_ACCESS_TOKEN from lib/meta.ts):
 *   META_AD_ACCOUNT_ID  — e.g. act_1234567890
 *   FB_PAGE_ID          — the Facebook Page linked to the IG account
 *
 * The token needs the ads_management permission. Until these are set,
 * boostPost() reports exactly what's missing and does nothing.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export function adsConfigured(): boolean {
  return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID && process.env.FB_PAGE_ID);
}

export interface BoostResult {
  ok: boolean;
  message: string;
  campaignId?: string;
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

/**
 * Boost an existing published IG media as a geo-targeted ad.
 * Budget is per-day in whole AUD; runs until endDate (the event start).
 * Created PAUSED so it can be reviewed in Ads Manager before spending.
 */
export async function boostPost(input: {
  igMediaId: string;
  name: string;
  dailyBudgetAud: number;
  endDate: string; // yyyy-mm-dd
  lat?: number;
  lon?: number;
  radiusKm?: number;
}): Promise<BoostResult> {
  if (!adsConfigured())
    return {
      ok: false,
      message:
        'Meta Ads not connected — set META_ACCESS_TOKEN (with ads_management), META_AD_ACCOUNT_ID and FB_PAGE_ID in Vercel env vars.',
    };
  const act = process.env.META_AD_ACCOUNT_ID!;

  try {
    const campaign = await graph(`${act}/campaigns`, {
      name: `Raven · ${input.name}`,
      objective: 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      special_ad_categories: '[]',
    });

    const targeting: Record<string, unknown> = input.lat && input.lon
      ? {
          geo_locations: {
            custom_locations: [
              { latitude: input.lat, longitude: input.lon, radius: input.radiusKm ?? 80, distance_unit: 'kilometer' },
            ],
          },
        }
      : { geo_locations: { countries: ['AU'], regions: [{ key: '1024' }] } }; // Tasmania

    const adset = await graph(`${act}/adsets`, {
      name: `Raven · ${input.name} · adset`,
      campaign_id: String(campaign.id),
      daily_budget: String(Math.round(input.dailyBudgetAud * 100)),
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'LINK_CLICKS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      end_time: `${input.endDate}T23:59:59+10:00`,
      targeting: JSON.stringify(targeting),
      status: 'PAUSED',
    });

    const creative = await graph(`${act}/adcreatives`, {
      name: `Raven · ${input.name} · creative`,
      object_id: process.env.FB_PAGE_ID!,
      instagram_user_id: process.env.IG_USER_ID ?? '',
      source_instagram_media_id: input.igMediaId,
    });

    await graph(`${act}/ads`, {
      name: `Raven · ${input.name} · ad`,
      adset_id: String(adset.id),
      creative: JSON.stringify({ creative_id: creative.id }),
      status: 'PAUSED',
    });

    return {
      ok: true,
      message: 'Boost created (paused) — review and activate it in Meta Ads Manager.',
      campaignId: String(campaign.id),
    };
  } catch (err) {
    return { ok: false, message: `Meta Ads error: ${(err as Error).message}` };
  }
}
