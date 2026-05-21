import { describe, expect, it } from 'vitest';
import {
  daysUntilBirthday,
  formatBirthday,
  isValidBirthday,
  todaysBirthdays,
  upcomingBirthdays,
} from '@/features/birthdays/birthdaysLogic';
import type { BirthdayConsent } from '@/shared/types/domain';

const base = { asociatie_id: 'a' };
const NOW = '2026-05-22T09:00:00Z';

const consents: BirthdayConsent[] = [
  { ...base, id: '1', user_id: 'u1', user_name: 'Azi', birth_day: 22, birth_month: 5 },
  { ...base, id: '2', user_id: 'u2', user_name: 'Mâine', birth_day: 23, birth_month: 5 },
  { ...base, id: '3', user_id: 'u3', user_name: 'La anul', birth_day: 1, birth_month: 1 },
];

describe('isValidBirthday', () => {
  it('accepts real dates including 29 Feb', () => {
    expect(isValidBirthday(24, 5)).toBe(true);
    expect(isValidBirthday(29, 2)).toBe(true);
    expect(isValidBirthday(31, 12)).toBe(true);
  });

  it('rejects impossible dates', () => {
    expect(isValidBirthday(0, 5)).toBe(false);
    expect(isValidBirthday(31, 4)).toBe(false);
    expect(isValidBirthday(15, 13)).toBe(false);
    expect(isValidBirthday(1.5, 5)).toBe(false);
  });
});

describe('formatBirthday', () => {
  it('formats day and Romanian month', () => {
    expect(formatBirthday({ birth_day: 24, birth_month: 5 })).toBe('24 mai');
  });
});

describe('daysUntilBirthday', () => {
  it('is 0 today, 1 tomorrow, wraps to next year for past dates', () => {
    expect(daysUntilBirthday(consents[0], NOW)).toBe(0);
    expect(daysUntilBirthday(consents[1], NOW)).toBe(1);
    // 1 Jan already passed in May → next year's 1 Jan.
    expect(daysUntilBirthday(consents[2], NOW)).toBeGreaterThan(200);
  });
});

describe('todaysBirthdays / upcomingBirthdays', () => {
  it('separates today from the soonest-first upcoming list', () => {
    expect(todaysBirthdays(consents, NOW).map((c) => c.id)).toEqual(['1']);
    expect(upcomingBirthdays(consents, NOW).map((c) => c.id)).toEqual(['2', '3']);
  });
});
