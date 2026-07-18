/**
 * Localize mirrored-site assets so the mirrors survive a DNS cutover.
 *
 * The mirror pages hotlink CSS/JS/images from the live WordPress domains.
 * Once one of those domains is pointed at Vercel, the WordPress origin is
 * no longer reachable at that name and every hotlink would 404. This script
 * downloads every same-domain asset referenced by the mirrors (plus assets
 * referenced inside downloaded CSS — fonts, background images) into
 * public/mirror-assets/ and rewrites all references.
 *
 * Usage: node scripts/localize-mirror-assets.mjs
 * Idempotent — already-localized pages have no matching URLs left.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url))); // apps/web
const MIRROR = path.join(ROOT, 'public', 'mirror');
const ASSETS = path.join(ROOT, 'public', 'mirror-assets');
const MAX_BYTES = 20 * 1024 * 1024; // skip anything bigger

const DOMAINS = ['tenfiftybakers.com.au', 'theprescriptionpad.com.au', 'anniemay.com.au'];
const HOST_RE = DOMAINS.map((d) => d.replace(/\./g, '\\.')).join('|');
// same-domain asset URLs (wp-content / wp-includes / wp-json etc. — anything file-ish)
const ASSET_RE = new RegExp(
  `https://(?:www\\.)?(?:${HOST_RE})/wp-(?:content|includes)/[^"'\\s)\\\\<>]+`,
  'g',
);

mkdirSync(ASSETS, { recursive: true });

/** Stable short local name for an asset URL (query string included → versions differ). */
function localName(url) {
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 10);
  const base = (new URL(url).pathname.split('/').pop() || 'asset')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(-80);
  return `${hash}-${base}`;
}

const downloaded = new Map(); // url -> local name (or null if failed)

async function fetchAsset(url) {
  if (downloaded.has(url)) return downloaded.get(url);
  const name = localName(url);
  const dest = path.join(ASSETS, name);
  if (existsSync(dest) && statSync(dest).size > 0) {
    downloaded.set(url, name);
    return name;
  }
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 RavenMirror/1.0' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error(`too large (${buf.length})`);

    // CSS may reference further assets (fonts, images) — localize those too
    if (/\.css(\?|$)/.test(url)) {
      let css = buf.toString('utf8');
      const refs = new Set();
      for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
        const ref = m[1].trim();
        if (ref.startsWith('data:') || ref.startsWith('#')) continue;
        try {
          refs.add(new URL(ref, url).href);
        } catch {
          /* unparsable ref — leave as-is */
        }
      }
      for (const refUrl of refs) {
        if (!new RegExp(`^https://(www\\.)?(${HOST_RE})/`).test(refUrl)) continue;
        const refName = await fetchAsset(refUrl.split('#')[0]);
        if (refName) {
          // replace both absolute and original relative spellings
          css = css.split(refUrl).join(`/mirror-assets/${refName}`);
          const rel = refUrl.startsWith(new URL('.', url).href)
            ? refUrl.slice(new URL('.', url).href.length)
            : null;
          if (rel) css = css.split(rel).join(`/mirror-assets/${refName}`);
        }
      }
      writeFileSync(dest, css);
    } else {
      writeFileSync(dest, buf);
    }
    downloaded.set(url, name);
    return name;
  } catch (err) {
    console.warn(`  ! ${url}: ${err.message}`);
    downloaded.set(url, null);
    return null;
  }
}

const htmlFiles = [];
for (const pid of readdirSync(MIRROR)) {
  const dir = path.join(MIRROR, pid);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir)) if (f.endsWith('.html')) htmlFiles.push(path.join(dir, f));
}

let totalRefs = 0;
for (const file of htmlFiles) {
  let html = readFileSync(file, 'utf8');
  const urls = [...new Set(html.match(ASSET_RE) ?? [])];
  let replaced = 0;
  for (const url of urls) {
    const name = await fetchAsset(url);
    if (name) {
      html = html.split(url).join(`/mirror-assets/${name}`);
      replaced++;
    }
  }
  writeFileSync(file, html);
  totalRefs += replaced;
  console.log(`${path.relative(MIRROR, file)} — ${replaced}/${urls.length} assets localized`);
}

const count = readdirSync(ASSETS).length;
let bytes = 0;
for (const f of readdirSync(ASSETS)) bytes += statSync(path.join(ASSETS, f)).size;
console.log(
  `\ndone: ${totalRefs} references across ${htmlFiles.length} pages → ${count} files, ${(bytes / 1024 / 1024).toFixed(1)} MB in public/mirror-assets/`,
);
