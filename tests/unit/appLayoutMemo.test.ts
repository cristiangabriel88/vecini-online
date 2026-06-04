import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(join(process.cwd(), 'src', 'app', 'AppLayout.tsx'), 'utf8');

describe('AppLayout shell memoization (T240)', () => {
  it('useEnabledFeatures returns a useMemo result keyed on flags and role', () => {
    const start = src.indexOf('function useEnabledFeatures');
    const end = src.indexOf('\n}', start) + 2;
    const fn = src.slice(start, end);
    expect(fn).toContain('useMemo');
    expect(fn).toContain('flags');
    expect(fn).toContain('role');
  });

  it('Sidebar is wrapped with memo()', () => {
    expect(src).toMatch(/const Sidebar\s*=\s*memo\(/);
  });

  it('BottomNav is wrapped with memo()', () => {
    expect(src).toMatch(/const BottomNav\s*=\s*memo\(/);
  });

  it('Topbar is wrapped with memo()', () => {
    expect(src).toMatch(/const Topbar\s*=\s*memo\(/);
  });

  it('Sidebar precomputes category groups with useMemo', () => {
    const start = src.indexOf('const Sidebar = memo(');
    const end = src.indexOf('\n});', start) + 4;
    const body = src.slice(start, end);
    expect(body).toContain('useMemo');
    expect(body).toContain('groups');
  });
});
