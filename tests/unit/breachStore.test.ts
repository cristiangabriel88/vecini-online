/**
 * Unit tests for useBreachStore (GDPR art. 33/34 breach log, T22).
 *
 * Security contracts under test:
 *   - record() builds a BreachRecord with the correct asociatie_id, reporter,
 *     title and risk classification derived from the input factors.
 *   - Breaches are prepended (most recent first) so the queue always shows the
 *     newest incident at the top.
 *   - advance() moves status forward exactly one step along the lifecycle.
 *   - notifyAuthority() stamps authority_notified_at and advances status to at
 *     least 'notificat' to reflect the art. 33 notification obligation.
 *   - notifySubjects() stamps subjects_notified_at (art. 34 obligation).
 *   - Operations on an unknown id are no-ops; the existing list is unchanged.
 *   - Supabase mirror calls are best-effort; with isSupabaseConfigured false they
 *     are completely bypassed (tested implicitly via the mock).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    })),
  },
}));

import { useBreachStore } from '../../src/shared/store/breachStore';
import type { NewBreachInput } from '../../src/features/gdpr/breachLogic';

const BASE_INPUT: NewBreachInput = {
  title: 'Test Breach',
  description: 'Some data leaked',
  nature: ['confidentiality'],
  discoveredAt: '2026-06-07T10:00:00.000Z',
  occurredAt: '2026-06-06T10:00:00.000Z',
  dataCategories: ['email'],
  affectedCount: 10,
  factors: {
    sensitiveData: false,
    largeScale: false,
    identifiable: true,
    mitigated: false,
  },
  consequences: 'Users could be spammed',
  measures: 'Passwords reset',
};

beforeEach(() => {
  useBreachStore.setState({ breaches: [] });
});

describe('record()', () => {
  it('returns a BreachRecord with the provided asociatie_id', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    expect(r.asociatie_id).toBe('asoc-1');
  });

  it('returns a BreachRecord with the correct title', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    expect(r.title).toBe('Test Breach');
  });

  it('classifies risk as "risk" for an identifiable, non-sensitive, non-large-scale breach', () => {
    // identifiable: true, sensitiveData: false, largeScale: false -> classifyRisk -> 'risk'
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    expect(r.risk).toBe('risk');
  });

  it('classifies risk as "high" when sensitiveData is true', () => {
    const input: NewBreachInput = {
      ...BASE_INPUT,
      factors: { ...BASE_INPUT.factors, sensitiveData: true },
    };

    const r = useBreachStore.getState().record('asoc-1', 'user-1', input);

    expect(r.risk).toBe('high');
  });

  it('classifies risk as "low" when mitigated and non-sensitive', () => {
    const input: NewBreachInput = {
      ...BASE_INPUT,
      factors: {
        sensitiveData: false,
        largeScale: false,
        identifiable: false,
        mitigated: true,
      },
    };

    const r = useBreachStore.getState().record('asoc-1', 'user-1', input);

    expect(r.risk).toBe('low');
  });

  it('stores the reported_by value', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    expect(r.reported_by).toBe('user-1');
  });

  it('allows null reported_by', () => {
    const r = useBreachStore.getState().record('asoc-1', null, BASE_INPUT);

    expect(r.reported_by).toBeNull();
  });

  it('sets initial status to "detectat"', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    expect(r.status).toBe('detectat');
  });

  it('sets authority_notified_at to null initially', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    expect(r.authority_notified_at).toBeNull();
  });

  it('sets subjects_notified_at to null initially', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    expect(r.subjects_notified_at).toBeNull();
  });

  it('generates a non-empty string id', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    expect(typeof r.id).toBe('string');
    expect(r.id.length).toBeGreaterThan(0);
  });
});

describe('record() — store state', () => {
  it('prepends the breach so breaches array has length 1 after first record', () => {
    useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    expect(useBreachStore.getState().breaches).toHaveLength(1);
  });

  it('prepends newer breaches so the most recent is first', () => {
    const r1 = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);
    const r2 = useBreachStore.getState().record('asoc-1', 'user-1', {
      ...BASE_INPUT,
      title: 'Second Breach',
    });

    const { breaches } = useBreachStore.getState();
    expect(breaches).toHaveLength(2);
    expect(breaches[0].id).toBe(r2.id);
    expect(breaches[1].id).toBe(r1.id);
  });

  it('both records are present when two are added consecutively', () => {
    useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);
    useBreachStore.getState().record('asoc-1', 'user-1', {
      ...BASE_INPUT,
      title: 'Second Breach',
    });

    const { breaches } = useBreachStore.getState();
    const titles = breaches.map((b) => b.title);
    expect(titles).toContain('Test Breach');
    expect(titles).toContain('Second Breach');
  });
});

describe('advance()', () => {
  it('advances status from "detectat" to "evaluat"', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    useBreachStore.getState().advance(r.id);

    const updated = useBreachStore.getState().breaches.find((b) => b.id === r.id)!;
    expect(updated.status).toBe('evaluat');
  });

  it('advances status from "evaluat" to "notificat"', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    useBreachStore.getState().advance(r.id);
    useBreachStore.getState().advance(r.id);

    const updated = useBreachStore.getState().breaches.find((b) => b.id === r.id)!;
    expect(updated.status).toBe('notificat');
  });

  it('does not change other breaches when advancing one', () => {
    const r1 = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);
    const r2 = useBreachStore.getState().record('asoc-1', 'user-1', {
      ...BASE_INPUT,
      title: 'Other Breach',
    });

    useBreachStore.getState().advance(r1.id);

    const other = useBreachStore.getState().breaches.find((b) => b.id === r2.id)!;
    expect(other.status).toBe('detectat');
  });

  it('is a no-op on an unknown id', () => {
    useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);
    const before = useBreachStore.getState().breaches.map((b) => b.status);

    useBreachStore.getState().advance('non-existent-id');

    const after = useBreachStore.getState().breaches.map((b) => b.status);
    expect(after).toEqual(before);
  });

  it('stays at "inchis" when already at the terminal state', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    // Advance through all states to reach 'inchis'.
    useBreachStore.getState().advance(r.id);
    useBreachStore.getState().advance(r.id);
    useBreachStore.getState().advance(r.id);
    useBreachStore.getState().advance(r.id); // extra call at terminal

    const final = useBreachStore.getState().breaches.find((b) => b.id === r.id)!;
    expect(final.status).toBe('inchis');
  });
});

describe('notifyAuthority()', () => {
  it('sets authority_notified_at to a non-null value', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    useBreachStore.getState().notifyAuthority(r.id);

    const updated = useBreachStore.getState().breaches.find((b) => b.id === r.id)!;
    expect(updated.authority_notified_at).not.toBeNull();
  });

  it('sets authority_notified_at to a valid ISO timestamp', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    useBreachStore.getState().notifyAuthority(r.id);

    const updated = useBreachStore.getState().breaches.find((b) => b.id === r.id)!;
    expect(Number.isNaN(new Date(updated.authority_notified_at!).getTime())).toBe(false);
  });

  it('advances status to at least "notificat" when called at "detectat"', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    useBreachStore.getState().notifyAuthority(r.id);

    const updated = useBreachStore.getState().breaches.find((b) => b.id === r.id)!;
    expect(updated.status).toBe('notificat');
  });

  it('is a no-op on an unknown id', () => {
    useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);
    const before = useBreachStore.getState().breaches.map((b) => b.authority_notified_at);

    useBreachStore.getState().notifyAuthority('non-existent-id');

    const after = useBreachStore.getState().breaches.map((b) => b.authority_notified_at);
    expect(after).toEqual(before);
  });

  it('does not overwrite an existing authority_notified_at on a second call', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    useBreachStore.getState().notifyAuthority(r.id);
    const first = useBreachStore.getState().breaches.find((b) => b.id === r.id)!.authority_notified_at;

    useBreachStore.getState().notifyAuthority(r.id);
    const second = useBreachStore.getState().breaches.find((b) => b.id === r.id)!.authority_notified_at;

    expect(second).toBe(first);
  });
});

describe('notifySubjects()', () => {
  it('sets subjects_notified_at to a non-null value', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    useBreachStore.getState().notifySubjects(r.id);

    const updated = useBreachStore.getState().breaches.find((b) => b.id === r.id)!;
    expect(updated.subjects_notified_at).not.toBeNull();
  });

  it('sets subjects_notified_at to a valid ISO timestamp', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    useBreachStore.getState().notifySubjects(r.id);

    const updated = useBreachStore.getState().breaches.find((b) => b.id === r.id)!;
    expect(Number.isNaN(new Date(updated.subjects_notified_at!).getTime())).toBe(false);
  });

  it('is a no-op on an unknown id', () => {
    useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);
    const before = useBreachStore.getState().breaches.map((b) => b.subjects_notified_at);

    useBreachStore.getState().notifySubjects('non-existent-id');

    const after = useBreachStore.getState().breaches.map((b) => b.subjects_notified_at);
    expect(after).toEqual(before);
  });

  it('does not overwrite an existing subjects_notified_at on a second call', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    useBreachStore.getState().notifySubjects(r.id);
    const first = useBreachStore.getState().breaches.find((b) => b.id === r.id)!.subjects_notified_at;

    useBreachStore.getState().notifySubjects(r.id);
    const second = useBreachStore.getState().breaches.find((b) => b.id === r.id)!.subjects_notified_at;

    expect(second).toBe(first);
  });

  it('does not change authority_notified_at when only subjects are notified', () => {
    const r = useBreachStore.getState().record('asoc-1', 'user-1', BASE_INPUT);

    useBreachStore.getState().notifySubjects(r.id);

    const updated = useBreachStore.getState().breaches.find((b) => b.id === r.id)!;
    expect(updated.authority_notified_at).toBeNull();
  });
});
