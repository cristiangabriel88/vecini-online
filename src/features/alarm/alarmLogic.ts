import type { AlarmStatus, AlarmSystem } from '@/shared/types/domain';

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
