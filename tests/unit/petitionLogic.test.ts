import { describe, expect, it } from 'vitest';
import {
  isThresholdReached,
  isValidPetition,
  progress,
  sortPetitions,
  thresholdCount,
} from '@/features/petitions/petitionLogic';
import type { Petition } from '@/shared/types/domain';

const base = {
  asociatie_id: 'a',
  author_user_id: 'u',
  author_name: 'Elena',
  body: 'corp text',
  threshold_percent: 25,
  status: 'deschisa',
};

const p = (over: Partial<Petition>): Petition => ({
  ...base,
  id: 'x',
  title: 'Titlu petiție',
  created_at: '2026-05-01T00:00:00Z',
  signatures: 0,
  total_apartments: 20,
  ...over,
});

describe('isValidPetition', () => {
  it('requires a title and a body', () => {
    expect(isValidPetition('Titlu', 'corp text')).toBe(true);
    expect(isValidPetition('ab', 'corp text')).toBe(false);
    expect(isValidPetition('Titlu', 'x')).toBe(false);
  });
});

describe('thresholdCount / isThresholdReached', () => {
  it('rounds the percentage up and compares signatures', () => {
    expect(thresholdCount(p({ total_apartments: 20 }))).toBe(5); // ceil(25% of 20)
    expect(thresholdCount(p({ total_apartments: 21 }))).toBe(6); // ceil(5.25)
    expect(isThresholdReached(p({ signatures: 4, total_apartments: 20 }))).toBe(false);
    expect(isThresholdReached(p({ signatures: 5, total_apartments: 20 }))).toBe(true);
  });
});

describe('progress', () => {
  it('is the ratio of signatures to target, clamped to 1', () => {
    expect(progress(p({ signatures: 0, total_apartments: 20 }))).toBe(0);
    expect(progress(p({ signatures: 10, total_apartments: 20 }))).toBe(1);
  });
});

describe('sortPetitions', () => {
  it('orders newest first', () => {
    const list = [
      p({ id: 'old', created_at: '2026-05-01T00:00:00Z' }),
      p({ id: 'new', created_at: '2026-05-10T00:00:00Z' }),
    ];
    expect(sortPetitions(list).map((x) => x.id)).toEqual(['new', 'old']);
  });
});
