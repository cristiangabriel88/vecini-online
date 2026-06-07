import { describe, it, expect } from 'vitest';
import { resolvePerf, detectLowEnd } from '@/shared/store/perfStore';

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

  it('lowEnd=true auto-applies lite on prod when no pref set', () => {
    expect(resolvePerf(null, false, false, null, true)).toBe('lite');
  });

  it('explicit pref=full overrides lowEnd signal', () => {
    expect(resolvePerf('full', false, false, null, true)).toBe('full');
  });

  it('URL param overrides lowEnd signal', () => {
    expect(resolvePerf(null, false, false, 'full', true)).toBe('full');
  });

  it('prefers-reduced-motion takes priority over lowEnd (both return lite anyway)', () => {
    expect(resolvePerf(null, true, false, null, true)).toBe('lite');
  });
});

describe('detectLowEnd', () => {
  it('returns false for a capable device', () => {
    expect(detectLowEnd({ deviceMemory: 8, cpuCores: 8, saveData: false, effectiveType: '4g' })).toBe(false);
  });

  it('returns true when Save-Data is set', () => {
    expect(detectLowEnd({ deviceMemory: 8, cpuCores: 8, saveData: true, effectiveType: '4g' })).toBe(true);
  });

  it('returns true when effectiveType is 2g', () => {
    expect(detectLowEnd({ deviceMemory: 8, cpuCores: 8, saveData: false, effectiveType: '2g' })).toBe(true);
  });

  it('returns true when effectiveType is slow-2g', () => {
    expect(detectLowEnd({ deviceMemory: 8, cpuCores: 8, saveData: false, effectiveType: 'slow-2g' })).toBe(true);
  });

  it('returns true when deviceMemory is below 2 GB', () => {
    expect(detectLowEnd({ deviceMemory: 1, cpuCores: 8, saveData: false, effectiveType: '4g' })).toBe(true);
  });

  it('returns false when deviceMemory is exactly 2 GB', () => {
    expect(detectLowEnd({ deviceMemory: 2, cpuCores: 8, saveData: false, effectiveType: '4g' })).toBe(false);
  });

  it('returns true when cpuCores is 2 or fewer', () => {
    expect(detectLowEnd({ deviceMemory: 8, cpuCores: 2, saveData: false, effectiveType: '4g' })).toBe(true);
    expect(detectLowEnd({ deviceMemory: 8, cpuCores: 1, saveData: false, effectiveType: '4g' })).toBe(true);
  });

  it('returns false when cpuCores is 3', () => {
    expect(detectLowEnd({ deviceMemory: 8, cpuCores: 3, saveData: false, effectiveType: '4g' })).toBe(false);
  });

  it('returns false when deviceMemory is null (unknown, assume capable)', () => {
    expect(detectLowEnd({ deviceMemory: null, cpuCores: 4, saveData: false, effectiveType: '4g' })).toBe(false);
  });
});
