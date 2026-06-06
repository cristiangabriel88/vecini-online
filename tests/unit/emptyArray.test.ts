import { describe, expect, it } from 'vitest';
import { emptyArray } from '@/shared/lib/emptyArray';

describe('emptyArray', () => {
  it('returns an empty array', () => {
    expect(emptyArray<string>()).toHaveLength(0);
  });

  it('returns the same reference on every call (stable identity)', () => {
    expect(emptyArray<string>()).toBe(emptyArray<string>());
    expect(emptyArray<number>()).toBe(emptyArray<number>());
    expect(emptyArray<{ id: string }>()).toBe(emptyArray<{ id: string }>());
  });

  it('returns the same reference across different generic types', () => {
    const a = emptyArray<string>();
    const b = emptyArray<number>();
    expect(a).toBe(b);
  });

  it('is frozen (immutable at runtime)', () => {
    expect(Object.isFrozen(emptyArray<string>())).toBe(true);
  });
});
