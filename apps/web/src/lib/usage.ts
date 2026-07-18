/**
 * Live usage/cost from provider APIs, used by Settings when configured.
 *
 * Env vars (both optional — Settings falls back to computed estimates):
 *   ANTHROPIC_ADMIN_KEY   an Anthropic *Admin* API key (sk-ant-admin…) from
 *                         console.anthropic.com → Settings → Organization →
 *                         Admin keys. Grants read access to the org's
 *                         Usage & Cost API. Different from ANTHROPIC_API_KEY.
 *   CLOUDFLARE_API_TOKEN  the Cloudflare API token (the "token value" saved
 *                         when the R2 S3 keys were created works if it has
 *                         R2 read; Analytics read is ideal). Used with
 *                         R2_ACCOUNT_ID for the GraphQL analytics API.
 */

export interface LiveCosts {
  anthropicUsd: number | null; // month-to-date
  r2StorageBytes: number | null; // current payload size
  r2ClassAOps: number | null; // month-to-date writes
  r2ClassBOps: number | null; // month-to-date reads
}

function monthStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

async function anthropicCost(): Promise<number | null> {
  const key = process.env.ANTHROPIC_ADMIN_KEY;
  if (!key) return null;
  try {
    const url = `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${encodeURIComponent(monthStartIso())}&bucket_width=1d&limit=31`;
    const res = await fetch(url, {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Array<{ results?: Array<{ amount?: { value?: string } | number | string }> }>;
    };
    let total = 0;
    for (const bucket of json.data ?? []) {
      for (const r of bucket.results ?? []) {
        const a = r.amount as { value?: string } | number | string | undefined;
        const v = typeof a === 'object' && a ? Number(a.value) : Number(a);
        if (!Number.isNaN(v)) total += v;
      }
    }
    return total;
  } catch {
    return null;
  }
}

async function r2Analytics(): Promise<Pick<LiveCosts, 'r2StorageBytes' | 'r2ClassAOps' | 'r2ClassBOps'>> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.R2_ACCOUNT_ID;
  const none = { r2StorageBytes: null, r2ClassAOps: null, r2ClassBOps: null };
  if (!token || !account) return none;
  try {
    const query = `
      query($account: String!, $since: Date!) {
        viewer { accounts(filter: { accountTag: $account }) {
          storage: r2StorageAdaptiveGroups(limit: 1, orderBy: [date_DESC], filter: { date_geq: $since }) {
            max { payloadSize }
          }
          ops: r2OperationsAdaptiveGroups(limit: 10, filter: { date_geq: $since }) {
            dimensions { actionStatus actionType }
            sum { requests }
          }
        } }
      }`;
    const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { account, since: monthStartIso().slice(0, 10) },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return none;
    const json = (await res.json()) as {
      data?: {
        viewer?: {
          accounts?: Array<{
            storage?: Array<{ max?: { payloadSize?: number } }>;
            ops?: Array<{ dimensions?: { actionType?: string }; sum?: { requests?: number } }>;
          }>;
        };
      };
    };
    const acct = json.data?.viewer?.accounts?.[0];
    if (!acct) return none;
    const classA = ['PutObject', 'CopyObject', 'CompleteMultipartUpload', 'CreateMultipartUpload', 'ListObjects', 'PutBucketCors'];
    let a = 0;
    let b = 0;
    for (const op of acct.ops ?? []) {
      const n = op.sum?.requests ?? 0;
      if (classA.some((t) => (op.dimensions?.actionType ?? '').startsWith(t))) a += n;
      else b += n;
    }
    return {
      r2StorageBytes: acct.storage?.[0]?.max?.payloadSize ?? null,
      r2ClassAOps: a,
      r2ClassBOps: b,
    };
  } catch {
    return none;
  }
}

export async function fetchLiveCosts(): Promise<LiveCosts> {
  const [anthropicUsd, r2] = await Promise.all([anthropicCost(), r2Analytics()]);
  return { anthropicUsd, ...r2 };
}

export function liveConfigured(): { anthropic: boolean; r2: boolean } {
  return {
    anthropic: Boolean(process.env.ANTHROPIC_ADMIN_KEY),
    r2: Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.R2_ACCOUNT_ID),
  };
}
