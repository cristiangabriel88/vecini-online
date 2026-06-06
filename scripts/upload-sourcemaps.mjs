/**
 * T258b: upload emitted source maps to the private Supabase Storage bucket
 * "source-maps/<release>/".
 *
 * Run after `npm run build` in CI (or locally with credentials exported):
 *   VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-sourcemaps.mjs
 *
 * Silently skips when credentials are absent (local dev without live backend).
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'source-maps';
const DIST_DIR = join(process.cwd(), 'dist', 'assets');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.log('[upload-sourcemaps] No credentials -- skipping source map upload.');
  process.exit(0);
}

function resolveRelease() {
  if (process.env.VITE_APP_RELEASE) return process.env.VITE_APP_RELEASE;
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

const release = resolveRelease();
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let mapFiles;
try {
  mapFiles = readdirSync(DIST_DIR).filter((f) => f.endsWith('.js.map'));
} catch {
  console.error('[upload-sourcemaps] dist/assets not found -- run npm run build first.');
  process.exit(1);
}

if (mapFiles.length === 0) {
  console.log('[upload-sourcemaps] No .js.map files found in dist/assets -- nothing to upload.');
  process.exit(0);
}

console.log(`[upload-sourcemaps] Uploading ${mapFiles.length} maps for release ${release}...`);
let uploaded = 0;

for (const filename of mapFiles) {
  const filePath = join(DIST_DIR, filename);
  const content = readFileSync(filePath);
  const storagePath = `${release}/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, content, { contentType: 'application/json', upsert: true });

  if (error) {
    console.error(`[upload-sourcemaps] Failed to upload ${storagePath}: ${error.message}`);
  } else {
    uploaded++;
  }
}

console.log(`[upload-sourcemaps] Done. ${uploaded}/${mapFiles.length} maps uploaded.`);
