import { beforeEach, describe, expect, it } from 'vitest';
import { useMaintenanceStore } from '@/features/maintenance/maintenanceStore';
import {
  hydrateMaintenance,
  addMaintenanceItem,
  markMaintenanceDone,
} from '@/features/maintenance/scheduledMaintenanceApi';
import { maintenanceForAsociatie, seedMaintenance } from '@/features/maintenance/maintenanceLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';

// scheduledMaintenanceApi offline-path tests (T213).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Key contracts:
//   - hydrateMaintenance: no-op when not configured / empty id
//   - addMaintenanceItem: prepends synchronously to the store
//   - markMaintenanceDone: updates last_done and next_due synchronously

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  useMaintenanceStore.setState({ byAsociatie: seedMaintenance(), fetchError: null });
});

describe('hydrateMaintenance', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useMaintenanceStore.getState().byAsociatie;
    await hydrateMaintenance(ASOC);
    expect(useMaintenanceStore.getState().byAsociatie).toBe(before);
    expect(useMaintenanceStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useMaintenanceStore.getState().byAsociatie;
    await hydrateMaintenance('');
    expect(useMaintenanceStore.getState().byAsociatie).toBe(before);
  });
});

describe('addMaintenanceItem', () => {
  it('prepends the item synchronously to the store', () => {
    const before = maintenanceForAsociatie(useMaintenanceStore.getState().byAsociatie, ASOC).length;
    addMaintenanceItem(ASOC, {
      title: 'Verificare stingatoare',
      vendor: 'PSI Serv',
      recurrence: 'Anual',
      nextDue: '2027-01-01',
      notes: '',
    });
    const after = maintenanceForAsociatie(useMaintenanceStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].title).toBe('Verificare stingatoare');
  });

  it('trims vendor and treats empty vendor as null', () => {
    const item = addMaintenanceItem(ASOC, {
      title: 'Deratizare',
      vendor: '  ',
      recurrence: 'Trimestrial',
      nextDue: '2027-03-01',
      notes: 'Note',
    });
    expect(item.vendor).toBeNull();
    expect(item.recurrence).toBe('Trimestrial');
    expect(item.notes).toBe('Note');
  });

  it('returns the created item with the correct asociatie_id', () => {
    const item = addMaintenanceItem(ASOC, {
      title: 'Curatenie ghene',
      vendor: '',
      recurrence: 'Lunar',
      nextDue: '2027-01-01',
      notes: '',
    });
    expect(item.asociatie_id).toBe(ASOC);
    expect(item.last_done).toBeNull();
  });
});

describe('markMaintenanceDone', () => {
  it('updates last_done and next_due synchronously', () => {
    const before = maintenanceForAsociatie(useMaintenanceStore.getState().byAsociatie, ASOC);
    const target = before[0];
    markMaintenanceDone(ASOC, target.id, 365);
    const after = maintenanceForAsociatie(useMaintenanceStore.getState().byAsociatie, ASOC);
    const updated = after.find((m) => m.id === target.id)!;
    const today = new Date().toISOString().slice(0, 10);
    expect(updated.last_done).toBe(today);
    expect(updated.next_due).not.toBe(target.next_due);
    expect(updated.next_due.length).toBe(10);
  });

  it('does not affect other items', () => {
    const before = maintenanceForAsociatie(useMaintenanceStore.getState().byAsociatie, ASOC);
    const target = before[0];
    const otherBefore = before.filter((m) => m.id !== target.id).map((m) => m.id);
    markMaintenanceDone(ASOC, target.id, 365);
    const after = maintenanceForAsociatie(useMaintenanceStore.getState().byAsociatie, ASOC);
    for (const id of otherBefore) {
      const orig = before.find((m) => m.id === id)!;
      const upd = after.find((m) => m.id === id)!;
      expect(upd.last_done).toBe(orig.last_done);
      expect(upd.next_due).toBe(orig.next_due);
    }
  });
});
