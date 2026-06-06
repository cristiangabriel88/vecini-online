import type { BirthdayConsent } from '@/shared/types/domain';

/** Romanian month names, index 0 = January. */
export const MONTHS_RO = [
  'ianuarie',
  'februarie',
  'martie',
  'aprilie',
  'mai',
  'iunie',
  'iulie',
  'august',
  'septembrie',
  'octombrie',
  'noiembrie',
  'decembrie',
] as const;

/** A valid birthday is a real day/month (29 Feb allowed; no year stored). */
export function isValidBirthday(day: number, month: number): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month)) return false;
  if (month < 1 || month > 12) return false;
  // Use a leap year so 29 Feb is accepted.
  const maxDay = new Date(2024, month, 0).getDate();
  return day >= 1 && day <= maxDay;
}

/** Format a consent's day/month as "24 mai". */
export function formatBirthday(c: Pick<BirthdayConsent, 'birth_day' | 'birth_month'>): string {
  return `${c.birth_day} ${MONTHS_RO[c.birth_month - 1] ?? ''}`.trim();
}

/** Whole days until the next occurrence of this birthday (0 = today). */
export function daysUntilBirthday(
  c: Pick<BirthdayConsent, 'birth_day' | 'birth_month'>,
  now: Date | string | number = new Date(),
): number {
  const ref = new Date(now);
  ref.setHours(0, 0, 0, 0);
  let next = new Date(ref.getFullYear(), c.birth_month - 1, c.birth_day);
  next.setHours(0, 0, 0, 0);
  if (next.getTime() < ref.getTime()) {
    next = new Date(ref.getFullYear() + 1, c.birth_month - 1, c.birth_day);
    next.setHours(0, 0, 0, 0);
  }
  return Math.round((next.getTime() - ref.getTime()) / 86_400_000);
}

/** Consents whose birthday is today. */
export function todaysBirthdays(
  consents: BirthdayConsent[],
  now: Date | string | number = new Date(),
): BirthdayConsent[] {
  return consents.filter((c) => daysUntilBirthday(c, now) === 0);
}

/** Future birthdays (not today), soonest first. */
export function upcomingBirthdays(
  consents: BirthdayConsent[],
  now: Date | string | number = new Date(),
): BirthdayConsent[] {
  return consents
    .filter((c) => daysUntilBirthday(c, now) > 0)
    .sort((a, b) => daysUntilBirthday(a, now) - daysUntilBirthday(b, now));
}

// ── Per-asociatie birthdays catalog ──────────────────────────────────────────

import { DEMO_ASOCIATIE, DEMO_BIRTHDAYS } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

export type BirthdaysByAsociatie = Record<string, BirthdayConsent[]>;

const EMPTY_BIRTHDAYS = emptyArray<BirthdayConsent>();

export function birthdaysForAsociatie(
  map: BirthdaysByAsociatie,
  asociatieId: string | null,
): BirthdayConsent[] {
  if (!asociatieId) return EMPTY_BIRTHDAYS;
  return map[asociatieId] ?? EMPTY_BIRTHDAYS;
}

export function seedBirthdays(): BirthdaysByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_BIRTHDAYS] };
}

export function upsertBirthdayIn(
  map: BirthdaysByAsociatie,
  asociatieId: string,
  consent: BirthdayConsent,
): BirthdaysByAsociatie {
  const current = map[asociatieId] ?? [];
  const exists = current.some((c) => c.user_id === consent.user_id);
  const updated = exists
    ? current.map((c) => (c.user_id === consent.user_id ? consent : c))
    : [consent, ...current];
  return { ...map, [asociatieId]: updated };
}

export function removeBirthdayIn(
  map: BirthdaysByAsociatie,
  asociatieId: string,
  userId: string,
): BirthdaysByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: current.filter((c) => c.user_id !== userId) };
}

export function migrateBirthdaysState(persisted: unknown): BirthdaysByAsociatie {
  const p = persisted as { byAsociatie?: BirthdaysByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_BIRTHDAYS] };
}
