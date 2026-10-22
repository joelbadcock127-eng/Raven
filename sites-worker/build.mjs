/**
 * Copies the cloned sites' static files from the Decra app into dist/,
 * which wrangler uploads as the worker's static assets.
 */
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, '..', 'apps', 'web', 'public');
const DIST = path.join(HERE, 'dist');

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
// mirror/: page copies, used only when Decra doesn't answer
for (const item of ['mirror', 'mirror-assets', 'mirror-editor.js', 'mirror-enquiry.js'])
  cpSync(path.join(PUBLIC, item), path.join(DIST, item), { recursive: true });
console.log('assets copied to', DIST);
