import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { readLastDemoRole } from '@/app/router';

// Mock isDemo so the router module loads without env side-effects
vi.mock('@/shared/lib/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/env')>();
  return {
    ...actual,
    isDemo: vi.fn().mockReturnValue(false),
    getStage: vi.fn().mockReturnValue('prod'),
    isProd: vi.fn().mockReturnValue(true),
    isDev: vi.fn().mockReturnValue(false),
  };
});

const STORAGE_KEY = 'iv.demo.role';

describe('readLastDemoRole', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns admin when nothing is stored', () => {
    expect(readLastDemoRole()).toBe('admin');
  });

  it('returns the stored role when it is a valid Role', () => {
    localStorage.setItem(STORAGE_KEY, 'presedinte');
    expect(readLastDemoRole()).toBe('presedinte');
  });

  it.each(['admin', 'presedinte', 'comitet', 'cenzor', 'proprietar', 'chirias', 'super_admin'] as const)(
    'accepts all 7 valid roles (%s)',
    (role) => {
      localStorage.setItem(STORAGE_KEY, role);
      expect(readLastDemoRole()).toBe(role);
    },
  );

  it('falls back to admin for an unknown stored value', () => {
    localStorage.setItem(STORAGE_KEY, 'hacker');
    expect(readLastDemoRole()).toBe('admin');
  });

  it('falls back to admin for an empty string', () => {
    localStorage.setItem(STORAGE_KEY, '');
    expect(readLastDemoRole()).toBe('admin');
  });
});

describe('enterDemo localStorage persistence', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('key iv.demo.role round-trips through readLastDemoRole', () => {
    localStorage.setItem('iv.demo.role', 'chirias');
    expect(readLastDemoRole()).toBe('chirias');
  });

  it('readLastDemoRole returns the last role written', () => {
    localStorage.setItem('iv.demo.role', 'cenzor');
    expect(readLastDemoRole()).toBe('cenzor');
  });
});
