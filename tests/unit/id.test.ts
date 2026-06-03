import { describe, expect, it } from 'vitest';
import { genId } from '@/shared/lib/id';

describe('genId', () => {
  it('returns a non-empty string', () => {
    expect(typeof genId()).toBe('string');
    expect(genId().length).toBeGreaterThan(0);
  });

  it('returns unique values on repeated calls', () => {
    const ids = Array.from({ length: 20 }, genId);
    expect(new Set(ids).size).toBe(20);
  });

  it('falls back gracefully when crypto.randomUUID is unavailable (HTTP context)', () => {
    const orig = crypto.randomUUID;
    // Simulate non-secure context where randomUUID is absent.
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const id = genId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: orig, configurable: true });
    }
  });
});
