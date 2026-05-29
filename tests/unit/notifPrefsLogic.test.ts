import { describe, expect, it } from 'vitest';
import {
  defaultNotifEmailPrefs,
  hourInTimezone,
  isInQuietHours,
  shouldSendEmailNotif,
  isValidQuietHour,
} from '@/shared/lib/notifPrefsLogic';

describe('defaultNotifEmailPrefs', () => {
  it('returns emailEnabled true with no quiet hours by default', () => {
    const p = defaultNotifEmailPrefs();
    expect(p.emailEnabled).toBe(true);
    expect(p.quietHoursStart).toBeNull();
    expect(p.quietHoursEnd).toBeNull();
    expect(p.timezone).toBe('Europe/Bucharest');
  });
});

describe('hourInTimezone', () => {
  it('returns hour 0-23 for a known UTC midnight in UTC timezone', () => {
    // 2026-01-01T00:00:00Z = midnight UTC
    const midnight = new Date('2026-01-01T00:00:00Z').getTime();
    const h = hourInTimezone(midnight, 'UTC');
    expect(h).toBe(0);
  });

  it('returns Bucharest hour (UTC+2 in winter) for a noon UTC timestamp', () => {
    // 2026-01-01T10:00:00Z = 12:00 EET (UTC+2)
    const ts = new Date('2026-01-01T10:00:00Z').getTime();
    const h = hourInTimezone(ts, 'Europe/Bucharest');
    expect(h).toBe(12);
  });

  it('falls back to UTC hour on an invalid timezone', () => {
    const ts = new Date('2026-01-01T06:00:00Z').getTime();
    const h = hourInTimezone(ts, 'Not/ATimezone');
    expect(h).toBe(6);
  });
});

describe('isInQuietHours', () => {
  const basePrefs = defaultNotifEmailPrefs();

  it('returns false when no quiet hours are configured', () => {
    const ts = new Date('2026-01-01T10:00:00Z').getTime();
    expect(isInQuietHours(basePrefs, ts)).toBe(false);
  });

  it('returns true inside a non-wrapping window (08-22)', () => {
    const prefs = { ...basePrefs, quietHoursStart: 8, quietHoursEnd: 22, timezone: 'UTC' };
    // 10:00 UTC -- inside [8, 22)
    expect(isInQuietHours(prefs, new Date('2026-01-01T10:00:00Z').getTime())).toBe(true);
    // 07:59 UTC -- outside
    expect(isInQuietHours(prefs, new Date('2026-01-01T07:59:00Z').getTime())).toBe(false);
    // 22:00 UTC -- outside (exclusive end)
    expect(isInQuietHours(prefs, new Date('2026-01-01T22:00:00Z').getTime())).toBe(false);
  });

  it('returns true inside a wrapping window (22-08)', () => {
    const prefs = { ...basePrefs, quietHoursStart: 22, quietHoursEnd: 8, timezone: 'UTC' };
    // 23:00 UTC -- inside (past start)
    expect(isInQuietHours(prefs, new Date('2026-01-01T23:00:00Z').getTime())).toBe(true);
    // 03:00 UTC -- inside (before end)
    expect(isInQuietHours(prefs, new Date('2026-01-01T03:00:00Z').getTime())).toBe(true);
    // 12:00 UTC -- outside
    expect(isInQuietHours(prefs, new Date('2026-01-01T12:00:00Z').getTime())).toBe(false);
    // 08:00 UTC -- outside (exclusive end)
    expect(isInQuietHours(prefs, new Date('2026-01-01T08:00:00Z').getTime())).toBe(false);
  });

  it('returns true for entire day when start === end', () => {
    const prefs = { ...basePrefs, quietHoursStart: 8, quietHoursEnd: 8, timezone: 'UTC' };
    expect(isInQuietHours(prefs, new Date('2026-01-01T08:00:00Z').getTime())).toBe(true);
    expect(isInQuietHours(prefs, new Date('2026-01-01T20:00:00Z').getTime())).toBe(true);
  });
});

describe('shouldSendEmailNotif', () => {
  const base = defaultNotifEmailPrefs();
  const ts = new Date('2026-01-01T12:00:00Z').getTime();

  it('returns true when emailEnabled and outside quiet hours', () => {
    expect(shouldSendEmailNotif(base, 'normal', ts)).toBe(true);
  });

  it('returns false when emailEnabled is false (non-urgent)', () => {
    const prefs = { ...base, emailEnabled: false };
    expect(shouldSendEmailNotif(prefs, 'normal', ts)).toBe(false);
    expect(shouldSendEmailNotif(prefs, 'low', ts)).toBe(false);
  });

  it('returns true for urgent even when emailEnabled is false', () => {
    const prefs = { ...base, emailEnabled: false };
    expect(shouldSendEmailNotif(prefs, 'urgent', ts)).toBe(true);
  });

  it('returns false inside quiet hours for normal priority', () => {
    // noon UTC is inside 08-22 UTC quiet window
    const prefs = { ...base, quietHoursStart: 8, quietHoursEnd: 22, timezone: 'UTC' };
    expect(shouldSendEmailNotif(prefs, 'normal', ts)).toBe(false);
  });

  it('returns true for urgent inside quiet hours', () => {
    const prefs = { ...base, quietHoursStart: 8, quietHoursEnd: 22, timezone: 'UTC' };
    expect(shouldSendEmailNotif(prefs, 'urgent', ts)).toBe(true);
  });
});

describe('isValidQuietHour', () => {
  it('accepts 0 to 23', () => {
    expect(isValidQuietHour(0)).toBe(true);
    expect(isValidQuietHour(23)).toBe(true);
    expect(isValidQuietHour(12)).toBe(true);
  });

  it('rejects out-of-range values', () => {
    expect(isValidQuietHour(-1)).toBe(false);
    expect(isValidQuietHour(24)).toBe(false);
    expect(isValidQuietHour(1.5)).toBe(false);
    expect(isValidQuietHour('8')).toBe(false);
    expect(isValidQuietHour(null)).toBe(false);
  });
});
