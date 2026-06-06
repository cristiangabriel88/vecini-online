import type { AlarmStatus, AlarmSystem } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_ALARM_SYSTEMS } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

/** Recommended interval between alarm tests, in days. */
export const TEST_INTERVAL_DAYS = 90;
const DAY = 86_400_000;

/** A system needs a name. */
export function isValidSystem(name: string): boolean {
  return name.trim().length > 0;
}

/** Badge tone for a status. */
export function statusTone(status: AlarmStatus): 'success' | 'primary' | 'danger' | 'warning' {
  switch (status) {
    case 'ok':
      return 'success';
    case 'test':
      return 'primary';
    case 'alarma':
      return 'danger';
    case 'defect':
      return 'warning';
  }
}

/** Days since the last test, or null when never tested. */
export function daysSinceTest(system: AlarmSystem, todayISO: string): number | null {
  if (!system.last_test) return null;
  const diff = new Date(todayISO).getTime() - new Date(system.last_test).getTime();
  return Math.floor(diff / DAY);
}

/** A system needs attention when faulty, alarming, never tested, or overdue. */
export function needsAttention(system: AlarmSystem, todayISO: string): boolean {
  if (system.status === 'defect' || system.status === 'alarma') return true;
  const days = daysSinceTest(system, todayISO);
  return days === null || days > TEST_INTERVAL_DAYS;
}

/** Count of systems needing attention. */
export function attentionCount(systems: AlarmSystem[], todayISO: string): number {
  return systems.filter((s) => needsAttention(s, todayISO)).length;
}

/** Systems needing attention first, then alphabetically by name. */
export function sortSystems(systems: AlarmSystem[], todayISO: string): AlarmSystem[] {
  return [...systems].sort((a, b) => {
    const aa = needsAttention(a, todayISO) ? 0 : 1;
    const bb = needsAttention(b, todayISO) ? 0 : 1;
    if (aa !== bb) return aa - bb;
    return a.name.localeCompare(b.name, 'ro');
  });
}

// ── Per-asociatie alarm system catalog ───────────────────────────────────────

export type AlarmByAsociatie = Record<string, AlarmSystem[]>;

const EMPTY_ALARM = emptyArray<AlarmSystem>();

export function alarmForAsociatie(map: AlarmByAsociatie, asociatieId: string | null): AlarmSystem[] {
  if (!asociatieId) return EMPTY_ALARM;
  return map[asociatieId] ?? EMPTY_ALARM;
}

export function seedAlarmSystems(): AlarmByAsociatie {
  return { [DEMO_ASOCIATIE.id]: DEMO_ALARM_SYSTEMS.map((s) => ({ ...s, events: [...s.events] })) };
}

export function addAlarmIn(map: AlarmByAsociatie, asociatieId: string, system: AlarmSystem): AlarmByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [system, ...current] };
}

export function logTestIn(map: AlarmByAsociatie, asociatieId: string, id: string): AlarmByAsociatie {
  const current = map[asociatieId] ?? [];
  const updated = current.map((sys) =>
    sys.id === id
      ? {
          ...sys,
          status: 'ok' as AlarmStatus,
          last_test: new Date().toISOString().slice(0, 10),
          events: [{ id: `ae-${Date.now()}`, system_id: sys.id, kind: 'Test efectuat', occurred_at: new Date().toISOString() }, ...sys.events],
        }
      : sys,
  );
  return { ...map, [asociatieId]: updated };
}

export function reportFaultIn(map: AlarmByAsociatie, asociatieId: string, id: string): AlarmByAsociatie {
  const current = map[asociatieId] ?? [];
  const updated = current.map((sys) =>
    sys.id === id
      ? {
          ...sys,
          status: 'defect' as AlarmStatus,
          events: [{ id: `ae-${Date.now()}`, system_id: sys.id, kind: 'Defectiune semnalata', occurred_at: new Date().toISOString() }, ...sys.events],
        }
      : sys,
  );
  return { ...map, [asociatieId]: updated };
}

export function migrateAlarmState(persisted: unknown): AlarmByAsociatie {
  const p = persisted as { byAsociatie?: AlarmByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: DEMO_ALARM_SYSTEMS.map((s) => ({ ...s, events: [...s.events] })) };
}
