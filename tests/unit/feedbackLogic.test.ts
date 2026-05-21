import { describe, expect, it } from 'vitest';
import { isValidFeedback, sortedFeedback } from '@/features/feedback/feedbackLogic';
import type { PlatformFeedback } from '@/shared/types/domain';

const base = { asociatie_id: 'a', user_id: 'u', anonymous: false } as const;

const items: PlatformFeedback[] = [
  { ...base, id: '1', body: 'Idee bună', sentiment: 'idee', created_at: '2026-05-15T10:00:00Z' },
  { ...base, id: '2', body: 'Eroare la login', sentiment: 'problema', created_at: '2026-05-19T10:00:00Z' },
  { ...base, id: '3', body: 'Foarte util', sentiment: 'lauda', created_at: '2026-05-17T10:00:00Z' },
];

describe('isValidFeedback', () => {
  it('requires a non-trivial body', () => {
    expect(isValidFeedback('Merge bine')).toBe(true);
    expect(isValidFeedback('   ')).toBe(false);
    expect(isValidFeedback('ok')).toBe(false);
  });
});

describe('sortedFeedback', () => {
  it('orders newest first without mutating input', () => {
    const copy = [...items];
    expect(sortedFeedback(items).map((f) => f.id)).toEqual(['2', '3', '1']);
    expect(items).toEqual(copy);
  });
});
