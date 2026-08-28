import { lodgifyConfigured, probe } from '@/lib/lodgify';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Lodgify API diagnostics — which endpoints this account's key can reach.
 *
 * Read-only by construction (the probe helper only ever issues GET), so it
 * cannot change anything in the PMS. Runs only with ?run=1 so a stray page
 * load never burns rate limit.
 *
 * Status reading: 200 = available · 400/422 = exists, wants other params
 * (still proof the route exists) · 401/403 = exists but not permitted for
 * this key · 404 = no such endpoint.
 */

const TFB = 726148; // Ten Fifty Bakers
const RXP = 726149; // The Prescription Pad

/** Quote-endpoint exploration: does a quote accept a promo code, and does
 *  applying one actually change the total? Fixed future dates keep runs
 *  comparable. Still read-only — a quote reserves nothing. */
const Q_ARRIVE = '2026-11-10';
const Q_DEPART = '2026-11-13';
const CODE_PARAMS = ['promotionCode', 'promoCode', 'promotion', 'couponCode', 'coupon', 'discountCode', 'voucherCode'];

function quotePath(propertyId: number, roomTypeId: number, extra = ''): string {
  return (
    `/v2/quote/${propertyId}?arrival=${Q_ARRIVE}&departure=${Q_DEPART}` +
    `&roomTypes%5B0%5D.Id=${roomTypeId}&roomTypes%5B0%5D.People=2${extra}`
  );
}

const CANDIDATES: Array<{ group: string; paths: string[] }> = [
  {
    group: 'Known-good baseline',
    paths: ['/v2/properties?includeCount=false', '/v2/reservations/bookings?page=1&size=1'],
  },
  {
    group: 'Promotions / discount codes (the question)',
    paths: [
      '/v2/promotions',
      '/v1/promotions',
      '/v2/discounts',
      '/v1/discounts',
      '/v2/coupons',
      '/v1/coupons',
      '/v2/vouchers',
      '/v2/promotion-codes',
      '/v2/promocodes',
      `/v2/properties/${TFB}/promotions`,
      `/v2/properties/${TFB}/discounts`,
      `/v1/properties/${TFB}/promotions`,
    ],
  },
  {
    group: 'Rates & pricing (possible discount vehicle)',
    paths: [
      '/v2/rates',
      '/v2/rates/calendar',
      '/v2/rates/savings',
      '/v1/rates',
      `/v2/rates/calendar?RoomTypeId=${TFB}&HouseId=${TFB}`,
      `/v2/properties/${TFB}/rates`,
      `/v2/properties/${TFB}`,
      `/v2/properties/${RXP}`,
    ],
  },
  {
    group: 'Quotes (where a promo code would be applied)',
    paths: [
      `/v2/quote/${TFB}`,
      `/v1/quote/${TFB}`,
      '/v2/quotes',
    ],
  },
  {
    group: 'Account / settings / webhooks',
    paths: ['/v2/settings', '/v1/settings', '/v2/subscriptions', '/v1/webhooks/list', '/v2/webhooks'],
  },
];

function tone(status: number): { label: string; color: string } {
  if (status === 200) return { label: 'available', color: 'var(--jade, #1a7f5a)' };
  if (status === 400 || status === 422) return { label: 'exists · needs params', color: '#b8860b' };
  if (status === 401 || status === 403) return { label: 'exists · not permitted', color: '#b8860b' };
  if (status === 404) return { label: 'not found', color: 'var(--ink-mute)' };
  if (status === 429) return { label: 'rate limited — rerun', color: '#c0392b' };
  return { label: 'error', color: '#c0392b' };
}

export default async function LodgifyApiPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run } = await searchParams;
  const configured = lodgifyConfigured();

  const results: Array<{ group: string; rows: Awaited<ReturnType<typeof probe>>[] }> = [];
  if (run === '1' && configured) {
    for (const c of CANDIDATES) {
      const rows = [];
      for (const p of c.paths) rows.push(await probe(p));
      results.push({ group: c.group, rows });
    }
  }

  // Quote mode: find a room type, quote it clean, then quote it again with a
  // promo code under each plausible parameter name — and with a deliberately
  // fake code as the control. If a real code changes the total (or a fake one
  // errors) we have a way to VALIDATE codes against Lodgify.
  if (run === 'quote' && configured) {
    const targets: Array<{ pid: number; label: string }> = [
      { pid: TFB, label: 'Ten Fifty Bakers' },
      { pid: RXP, label: 'The Prescription Pad' },
    ];
    for (const { pid, label } of targets) {
      const propRes = await probe(`/v2/properties/${pid}`);
      let roomTypeId: number = pid;
      try {
        const j = JSON.parse(propRes.snippet.length > 380 ? '{}' : propRes.snippet);
        const rt = j?.rooms?.[0]?.id ?? j?.room_types?.[0]?.id;
        if (rt) roomTypeId = Number(rt);
      } catch {
        /* snippet truncated — fall back to the property id */
      }
      const rows = [propRes, await probe(quotePath(pid, roomTypeId))];
      for (const param of CODE_PARAMS) {
        rows.push(await probe(quotePath(pid, roomTypeId, `&${param}=NWTRS`)));
      }
      rows.push(await probe(quotePath(pid, roomTypeId, '&promotionCode=ZZZ-DEFINITELY-FAKE')));
      results.push({ group: `Quote + promo code — ${label} (${Q_ARRIVE} to ${Q_DEPART})`, rows });
    }
  }

  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <h1 className="display-lg" style={{ marginBottom: 8 }}>Lodgify API diagnostics</h1>
        <p className="caption" style={{ maxWidth: 640, color: 'var(--ink-mute)' }}>
          Which Lodgify endpoints this account&apos;s API key can actually reach. Read-only — this page
          only ever issues GET requests, so nothing in the PMS can change. Used to establish what
          Decra can automate versus what has to happen in the Lodgify web app.
        </p>
      </header>

      {!configured && (
        <div className="card" style={{ padding: 18, marginBottom: 18 }}>
          <p className="caption">LODGIFY_API_KEY is not set in this environment.</p>
        </div>
      )}

      {run !== '1' && run !== 'quote' ? (
        <div className="card" style={{ padding: 22 }}>
          <p className="caption" style={{ marginBottom: 14 }}>
            Probing makes ~{CANDIDATES.reduce((n, c) => n + c.paths.length, 0)} throttled API calls.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a className="pill-primary" href="?run=1" style={{ textDecoration: 'none' }}>
              Run endpoint probe
            </a>
            <a className="pill-primary" href="?run=quote" style={{ textDecoration: 'none' }}>
              Run quote + promo-code probe
            </a>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {results.map((g) => (
            <section key={g.group} className="card" style={{ padding: 22 }}>
              <h2 className="heading-md" style={{ marginBottom: 12 }}>{g.group}</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {g.rows.map((r) => {
                  const t = tone(r.status);
                  return (
                    <div key={r.path} style={{ borderTop: '1px solid var(--hairline)', paddingTop: 9 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <code style={{ fontSize: 12.5, flex: 1, minWidth: 220 }}>{r.path}</code>
                        <span className="tnum caption">{r.status}</span>
                        <span className="micro-cap" style={{ color: t.color }}>{t.label}</span>
                      </div>
                      {r.snippet && (
                        <pre
                          style={{
                            fontSize: 11,
                            color: 'var(--ink-mute)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            margin: '6px 0 0',
                            maxHeight: 260,
                            overflow: 'hidden',
                          }}
                        >
                          {r.snippet}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
