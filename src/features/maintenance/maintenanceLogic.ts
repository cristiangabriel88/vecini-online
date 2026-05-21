import type { ScheduledMaintenance } from '@/shared/types/domain';

/** How a scheduled maintenance entry stands relative to its next due date. */
export type MaintenanceStatus = 'overdue' | 'due_soon' | 'scheduled';

/** Window (days) before the due date during which an entry counts as "due soon". */
export const MAINTENANCE_DUE_SOON_DAYS = 14;

/** Classify an entry by its `next_due` date. */
export function maintenanceStatus(
  nextDue: string,
  now: Date = new Date(),
): MaintenanceStatus {
  const due = new Date(`${nextDue.slice(0, 10)}T00:00:00`).getTime();
  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00`).getTime();
  if (due < today) return 'overdue';
  const days = (due - today) / 86_400_000;
  return days <= MAINTENANCE_DUE_SOON_DAYS ? 'due_soon' : 'scheduled';
}

/** A maintenance entry needs a title and a parseable next-due date. */
export function isValidMaintenance(title: string, nextDue: string): boolean {
  if (title.trim().length < 3) return false;
  return !Number.isNaN(new Date(nextDue).getTime());
}

/** Sort entries by next due date ascending (soonest / most overdue first). */
export function sortByNextDue(items: ScheduledMaintenance[]): ScheduledMaintenance[] {
  return [...items].sort(
    (a, b) => new Date(a.next_due).getTime() - new Date(b.next_due).getTime(),
  );
}

/** Count entries that are overdue or due soon — used by the admin digest. */
export function countDue(items: ScheduledMaintenance[], now: Date = new Date()): number {
  return items.filter((m) => maintenanceStatus(m.next_due, now) !== 'scheduled').length;
}
