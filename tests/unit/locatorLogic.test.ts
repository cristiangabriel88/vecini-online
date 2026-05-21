import { describe, expect, it } from 'vitest';
import { expiresAt, isExpired, daysLeft, LOCATOR_LIFETIME_DAYS } from '@/features/locator/locatorLogic';

describe('locator post lifetime', () => {
  const created = new Date('2026-05-01T10:00:00Z');

  it('expires LOCATOR_LIFETIME_DAYS after creation', () => {
    const exp = expiresAt(created);
    expect(exp.getTime() - created.getTime()).toBe(LOCATOR_LIFETIME_DAYS * 86_400_000);
  });

  it('flags posts past their expiry', () => {
    const exp = expiresAt(created);
    expect(isExpired(exp, new Date('2026-05-10T10:00:00Z'))).toBe(false);
    expect(isExpired(exp, new Date('2026-05-20T10:00:00Z'))).toBe(true);
  });

  it('counts whole days remaining and clamps to zero', () => {
    const exp = expiresAt(created); // 2026-05-15T10:00:00Z
    expect(daysLeft(exp, new Date('2026-05-13T10:00:00Z'))).toBe(2);
    expect(daysLeft(exp, new Date('2026-05-20T10:00:00Z'))).toBe(0);
  });
});
