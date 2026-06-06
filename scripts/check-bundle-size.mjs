/**
 * Bundle size budget gate (T260).
 * Baselines measured 2026-06-06. Only ratchet upward.
 *
 * Run after `vite build`: node scripts/check-bundle-size.mjs
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist/assets';

// pattern -> limit in kibibytes (raw, not gzip)
const BUDGETS = [
  { pattern: /^main-[^.]+\.js$/, label: 'main entry', limitKb: 200 },
  { pattern: /^react-vendor-[^.]+\.js$/, label: 'react-vendor', limitKb: 230 },
  { pattern: /^supabase-[^.]+\.js$/, label: 'supabase', limitKb: 230 },
  { pattern: /^xlsx-[^.]+\.js$/, label: 'xlsx', limitKb: 450 },
  { pattern: /^legal-[^.]+\.js$/, label: 'legal', limitKb: 475 },
  { pattern: /^i18n-[^.]+\.js$/, label: 'i18n', limitKb: 70 },
  { pattern: /^apartmentsStore-[^.]+\.js$/, label: 'apartmentsStore', limitKb: 75 },
];

const files = readdirSync(DIST).filter(f => f.endsWith('.js') && !f.endsWith('.map'));
let failed = false;

console.log('\nBundle size budget check (T260 baseline: 2026-06-06)\n');
console.log('  Status    Chunk                     Size       Limit');
console.log('  ------    -----                     ----       -----');

for (const { pattern, label, limitKb } of BUDGETS) {
  const match = files.find(f => pattern.test(f));
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

console.log('');
if (failed) {
  console.error('Bundle size budget exceeded. Investigate with: npm run build:analyze');
  process.exit(1);
}
console.log('All bundle budgets OK.');
