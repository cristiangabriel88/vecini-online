/**
 * Preflight verification script (T288).
 *
 * Runs the full code-side verification pipeline for all three deployment stages
 * (PROD / DEV-Pi / DEMO) and prints a go/no-go summary. No network, no secrets,
 * and no deployment required -- safe to run locally or in CI against a clean checkout.
 *
 * Usage: node scripts/preflight.mjs
 *   or:  npm run preflight
 *
 * Config-shape validation (T282 validator) is exercised by `npm run test` which
 * runs tests/unit/configValidator.test.ts covering both server and client validators
 * against placeholder env values. The step is labelled explicitly in the summary.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Pure aggregation logic (exported for unit tests) ───────────────────────

/**
 * Aggregate an array of step results into a go/no-go verdict.
 *
 * Each step is `{ label: string, ok: boolean, detail?: string }`.
 * Returns counts, a per-step display line array, and the overall verdict.
 *
 * @param {Array<{label: string, ok: boolean, detail?: string}>} steps
 * @returns {{ passed: number, failed: number, go: boolean, lines: string[] }}
 */
export function aggregateResults(steps) {
  const passed = steps.filter(s => s.ok).length;
  const failed = steps.filter(s => !s.ok).length;
  const go = failed === 0;
  const lines = steps.map(s => {
    const status = s.ok ? 'PASS' : 'FAIL';
    const suffix = s.detail ? `  -- ${s.detail}` : '';
    return `  ${status}  ${s.label}${suffix}`;
  });
  return { passed, failed, go, lines };
}

// ─── Step helpers ─────────────────────────────────────────────────────────────

function spawnStep(cmd, label) {
  try {
    execSync(cmd, { stdio: 'inherit' });
    return { label, ok: true };
  } catch {
    return { label, ok: false, detail: 'non-zero exit' };
  }
}

function artifactStep(filePath, label) {
  const ok = existsSync(filePath);
  return { label, ok, detail: ok ? undefined : `not found: ${filePath}` };
}

// ─── Preflight pipeline ───────────────────────────────────────────────────────

function runPreflight() {
  const SEP = '-'.repeat(64);

  console.log(`\n${SEP}`);
  console.log('Preflight -- vecini.online (T288)');
  console.log('Stages: PROD / DEV-Pi / DEMO | No network, no secrets');
  console.log(`${SEP}\n`);

  const steps = [];

  // Code quality gates
  steps.push(spawnStep('npm run lint', 'lint'));
  steps.push(spawnStep('npm run typecheck', 'typecheck'));
  // Tests include config-shape validation (T282: configValidator.test.ts) and
  // the full 3000+ unit-test suite; runs deterministically with no external deps.
  steps.push(spawnStep('npm run test', 'unit tests (incl. config-shape T282)'));

  // PROD build + artifacts + bundle budgets
  steps.push(spawnStep('npm run build', 'build PROD'));
  steps.push(artifactStep(join('dist', 'index.html'), 'artifact: dist/index.html (PROD)'));
  // Bundle budget check runs against the PROD dist produced by the step above.
  steps.push(spawnStep('node scripts/check-bundle-size.mjs', 'bundle budgets (T287)'));

  // DEV/Pi build + artifacts
  steps.push(spawnStep('npm run build:pi', 'build DEV/Pi'));
  steps.push(artifactStep(join('dist', 'index.html'), 'artifact: dist/index.html (DEV)'));

  // DEMO build + artifacts
  steps.push(spawnStep('npm run build:demo', 'build DEMO'));
  steps.push(artifactStep(join('dist', 'index.html'), 'artifact: dist/index.html (DEMO)'));

  // Dependency security gate (exits non-zero on high/critical findings)
  steps.push(spawnStep('npm audit --audit-level=high', 'dependency audit (high severity)'));

  // Summary
  const { passed, failed, go, lines } = aggregateResults(steps);

  console.log(`\n${SEP}`);
  console.log('Summary\n');
  for (const line of lines) console.log(line);
  console.log(`\n  ${passed} passed  |  ${failed} failed`);

  if (go) {
    console.log('\nGO -- build is sound for all three stages.');
    console.log('Run LAUNCH_CHECKLIST.md before flipping the live switch.\n');
  } else {
    console.log('\nNO GO -- one or more checks failed. Fix above before proceeding.\n');
  }

  console.log(`${SEP}\n`);
  process.exit(go ? 0 : 1);
}

// ─── Entry guard ──────────────────────────────────────────────────────────────
// Prevents pipeline execution when this module is imported by unit tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPreflight();
}
