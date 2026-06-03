#!/usr/bin/env node
// Prepares dist-platform/ for the Netlify platform (hub) site deploy.
//
// Why a separate output dir?
//   netlify-platform.toml uses "/* -> /index.html 200" (the standard Netlify SPA
//   pattern). Rewiring to /platform.html (a non-standard name) caused CDN edges to
//   serve platform.html with text/html for /assets/* requests, breaking ES module
//   loading. Copying platform.html to index.html in an isolated dir fixes this while
//   keeping the shared dist/assets/ files intact.
//
// Output layout:
//   dist-platform/
//     index.html        <- copy of dist/platform.html (platform SPA shell)
//     assets/           <- copy of dist/assets/ (all Vite-emitted bundles)
//     _headers          <- copy of dist/_headers (CSP headers, if generated)

import { cpSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const src = 'dist';
const dest = 'dist-platform';

if (!existsSync(join(src, 'platform.html'))) {
  console.error(`ERROR: ${src}/platform.html not found. Run "npm run build" first.`);
  process.exit(1);
}

mkdirSync(dest, { recursive: true });

// platform.html becomes index.html so the standard Netlify SPA fallback works.
copyFileSync(join(src, 'platform.html'), join(dest, 'index.html'));
console.log(`  Copied platform.html -> ${dest}/index.html`);

// Copy the shared assets directory.
cpSync(join(src, 'assets'), join(dest, 'assets'), { recursive: true });
const assetCount = readdirSync(join(dest, 'assets')).length;
console.log(`  Copied ${assetCount} files -> ${dest}/assets/`);

// Copy _headers if the Vite CSP plugin generated one.
const headersPath = join(src, '_headers');
if (existsSync(headersPath)) {
  copyFileSync(headersPath, join(dest, '_headers'));
  console.log(`  Copied _headers`);
}

// Verify: index.html must reference at least one /assets/platform-*.js bundle.
// This catches cases where the platform entry was not included in the Vite build.
const html = readFileSync(join(dest, 'index.html'), 'utf-8');
const platformJsAssets = [...html.matchAll(/\/assets\/(platform-[^"' ]+\.js)/g)].map(m => m[1]);
const platformCssAssets = [...html.matchAll(/\/assets\/(platform-[^"' ]+\.css)/g)].map(m => m[1]);

if (platformJsAssets.length === 0) {
  console.error(`ERROR: ${dest}/index.html has no /assets/platform-*.js references.`);
  console.error('  The platform entry point may be missing from the Vite build.');
  process.exit(1);
}

console.log('  Asset references verified in index.html:');
[...platformJsAssets, ...platformCssAssets].forEach(a => console.log(`    /assets/${a}`));

// Sanity-check: every referenced asset file must actually exist in dist-platform/assets/.
const missing = [...platformJsAssets, ...platformCssAssets].filter(
  a => !existsSync(join(dest, 'assets', a))
);
if (missing.length > 0) {
  console.error('ERROR: Referenced assets are missing from dist-platform/assets/:');
  missing.forEach(a => console.error(`  /assets/${a}`));
  process.exit(1);
}

console.log(`\ndist-platform/ is ready for Netlify deploy (publish = "dist-platform").`);
console.log('Note: verify MIME types after deploy with:');
console.log(`  curl -sI https://hub.vecini.online/assets/${platformJsAssets[0]} | grep content-type`);
console.log('  Expected: content-type: text/javascript or application/javascript');
