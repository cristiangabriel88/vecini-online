import type { ScheduledMaintenance } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_MAINTENANCE } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

/** Per-asociatie maintenance catalog, keyed by asociatie id. */
export type MaintenancesByAsociatie = Record<string, ScheduledMaintenance[]>;

const EMPTY_MAINT = emptyArray<ScheduledMaintenance>();

/** Get the scheduled maintenance list for one asociatie (never null). */
export function maintenanceForAsociatie(
  map: MaintenancesByAsociatie,
  asociatieId: string | null,
): ScheduledMaintenance[] {
  if (!asociatieId) return EMPTY_MAINT;
  return map[asociatieId] ?? EMPTY_MAINT;
}

/** Initial store state: the demo asociatie is seeded. */
export function seedMaintenance(): MaintenancesByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_MAINTENANCE] };
}

/** Prepend one item to an asociatie's list. */
export function addMaintenanceIn(
  map: MaintenancesByAsociatie,
  asociatieId: string,
  item: ScheduledMaintenance,
): MaintenancesByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [item, ...current] };
}

/** Apply a mark-done transform to one item within an asociatie's list. */
export function markDoneIn(
  map: MaintenancesByAsociatie,
  asociatieId: string,
  id: string,
  rollForwardDays: number,
): MaintenancesByAsociatie {
  const items = map[asociatieId] ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const next = new Date(Date.now() + rollForwardDays * 86_400_000).toISOString().slice(0, 10);
  return {
    ...map,
    [asociatieId]: items.map((m) =>
      m.id === id ? { ...m, last_done: today, next_due: next } : m,
    ),
  };
}

/** Migrate persisted state; always reseeds the demo asociatie. */
export function migrateMaintenanceState(persisted: unknown): MaintenancesByAsociatie {
  const p = persisted as { byAsociatie?: MaintenancesByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_MAINTENANCE] };
}

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
