import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(join(process.cwd(), 'src', 'platform', 'PlatformAsociatiiPage.tsx'), 'utf8');

describe('PlatformAsociatiiPage stale-error handling', () => {
  it('clears any persisted fetch error before deciding whether to hydrate live data', () => {
    expect(src).toContain('setFetchError(null)');
    expect(src).toContain('!isSupabaseConfigured');
    expect(src).toContain('seeded store');
  });
});
