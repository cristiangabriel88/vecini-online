/**
 * Bundle size budget gate (T260, T287).
 * T260 baselines measured 2026-06-06. T287 initial-route sweep measured 2026-06-07.
 * Only ratchet limits upward; never loosen them.
 *
 * Run after `vite build`: node scripts/check-bundle-size.mjs
 *
 * Cold-load baseline -- prod build, raw bytes before gzip (2026-06-07):
 *   Initial JS (blocking critical path):
 *     main entry   166.2 kB
 *     react-vendor 204.4 kB
 *     supabase     202.8 kB
 *     i18n          53.8 kB
 *     query         27.2 kB
 *     TOTAL        654.4 kB  (~196 kB gzip @ 0.30 ratio)
 *   Render-blocking CSS (injected as <link rel="stylesheet"> in index.html):
 *     legal CSS    151.5 kB  (consent banner + legal-page Tailwind output)
 *     main CSS      14.6 kB
 *     TOTAL        166.1 kB  (~50 kB gzip)
 *   Grand total blocking: ~820 kB raw / ~246 kB gzip.
 *   On slow 3G (400 kbps): ~5 s to first interactive (gzip path).
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist/assets';

// Per-chunk limits (raw kB, not gzip). Sorted by feature domain.
const BUDGETS = [
  { pattern: /^main-[^.]+\.js$/, label: 'main entry', limitKb: 200 },
  { pattern: /^react-vendor-[^.]+\.js$/, label: 'react-vendor', limitKb: 230 },
  { pattern: /^supabase-[^.]+\.js$/, label: 'supabase', limitKb: 230 },
  { pattern: /^query-[^.]+\.js$/, label: 'query', limitKb: 35 },
  { pattern: /^i18n-[^.]+\.js$/, label: 'i18n', limitKb: 70 },
  { pattern: /^xlsx-[^.]+\.js$/, label: 'xlsx', limitKb: 450 },
  { pattern: /^legal-[^.]+\.js$/, label: 'legal', limitKb: 475 },
  { pattern: /^apartmentsStore-[^.]+\.js$/, label: 'apartmentsStore', limitKb: 75 },
];

// Chunks that form the JS blocking critical path: synchronously imported by
// main.tsx and its eager dependency tree before the app can become interactive.
// Measured 2026-06-07: ~654 kB. Ceiling: 720 kB.
const INITIAL_JS_PATTERNS = [
  /^main-[^.]+\.js$/,
  /^react-vendor-[^.]+\.js$/,
  /^supabase-[^.]+\.js$/,
  /^i18n-[^.]+\.js$/,
  /^query-[^.]+\.js$/,
];
const INITIAL_JS_LIMIT_KB = 720;

// CSS files injected as <link rel="stylesheet"> in index.html (render-blocking).
// legal CSS contains the consent-banner styles (needed for first paint) plus the
// Tailwind output for legal pages. Measured 2026-06-07: ~166 kB. Ceiling: 200 kB.
const INITIAL_CSS_PATTERNS = [
  /^main-[^.]+\.css$/,
  /^legal-[^.]+\.css$/,
];
const INITIAL_CSS_LIMIT_KB = 200;

const allFiles = readdirSync(DIST).filter(f => !f.endsWith('.map'));
const jsFiles = allFiles.filter(f => f.endsWith('.js'));
const cssFiles = allFiles.filter(f => f.endsWith('.css'));

let failed = false;

console.log('\nBundle size budget check (T260: 2026-06-06 | T287 initial-route: 2026-06-07)\n');
console.log('  Status    Chunk                     Size       Limit');
console.log('  ------    -----                     ----       -----');

for (const { pattern, label, limitKb } of BUDGETS) {
  const match = jsFiles.find(f => pattern.test(f));
  if (!match) {
    console.warn(`  MISSING   ${label.padEnd(26)} (no chunk found matching ${pattern})`);
    continue;
  }
  const bytes = statSync(join(DIST, match)).size;
  const kb = bytes / 1024;
  const ok = kb <= limitKb;
  const status = ok ? 'OK     ' : 'EXCEEDS';
  const flag = ok ? '' : '  <-- BUDGET EXCEEDED';
  console.log(`  ${status}   ${label.padEnd(26)} ${kb.toFixed(1).padStart(7)} kB   ${limitKb} kB${flag}`);
  if (!ok) failed = true;
}

// Initial-route totals (T287)
console.log('\n  --- Initial-route totals (T287) ---');

let initialJsKb = 0;
for (const pattern of INITIAL_JS_PATTERNS) {
  const match = jsFiles.find(f => pattern.test(f));
  if (match) initialJsKb += statSync(join(DIST, match)).size / 1024;
}
const jsOk = initialJsKb <= INITIAL_JS_LIMIT_KB;
console.log(
  `  ${jsOk ? 'OK     ' : 'EXCEEDS'}   ${'initial JS (blocking)'.padEnd(26)} ${initialJsKb.toFixed(1).padStart(7)} kB   ${INITIAL_JS_LIMIT_KB} kB${jsOk ? '' : '  <-- BUDGET EXCEEDED'}`,
);
if (!jsOk) failed = true;

let initialCssKb = 0;
for (const pattern of INITIAL_CSS_PATTERNS) {
  const match = cssFiles.find(f => pattern.test(f));
  if (match) initialCssKb += statSync(join(DIST, match)).size / 1024;
}
const cssOk = initialCssKb <= INITIAL_CSS_LIMIT_KB;
console.log(
  `  ${cssOk ? 'OK     ' : 'EXCEEDS'}   ${'initial CSS (render-blocking)'.padEnd(26)} ${initialCssKb.toFixed(1).padStart(7)} kB   ${INITIAL_CSS_LIMIT_KB} kB${cssOk ? '' : '  <-- BUDGET EXCEEDED'}`,
);
if (!cssOk) failed = true;

console.log('');
if (failed) {
  console.error('Bundle size budget exceeded. Investigate with: npm run build:analyze');
  process.exit(1);
}
console.log('All bundle budgets OK.');
