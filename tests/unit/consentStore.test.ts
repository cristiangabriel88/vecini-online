/**
 * Unit tests for useConsentStore (GDPR / ePrivacy consent model).
 *
 * Security contracts under test:
 *   - 'necessary' is always forced true regardless of input (normalizeChoices
 *     prevents the strictly-required category from ever being disabled).
 *   - Every decision is appended to the audit history, never overwritten.
 *   - reset() clears the active record (banner re-appears) but does NOT purge
 *     history (the audit trail is append-only).
 *   - Records carry the correct policy version and a valid ISO timestamp so the
 *     "who consented to what, when, version" trail is auditable.
 *   - rejectNonEssential() correctly disables all optional categories.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useConsentStore } from '../../src/shared/store/consentStore';
import { CONSENT_VERSION } from '../../src/features/legal/consentLogic';

beforeEach(() => {
  useConsentStore.setState({ record: null, history: [] });
});

describe('initial state', () => {
  it('record is null before any decision is made', () => {
    expect(useConsentStore.getState().record).toBeNull();
  });

  it('history is empty before any decision is made', () => {
    expect(useConsentStore.getState().history).toHaveLength(0);
  });
});

describe('acceptAll()', () => {
  it('sets all four categories to true', () => {
    useConsentStore.getState().acceptAll();

    const { choices } = useConsentStore.getState().record!;
    expect(choices.necessary).toBe(true);
    expect(choices.preferences).toBe(true);
    expect(choices.analytics).toBe(true);
    expect(choices.marketing).toBe(true);
  });

  it('appends one entry to history', () => {
    useConsentStore.getState().acceptAll();

    expect(useConsentStore.getState().history).toHaveLength(1);
  });

  it('sets the active record to match the history entry', () => {
    useConsentStore.getState().acceptAll();

    const { record, history } = useConsentStore.getState();
    expect(record).toEqual(history[0]);
  });
});

describe('rejectNonEssential()', () => {
  it('keeps necessary true', () => {
    useConsentStore.getState().rejectNonEssential();

    expect(useConsentStore.getState().record!.choices.necessary).toBe(true);
  });

  it('sets preferences to false', () => {
    useConsentStore.getState().rejectNonEssential();

    expect(useConsentStore.getState().record!.choices.preferences).toBe(false);
  });

  it('sets analytics to false', () => {
    useConsentStore.getState().rejectNonEssential();

    expect(useConsentStore.getState().record!.choices.analytics).toBe(false);
  });

  it('sets marketing to false', () => {
    useConsentStore.getState().rejectNonEssential();

    expect(useConsentStore.getState().record!.choices.marketing).toBe(false);
  });

  it('appends one entry to history', () => {
    useConsentStore.getState().rejectNonEssential();

    expect(useConsentStore.getState().history).toHaveLength(1);
  });
});

describe('decide(choices)', () => {
  it('reflects the passed choices in the active record', () => {
    useConsentStore.getState().decide({
      necessary: true,
      preferences: true,
      analytics: false,
      marketing: false,
    });

    const { choices } = useConsentStore.getState().record!;
    expect(choices.necessary).toBe(true);
    expect(choices.preferences).toBe(true);
    expect(choices.analytics).toBe(false);
    expect(choices.marketing).toBe(false);
  });

  it('appends one entry to history', () => {
    useConsentStore.getState().decide({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
    });

    expect(useConsentStore.getState().history).toHaveLength(1);
  });
});

describe('normalizeChoices: necessary is always true', () => {
  it('forces necessary to true even when false is passed to decide()', () => {
    useConsentStore.getState().decide({
      necessary: false,
      preferences: false,
      analytics: false,
      marketing: false,
    });

    expect(useConsentStore.getState().record!.choices.necessary).toBe(true);
  });
});

describe('history is append-only', () => {
  it('accumulates two entries after two acceptAll() calls', () => {
    useConsentStore.getState().acceptAll();
    useConsentStore.getState().acceptAll();

    expect(useConsentStore.getState().history).toHaveLength(2);
  });

  it('accumulates entries from mixed actions', () => {
    useConsentStore.getState().acceptAll();
    useConsentStore.getState().rejectNonEssential();
    useConsentStore.getState().decide({
      necessary: true,
      preferences: true,
      analytics: false,
      marketing: true,
    });

    expect(useConsentStore.getState().history).toHaveLength(3);
  });
});

describe('reset()', () => {
  it('clears the active record to null', () => {
    useConsentStore.getState().acceptAll();
    useConsentStore.getState().reset();

    expect(useConsentStore.getState().record).toBeNull();
  });

  it('does not clear the history (audit trail must be preserved)', () => {
    useConsentStore.getState().acceptAll();
    useConsentStore.getState().reset();

    expect(useConsentStore.getState().history).toHaveLength(1);
  });

  it('can be called on an already-null record without error', () => {
    expect(() => useConsentStore.getState().reset()).not.toThrow();
    expect(useConsentStore.getState().record).toBeNull();
  });
});

describe('ConsentRecord — version and timestamp', () => {
  it('record.version matches the exported CONSENT_VERSION constant', () => {
    useConsentStore.getState().acceptAll();

    expect(useConsentStore.getState().record!.version).toBe(CONSENT_VERSION);
  });

  it('record.decidedAt is a valid ISO 8601 timestamp string', () => {
    useConsentStore.getState().acceptAll();

    const { decidedAt } = useConsentStore.getState().record!;
    expect(typeof decidedAt).toBe('string');
    expect(Number.isNaN(new Date(decidedAt).getTime())).toBe(false);
    // Must contain the date separator (T) to be ISO 8601.
    expect(decidedAt).toContain('T');
  });

  it('history entries each carry the same version', () => {
    useConsentStore.getState().acceptAll();
    useConsentStore.getState().rejectNonEssential();

    const versions = useConsentStore.getState().history.map((r) => r.version);
    expect(versions).toEqual([CONSENT_VERSION, CONSENT_VERSION]);
  });
});
