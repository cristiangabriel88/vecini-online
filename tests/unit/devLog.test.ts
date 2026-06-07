import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Files allowed to contain raw console.* calls:
//   devLog.ts                -- the logger implementation (uses console.*.bind)
//   errorReporting.ts        -- T07 hook; already guarded by import.meta.env.DEV
//   telegramWebhook.ts       -- server-side Node process, never shipped to the browser
//   clientConfigValidator.ts -- T282 startup validator; must fire in PROD (devLog is no-op there)
const ALLOWLIST = new Set([
  'src/shared/lib/devLog.ts',
  'src/shared/lib/errorReporting.ts',
  'src/shared/server/telegramWebhook.ts',
  'src/shared/lib/clientConfigValidator.ts',
]);

// Matches a direct console call: console.log(, console.warn(, etc.
// Does NOT match console.log.bind( (used in devLog itself) since .bind is not (.
const RAW_CONSOLE_RE = /console\.(log|info|warn|debug|error)\s*\(/;

function collectTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectTs(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const srcDir = join(process.cwd(), 'src');
const allFiles = collectTs(srcDir);

// Compute violators at describe-time so the test body is a single assertion.
const violations = allFiles
  .map((f) => ({ abs: f, rel: f.slice(process.cwd().length + 1).replace(/\\/g, '/') }))
  .filter(({ rel }) => !ALLOWLIST.has(rel))
  .filter(({ abs }) => RAW_CONSOLE_RE.test(readFileSync(abs, 'utf8')))
  .map(({ rel }) => rel);

describe('console.* guard (T182)', () => {
  it('src/ has TypeScript files to check', () => {
    expect(allFiles.length).toBeGreaterThan(50);
  });

  it('no raw console.* calls outside the allowlisted files', () => {
    expect(violations).toEqual([]);
  });

  it('devLog.ts is active when VITE_APP_STAGE is not prod', async () => {
    // The module is built with import.meta.env stubs in Vitest.
    // In the test environment VITE_APP_STAGE is not set to 'prod', so
    // the logger should be the real console methods (truthy functions).
    const { devLog } = await import('@/shared/lib/devLog');
    expect(typeof devLog.log).toBe('function');
    expect(typeof devLog.info).toBe('function');
    expect(typeof devLog.warn).toBe('function');
    expect(typeof devLog.debug).toBe('function');
  });

  it('allowlist covers only real files that exist', () => {
    const cwd = process.cwd();
    for (const rel of ALLOWLIST) {
      const abs = join(cwd, rel);
      expect(() => readFileSync(abs)).not.toThrow();
    }
  });
});
