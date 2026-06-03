import { beforeEach, describe, expect, it } from 'vitest';
import { useAlarmStore } from '@/features/alarm/alarmStore';
import { hydrateAlarm, addAlarmSystemLive, logAlarmTestLive, reportAlarmFaultLive } from '@/features/alarm/alarmApi';
import { seedAlarmSystems, alarmForAsociatie } from '@/features/alarm/alarmLogic';
import { DEMO_ASOCIATIE, DEMO_ALARM_SYSTEMS } from '@/shared/demo/demoData';
import type { AlarmSystem } from '@/shared/types/domain';

// alarmApi offline-path tests (T218).

const ASOC = DEMO_ASOCIATIE.id;

function makeSystem(overrides?: Partial<AlarmSystem>): AlarmSystem {
  return { id: `al-t-${Date.now()}`, asociatie_id: ASOC, name: 'Sistem test', status: 'ok', last_test: null, events: [], ...overrides };
}

beforeEach(() => {
  useAlarmStore.setState({ byAsociatie: seedAlarmSystems(), fetchError: null });
});

describe('hydrateAlarm', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useAlarmStore.getState().byAsociatie;
    await hydrateAlarm(ASOC);
    expect(useAlarmStore.getState().byAsociatie).toBe(before);
    expect(useAlarmStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useAlarmStore.getState().byAsociatie;
    await hydrateAlarm('');
    expect(useAlarmStore.getState().byAsociatie).toBe(before);
  });
});

describe('addAlarmSystemLive', () => {
  it('prepends the system synchronously', () => {
    const before = alarmForAsociatie(useAlarmStore.getState().byAsociatie, ASOC).length;
    const system = makeSystem();
    addAlarmSystemLive(ASOC, system);
    const after = alarmForAsociatie(useAlarmStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(system.id);
  });
});

describe('logAlarmTestLive', () => {
  it('sets status to "ok" and updates last_test synchronously', () => {
    const id = DEMO_ALARM_SYSTEMS[0].id;
    logAlarmTestLive(ASOC, id);
    const sys = alarmForAsociatie(useAlarmStore.getState().byAsociatie, ASOC).find((s) => s.id === id);
    expect(sys?.status).toBe('ok');
    expect(sys?.last_test).toBeTruthy();
  });
});

describe('reportAlarmFaultLive', () => {
  it('sets status to "defect" synchronously', () => {
    const id = DEMO_ALARM_SYSTEMS[0].id;
    reportAlarmFaultLive(ASOC, id);
    const sys = alarmForAsociatie(useAlarmStore.getState().byAsociatie, ASOC).find((s) => s.id === id);
    expect(sys?.status).toBe('defect');
  });
});
