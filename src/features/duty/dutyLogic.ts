import type { DutySlot } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_DUTY } from '@/shared/demo/demoData';

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

// ── Per-asociatie duty slot catalog ──────────────────────────────────────────

/** Duty slots keyed by asociatie id. */
export type DutyByAsociatie = Record<string, DutySlot[]>;

const EMPTY_DUTY_SLOTS: DutySlot[] = [];

export function dutyForAsociatie(
  map: DutyByAsociatie,
  asociatieId: string | null,
): DutySlot[] {
  if (!asociatieId) return EMPTY_DUTY_SLOTS;
  return map[asociatieId] ?? EMPTY_DUTY_SLOTS;
}

export function seedDuty(): DutyByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_DUTY] };
}

export function signUpIn(
  map: DutyByAsociatie,
  asociatieId: string,
  id: string,
  volunteerId: string,
  volunteerName: string,
  note: string | null,
): DutyByAsociatie {
  const slots = map[asociatieId] ?? [];
  return {
    ...map,
    [asociatieId]: slots.map((s) =>
      s.id === id
        ? { ...s, volunteer_user_id: volunteerId, volunteer_name: volunteerName, note }
        : s,
    ),
  };
}

export function releaseIn(
  map: DutyByAsociatie,
  asociatieId: string,
  id: string,
): DutyByAsociatie {
  const slots = map[asociatieId] ?? [];
  return {
    ...map,
    [asociatieId]: slots.map((s) =>
      s.id === id
        ? { ...s, volunteer_user_id: null, volunteer_name: null, note: null }
        : s,
    ),
  };
}

export function migrateDutyState(persisted: unknown): DutyByAsociatie {
  const p = persisted as { byAsociatie?: DutyByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_DUTY] };
}
