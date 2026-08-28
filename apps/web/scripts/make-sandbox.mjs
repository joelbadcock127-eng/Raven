/**
 * Build the sandbox copy of a property's mirrored site.
 *
 * Copies public/mirror/<pid>/*.html to public/mirror-sandbox/<pid>/,
 * rewriting the decra-mirror meta slug to "sandbox--<slug>" (so edit
 * overrides save under separate keys) and internal links to stay
 * within the sandbox. Rerun any time the live mirror changes.
 *
 * Usage: node scripts/make-sandbox.mjs <property-id>
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pid = process.argv[2];
if (!pid) { console.error('usage: node scripts/make-sandbox.mjs <property-id>'); process.exit(1); }

const src = path.join(ROOT, 'public', 'mirror', pid);
const out = path.join(ROOT, 'public', 'mirror-sandbox', pid);
mkdirSync(out, { recursive: true });

for (const f of readdirSync(src).filter((f) => f.endsWith('.html'))) {
  const slug = f.replace(/\.html$/, '');
  let html = readFileSync(path.join(src, f), 'utf8');
  html = html.replace(
    new RegExp(`<meta name="decra-mirror" content="${pid}\\|${slug}">`),
    `<meta name="decra-mirror" content="${pid}|sandbox--${slug}">`,
  );
  html = html.replaceAll(`/mirror/${pid}/`, `/mirror-sandbox/${pid}/`);
  writeFileSync(path.join(out, f), html);
  console.log(`${pid}/sandbox--${slug}`);
}
