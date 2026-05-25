import { beforeEach, describe, expect, it } from 'vitest';
import { useApartmentsStore } from '@/features/admin/apartmentsStore';
import { newApartment, blankApartmentInput } from '@/features/admin/apartmentsLogic';
import { DEMO_APARTMENTS } from '@/shared/demo/demoData';

const ASOC = 'asoc-test';

function makeApt(numar: string) {
  return newApartment({ ...blankApartmentInput(), numar_apartament: numar }, ASOC);
}

describe('apartmentsStore — demo/offline path', () => {
  beforeEach(() => {
    // Isolate the test tenant; leave the seeded demo tenant untouched.
    useApartmentsStore.setState((s) => ({ byAsociatie: { ...s.byAsociatie, [ASOC]: [] } }));
  });

  it('seeds the demo asociație from DEMO_APARTMENTS', () => {
    const seeded = useApartmentsStore.getState().forAsociatie(DEMO_APARTMENTS[0].asociatie_id);
    expect(seeded).toHaveLength(DEMO_APARTMENTS.length);
  });

  it('addMany then sorts the asociație list', () => {
    useApartmentsStore.getState().addMany(ASOC, [makeApt('10'), makeApt('2')]);
    const list = useApartmentsStore.getState().forAsociatie(ASOC);
    expect(list.map((a) => a.numar_apartament)).toEqual(['2', '10']);
  });

  it('add appends a single apartment', () => {
    useApartmentsStore.getState().add(ASOC, makeApt('1'));
    expect(useApartmentsStore.getState().forAsociatie(ASOC)).toHaveLength(1);
  });

  it('update replaces an apartment by id', () => {
    const apt = makeApt('5');
    useApartmentsStore.getState().add(ASOC, apt);
    useApartmentsStore
      .getState()
      .update(ASOC, { ...apt, proprietar_principal_name: 'Nou Proprietar' });
    const list = useApartmentsStore.getState().forAsociatie(ASOC);
    expect(list[0].proprietar_principal_name).toBe('Nou Proprietar');
  });

  it('remove deletes an apartment by id', () => {
    const apt = makeApt('7');
    useApartmentsStore.getState().add(ASOC, apt);
    useApartmentsStore.getState().remove(ASOC, apt.id);
    expect(useApartmentsStore.getState().forAsociatie(ASOC)).toHaveLength(0);
  });

  it('returns a stable empty reference for unknown/null asociație', () => {
    const a = useApartmentsStore.getState().forAsociatie('nope');
    const b = useApartmentsStore.getState().forAsociatie(null);
    expect(a).toBe(b);
    expect(a).toHaveLength(0);
  });
});
