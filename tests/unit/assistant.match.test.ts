import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { normalize, tokenize, matchEntries } from '@/features/assistant/match';
import { answerQuery } from '@/features/assistant/engine';
import { KNOWLEDGE_BASE } from '@/features/assistant/knowledge';
import { visibleEntries } from '@/features/assistant/visibility';
import { FEATURES } from '@/shared/features/registry';

/**
 * Stub `t`: returns the i18n fallback when one is given (so feature entries use
 * the registry's Romanian title/description) and the key otherwise. The matcher
 * is exercised against real registry copy + the code-level aliases.
 */
const t = ((key: string, def?: unknown) => (typeof def === 'string' ? def : key)) as unknown as TFunction;

/**
 * The widget always matches against role-filtered entries. We mirror that with a
 * resident view (every feature enabled), so comitet-only entries like F21 are
 * excluded — which is what disambiguates a bare "sesizări" to F17.
 */
const allFlags: Record<string, boolean> = Object.fromEntries(FEATURES.map((f) => [f.key, true]));
const RESIDENT = visibleEntries(KNOWLEDGE_BASE, 'proprietar', allFlags);

const topId = (query: string) => matchEntries(query, RESIDENT, t)[0]?.entry.id;

describe('normalize / tokenize', () => {
  it('lowercases and strips Romanian diacritics', () => {
    expect(normalize('Sesizări cu Foto')).toBe('sesizari cu foto');
    expect(normalize('Spălătorie')).toBe('spalatorie');
  });

  it('drops stopwords and short tokens', () => {
    expect(tokenize('cum raportez o problemă')).toEqual(['raportez', 'problema']);
  });
});

describe('matchEntries', () => {
  it('matches the feature name ignoring diacritics', () => {
    expect(topId('sesizări')).toBe('F17');
    expect(topId('parcare')).toBe('F28');
  });

  it('matches via colloquial synonyms', () => {
    expect(topId('am o teava sparta')).toBe('F17');
    expect(topId('unde votez')).toBe('F09');
    expect(topId('vreau sa rezerv spalatoria')).toBe('F25');
  });

  it('tolerates typos (one edit, incl. transposition)', () => {
    expect(topId('spalatorei')).toBe('F25'); // spalatorie, transposed
    expect(topId('petitei')).toBe('F16'); // petitie, transposed
    expect(topId('documete')).toBe('F33'); // documente, missing letter
  });

  it('returns nothing for gibberish', () => {
    expect(matchEntries('qwerty zxcvb', KNOWLEDGE_BASE, t)).toHaveLength(0);
  });
});

describe('answerQuery', () => {
  it('produces a confident, routed answer for a known feature', () => {
    const reply = answerQuery('cum raportez o problema', KNOWLEDGE_BASE, t);
    expect(reply.matched).toBe(true);
    expect(reply.route).toBe('/app/sesizari');
  });

  it('falls back with suggestions when nothing clears the threshold', () => {
    const reply = answerQuery('qwerty zxcvb', KNOWLEDGE_BASE, t);
    expect(reply.matched).toBe(false);
    expect(reply.route).toBeUndefined();
  });
});
