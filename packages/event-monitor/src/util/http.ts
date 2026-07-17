/**
 * Polite fetch for scraping: per-host throttling, identifiable UA,
 * timeouts and exponential-backoff retries. Mirrors the API-safeguard
 * philosophy in the brief (section 12) even for non-API sources.
 */
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 RavenEventMonitor/0.1';

const MIN_INTERVAL_MS = 1500; // per host
const lastRequestAt = new Map<string, number>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle(host: string): Promise<void> {
  const last = lastRequestAt.get(host) ?? 0;
  const wait = last + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(host, Date.now());
}

export async function politeFetch(url: string, retries = 3): Promise<string> {
  const host = new URL(url).host;
  for (let attempt = 0; ; attempt++) {
    await throttle(host);
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
        redirect: 'follow',
        signal: AbortSignal.timeout(25_000),
      });
      if (res.ok) return await res.text();
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const retryAfter = Number(res.headers.get('retry-after')) * 1000 || 0;
        await sleep(Math.max(retryAfter, 2 ** attempt * 2000));
        continue;
      }
      throw new Error(`HTTP ${res.status} for ${url}`);
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(2 ** attempt * 2000);
    }
  }
}
