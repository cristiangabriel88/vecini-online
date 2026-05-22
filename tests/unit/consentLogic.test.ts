import { describe, expect, it } from 'vitest';
import {
  CONSENT_VERSION,
  acceptAllChoices,
  defaultChoices,
  isAllowed,
  makeRecord,
  needsDecision,
  normalizeChoices,
  rejectNonEssentialChoices,
} from '@/features/legal/consentLogic';
import { mayNotify } from '@/shared/notify/consentGate';

describe('consent choices', () => {
  it('defaults to necessary only', () => {
    expect(defaultChoices()).toEqual({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
    });
  });

  it('accept-all turns every category on', () => {
    expect(acceptAllChoices()).toEqual({
      necessary: true,
      preferences: true,
      analytics: true,
      marketing: true,
    });
  });

  it('reject-non-essential keeps only necessary', () => {
    expect(rejectNonEssentialChoices()).toEqual(defaultChoices());
  });

  it('forces necessary on even if asked off', () => {
    const n = normalizeChoices({ necessary: false, preferences: true, analytics: false, marketing: false });
    expect(n.necessary).toBe(true);
    expect(n.preferences).toBe(true);
  });
});

describe('isAllowed', () => {
  const record = makeRecord({ necessary: true, preferences: true, analytics: false, marketing: false });

  it('always allows necessary, even without a record', () => {
    expect(isAllowed(null, 'necessary')).toBe(true);
  });

  it('reflects the recorded choice for optional categories', () => {
    expect(isAllowed(record, 'preferences')).toBe(true);
    expect(isAllowed(record, 'analytics')).toBe(false);
    expect(isAllowed(record, 'marketing')).toBe(false);
  });

  it('denies optional categories with no record', () => {
    expect(isAllowed(null, 'analytics')).toBe(false);
  });
});

describe('needsDecision', () => {
  it('is true when nothing has been decided', () => {
    expect(needsDecision(null)).toBe(true);
  });

  it('is false right after a current-version decision', () => {
    expect(needsDecision(makeRecord(defaultChoices()))).toBe(false);
  });

  it('re-prompts when the policy version advanced', () => {
    const stale = makeRecord(defaultChoices(), new Date(), CONSENT_VERSION - 1);
    expect(needsDecision(stale)).toBe(true);
  });
});

describe('makeRecord', () => {
  it('stamps version and timestamp', () => {
    const r = makeRecord(acceptAllChoices(), new Date('2026-05-22T10:00:00Z'));
    expect(r.version).toBe(CONSENT_VERSION);
    expect(r.decidedAt).toBe('2026-05-22T10:00:00.000Z');
  });
});

describe('mayNotify (fan-out gate)', () => {
  const all = makeRecord(acceptAllChoices());
  const minimal = makeRecord(defaultChoices());

  it('always sends essential, regardless of consent', () => {
    expect(mayNotify(null, 'essential')).toBe(true);
    expect(mayNotify(minimal, 'essential')).toBe(true);
  });

  it('gates community on the preferences category', () => {
    expect(mayNotify(minimal, 'community')).toBe(false);
    expect(mayNotify(all, 'community')).toBe(true);
  });

  it('gates marketing on the marketing category', () => {
    expect(mayNotify(minimal, 'marketing')).toBe(false);
    expect(mayNotify(all, 'marketing')).toBe(true);
  });

  it('only essential goes out before any decision', () => {
    expect(mayNotify(null, 'community')).toBe(false);
    expect(mayNotify(null, 'marketing')).toBe(false);
  });
});
