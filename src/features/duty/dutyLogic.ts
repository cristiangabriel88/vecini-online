import type { DutySlot } from '@/shared/types/domain';

const DAY = 86_400_000;

/** Duty slots sorted by weekend, soonest first. */
export function sortDuty(slots: DutySlot[]): DutySlot[] {
  return [...slots].sort(
    (a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime(),
  );
}

/** Whether a slot has a volunteer assigned. */
export function isCovered(slot: DutySlot): boolean {
  return slot.volunteer_user_id !== null;
}

/** The slot covering the given day (Saturday + Sunday of `week_start`), or null. */
export function currentDuty(slots: DutySlot[], todayISO: string): DutySlot | null {
  const today = new Date(todayISO).getTime();
  return (
    sortDuty(slots).find((s) => {
      const start = new Date(s.week_start).getTime();
      // Covers the whole weekend: Saturday 00:00 through Monday 00:00.
      return today >= start && today < start + 2 * DAY;
    }) ?? null
  );
}

/** The earliest slot strictly after the given day, or null. */
export function nextDuty(slots: DutySlot[], todayISO: string): DutySlot | null {
  const today = new Date(todayISO).getTime();
  return sortDuty(slots).find((s) => new Date(s.week_start).getTime() > today) ?? null;
}

/** Whether the given user is the volunteer for a slot. */
export function isMine(slot: DutySlot, userId: string): boolean {
  return slot.volunteer_user_id === userId;
}
