import { describe, expect, it } from 'vitest';
import { resolveAppStage } from '@/shared/lib/env';

describe('resolveAppStage', () => {
  it('returns prod when VITE_APP_STAGE=prod regardless of supabase state', () => {
    expect(resolveAppStage('prod', true)).toBe('prod');
    expect(resolveAppStage('prod', false)).toBe('prod');
  });

  it('returns dev when VITE_APP_STAGE=dev regardless of supabase state', () => {
    expect(resolveAppStage('dev', true)).toBe('dev');
    expect(resolveAppStage('dev', false)).toBe('dev');
  });

  it('returns demo when VITE_APP_STAGE=demo regardless of supabase state', () => {
    expect(resolveAppStage('demo', true)).toBe('demo');
    expect(resolveAppStage('demo', false)).toBe('demo');
  });

  it('defaults to prod when VITE_APP_STAGE is absent and supabase is configured', () => {
    expect(resolveAppStage(undefined, true)).toBe('prod');
  });

  it('defaults to demo when VITE_APP_STAGE is absent and supabase is not configured', () => {
    expect(resolveAppStage(undefined, false)).toBe('demo');
  });

  it('treats an invalid stage value as absent, applying the supabase-based default', () => {
    expect(resolveAppStage('staging', true)).toBe('prod');
    expect(resolveAppStage('staging', false)).toBe('demo');
    expect(resolveAppStage('', true)).toBe('prod');
    expect(resolveAppStage('  ', false)).toBe('demo');
  });
});
