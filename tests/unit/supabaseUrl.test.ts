import { describe, expect, it } from 'vitest';
import { PRODUCTION_SUPABASE_URL, resolveSupabaseUrl } from '@/shared/lib/supabaseUrl';

describe('resolveSupabaseUrl', () => {
  it('keeps a public Supabase URL unchanged', () => {
    expect(resolveSupabaseUrl('https://abcxyzproject.supabase.co', 'prod')).toBe(
      'https://abcxyzproject.supabase.co',
    );
  });

  it('falls back from a private Pi URL on prod-like builds', () => {
    expect(resolveSupabaseUrl('http://100.92.246.15:54321', 'prod')).toBe(
      PRODUCTION_SUPABASE_URL,
    );
  });

  it('falls back from a private Pi URL on a public runtime even if the stage is mis-set', () => {
    expect(resolveSupabaseUrl('http://100.92.246.15:54321', 'dev', 'hub.vecini.online')).toBe(
      PRODUCTION_SUPABASE_URL,
    );
  });

  it('does not override private URLs in dev/demo mode', () => {
    expect(resolveSupabaseUrl('http://100.92.246.15:54321', 'dev')).toBe(
      'http://100.92.246.15:54321',
    );
    expect(resolveSupabaseUrl('http://100.92.246.15:54321', 'demo')).toBe(
      'http://100.92.246.15:54321',
    );
  });

  it('treats an unspecified stage as prod-like for safety', () => {
    expect(resolveSupabaseUrl('http://100.92.246.15:54321')).toBe(PRODUCTION_SUPABASE_URL);
  });

  it('keeps a private URL on private runtime hosts', () => {
    expect(resolveSupabaseUrl('http://100.92.246.15:54321', 'dev', '100.92.246.15')).toBe(
      'http://100.92.246.15:54321',
    );
  });
});
