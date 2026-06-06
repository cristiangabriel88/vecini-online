import { describe, it, expect } from 'vitest';
import { resolvePerf } from '@/shared/store/perfStore';

describe('resolvePerf', () => {
  it('defaults to full on prod stage', () => {
    expect(resolvePerf(null, false, false, null)).toBe('full');
  });

  it('defaults to lite on dev stage', () => {
    expect(resolvePerf(null, false, true, null)).toBe('lite');
  });

  it('returns lite when prefers-reduced-motion is set (prod)', () => {
    expect(resolvePerf(null, true, false, null)).toBe('lite');
  });

  it('user pref lite overrides prod stage default', () => {
    expect(resolvePerf('lite', false, false, null)).toBe('lite');
  });

  it('user pref full overrides dev stage default', () => {
    expect(resolvePerf('full', false, true, null)).toBe('full');
  });

  it('user pref full overrides prefers-reduced-motion', () => {
    expect(resolvePerf('full', true, false, null)).toBe('full');
  });

  it('URL param lite overrides user pref full', () => {
    expect(resolvePerf('full', false, false, 'lite')).toBe('lite');
  });

  it('URL param full overrides dev stage and reduced-motion', () => {
    expect(resolvePerf(null, true, true, 'full')).toBe('full');
  });

  it('URL param full overrides user pref lite', () => {
    expect(resolvePerf('lite', false, false, 'full')).toBe('full');
  });

  it('invalid URL param falls through to next resolution level', () => {
    expect(resolvePerf(null, false, false, 'invalid')).toBe('full');
    expect(resolvePerf(null, false, true, 'bogus')).toBe('lite');
  });

  it('auto pref (null) with reduced-motion on dev still returns lite', () => {
    expect(resolvePerf(null, true, true, null)).toBe('lite');
  });
});
