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

const DOMAINS = [
  'tenfiftybakers.com.au',
  'theprescriptionpad.com.au',
  'anniemay.com.au',
  // GeneratePress's demo site: Prescription Pad's header hotlinks a logo from it
  'patterns.generatepress.com',
];
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
      headers: { 'user-agent': 'Mozilla/5.0 DecraMirror/1.0' },
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

// ── Pass 2: references pass 1 can't see ──
const SITE_DOMAIN = {
  'ten-fifty-bakers': 'tenfiftybakers.com.au',
  'prescription-pad': 'theprescriptionpad.com.au',
  'annie-may': 'anniemay.com.au',
};
// JSON-escaped URLs (Yoast structured data): https:\/\/domain\/wp-content\/...
const ESCAPED_RE = new RegExp(
  `https:\\\\/\\\\/(?:www\\.)?(?:${HOST_RE})\\\\/wp-(?:content|includes)\\\\/[^"'\\s<>]+`,
  'g',
);
// Files on hosts that are already gone, served from a copy in the repo.
// The Ginger font lived on the old agency's staging site.
const FALLBACKS = {
  'https://anniemay.theislandcreative.com.au/wp-content/uploads/generatepress/fonts/ginger/Ginger.woff': {
    from: path.join(ROOT, 'src', 'fonts', 'Ginger.woff'),
    name: 'ginger-Ginger.woff',
  },
};
for (const fb of Object.values(FALLBACKS)) writeFileSync(path.join(ASSETS, fb.name), readFileSync(fb.from));

// Forminator's nonce fetch, which LiteSpeed folded into a combined script
// bundle; it would POST to WordPress on every page view. `0&&` keeps the
// statement valid but never runs it (the form posts via mirror-enquiry.js).
const NONCE_RE = new RegExp(
  `jQuery\\.ajax\\(\\{url:\\s*'https://(?:www\\.)?(?:${HOST_RE})/wp-admin/admin-ajax\\.php'`,
  'g',
);

async function localizeText(text, domain) {
  text = text.replace(NONCE_RE, "0&&jQuery.ajax({url:''");
  for (const [url, fb] of Object.entries(FALLBACKS)) text = text.split(url).join(`/mirror-assets/${fb.name}`);
  for (const escaped of new Set(text.match(ESCAPED_RE) ?? [])) {
    const name = await fetchAsset(escaped.replaceAll('\\/', '/'));
    // absolute: structured data is read off-site, where a path means nothing
    if (name && domain) text = text.split(escaped).join(`https:\\/\\/${domain}\\/mirror-assets\\/${name}`);
    else if (name) text = text.split(escaped).join(`\\/mirror-assets\\/${name}`);
  }
  for (const url of new Set(text.match(ASSET_RE) ?? [])) {
    const name = await fetchAsset(url);
    if (name) text = text.split(url).join(`/mirror-assets/${name}`);
  }
  return text;
}

for (const file of htmlFiles) {
  const domain = SITE_DOMAIN[path.basename(path.dirname(file))];
  let html = await localizeText(readFileSync(file, 'utf8'), domain);
  // share images (og:image, twitter:image) must be absolute for Facebook & co
  if (domain) html = html.replace(/(<meta\b[^>]*\bcontent=")\/mirror-assets\//g, `$1https://${domain}/mirror-assets/`);
  writeFileSync(file, html);
}
// scripts and stylesheets that load further files at runtime
for (const f of readdirSync(ASSETS)) {
  if (!/\.(css|js)$/.test(f)) continue;
  const file = path.join(ASSETS, f);
  const before = readFileSync(file, 'utf8');
  const after = await localizeText(before, null);
  if (after !== before) {
    writeFileSync(file, after);
    console.log(`mirror-assets/${f} — runtime references localized`);
  }
}

const count = readdirSync(ASSETS).length;
let bytes = 0;
for (const f of readdirSync(ASSETS)) bytes += statSync(path.join(ASSETS, f)).size;
console.log(
  `\ndone: ${totalRefs} references across ${htmlFiles.length} pages → ${count} files, ${(bytes / 1024 / 1024).toFixed(1)} MB in public/mirror-assets/`,
);
