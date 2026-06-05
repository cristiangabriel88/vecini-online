import { describe, it, expect } from 'vitest';
import { safeChoice, createLlmPhrasingEngine } from '@/features/assistant/llmPhrasingEngine';
import { deterministicPhrasing } from '@/features/assistant/intentRouter';

const OPTIONS = ['Opțiunea A', 'Opțiunea B', 'Opțiunea C'];

describe('safeChoice -- safety validation', () => {
  it('returns the candidate at a valid 0-based index', () => {
    expect(safeChoice(OPTIONS, 0)).toBe('Opțiunea A');
    expect(safeChoice(OPTIONS, 1)).toBe('Opțiunea B');
    expect(safeChoice(OPTIONS, 2)).toBe('Opțiunea C');
  });

  it('rejects an index >= candidates.length', () => {
    expect(safeChoice(OPTIONS, 3)).toBeNull();
    expect(safeChoice(OPTIONS, 99)).toBeNull();
  });

  it('rejects a negative index', () => {
    expect(safeChoice(OPTIONS, -1)).toBeNull();
    expect(safeChoice(OPTIONS, -100)).toBeNull();
  });

  it('rejects non-number types', () => {
    expect(safeChoice(OPTIONS, '1')).toBeNull();
    expect(safeChoice(OPTIONS, null)).toBeNull();
    expect(safeChoice(OPTIONS, undefined)).toBeNull();
    expect(safeChoice(OPTIONS, { index: 0 })).toBeNull();
    expect(safeChoice(OPTIONS, [0])).toBeNull();
  });

  it('rejects Infinity and NaN', () => {
    expect(safeChoice(OPTIONS, Infinity)).toBeNull();
    expect(safeChoice(OPTIONS, -Infinity)).toBeNull();
    expect(safeChoice(OPTIONS, NaN)).toBeNull();
  });

  it('returns null for an empty candidates array', () => {
    expect(safeChoice([], 0)).toBeNull();
    expect(safeChoice([], 1)).toBeNull();
  });

  it('truncates fractional indices to integer before range check', () => {
    // 1.9 truncates to 1 -- valid
    expect(safeChoice(OPTIONS, 1.9)).toBe('Opțiunea B');
    // 2.999 truncates to 2 -- valid
    expect(safeChoice(OPTIONS, 2.999)).toBe('Opțiunea C');
    // -1.5 truncates to -1 -- out of range
    expect(safeChoice(OPTIONS, -1.5)).toBeNull();
  });
});

describe('createLlmPhrasingEngine -- output always in supplied set', () => {
  it('returns the candidate at a valid cached choice_index', () => {
    const engine = createLlmPhrasingEngine(() => 1);
    expect(engine.phrase(OPTIONS, 0)).toBe('Opțiunea B');
  });

  it('falls back to deterministicPhrasing when cached choice is out of range', () => {
    const engine = createLlmPhrasingEngine(() => 99);
    const result = engine.phrase(OPTIONS, 0);
    expect(OPTIONS).toContain(result);
  });

  it('falls back when cached choice is null', () => {
    const engine = createLlmPhrasingEngine(() => null);
    expect(OPTIONS).toContain(engine.phrase(OPTIONS, 0));
  });

  it('falls back when cached choice is NaN', () => {
    const engine = createLlmPhrasingEngine(() => NaN);
    expect(OPTIONS).toContain(engine.phrase(OPTIONS, 0));
  });

  it('any invalid server response yields a member of candidates (safety fuzzing)', () => {
    const badValues: unknown[] = ['0', -1, 99, null, undefined, NaN, Infinity, {}, [], true];
    for (const bad of badValues) {
      const engine = createLlmPhrasingEngine(() => bad);
      const result = engine.phrase(OPTIONS, 0);
      expect(OPTIONS).toContain(result);
    }
  });

  it('deterministicPhrasing.phrase always returns a member of the supplied set', () => {
    for (let seed = 0; seed < OPTIONS.length * 2; seed++) {
      expect(OPTIONS).toContain(deterministicPhrasing.phrase(OPTIONS, seed));
    }
  });
});
