import { describe, it, expect } from 'vitest';
import { isFormDirty } from '@/shared/lib/useUnsavedGuard';

describe('isFormDirty (T267 dirty-tracking logic)', () => {
  it('returns false when flat objects are identical', () => {
    const a = { name: 'Ion', etaj: '2', scara: 'A' };
    expect(isFormDirty(a, { ...a })).toBe(false);
  });

  it('returns true when a field value changes', () => {
    const initial = { name: 'Ion', etaj: '2' };
    const current = { name: 'Ion', etaj: '3' };
    expect(isFormDirty(current, initial)).toBe(true);
  });

  it('returns false for two empty objects', () => {
    expect(isFormDirty({}, {})).toBe(false);
  });

  it('returns false for equal arrays', () => {
    expect(isFormDirty(['a', 'b'], ['a', 'b'])).toBe(false);
  });

  it('returns true when an array element is added', () => {
    expect(isFormDirty([1, 2, 3], [1, 2])).toBe(true);
  });

  it('returns true when an array element is removed', () => {
    expect(isFormDirty([1], [1, 2])).toBe(true);
  });

  it('returns true when a nested field changes', () => {
    const initial = { persons: [{ name: 'Ion', email: '' }] };
    const current = { persons: [{ name: 'Gheorghe', email: '' }] };
    expect(isFormDirty(current, initial)).toBe(true);
  });

  it('returns false for equal nested objects', () => {
    const obj = { persons: [{ name: 'Ion', role: 'proprietar' }] };
    expect(isFormDirty({ ...obj }, { ...obj })).toBe(false);
  });

  it('returns false for equal primitive strings', () => {
    expect(isFormDirty('abc', 'abc')).toBe(false);
  });

  it('returns true for different primitive strings', () => {
    expect(isFormDirty('abc', 'xyz')).toBe(true);
  });

  it('returns true when a field is added', () => {
    const initial: Record<string, string> = { name: 'Ion' };
    const current: Record<string, string> = { name: 'Ion', extra: 'x' };
    expect(isFormDirty(current, initial)).toBe(true);
  });

  it('returns true when a field is removed', () => {
    const initial: Record<string, string> = { name: 'Ion', extra: 'x' };
    const current: Record<string, string> = { name: 'Ion' };
    expect(isFormDirty(current, initial)).toBe(true);
  });

  it('returns true when array element order differs', () => {
    expect(isFormDirty([2, 1], [1, 2])).toBe(true);
  });

  it('returns false when comparing the same array reference', () => {
    const arr = [{ id: '1', name: 'Ion' }];
    expect(isFormDirty(arr, arr)).toBe(false);
  });

  it('returns true when a boolean field flips', () => {
    expect(isFormDirty({ active: false }, { active: true })).toBe(true);
  });

  it('returns false when all boolean fields match', () => {
    expect(isFormDirty({ active: true }, { active: true })).toBe(false);
  });
});
