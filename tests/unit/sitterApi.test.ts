import { describe, it, expect, beforeEach } from 'vitest';
import { useSitterStore } from '@/features/sitters/sitterStore';
import { hydrateSitters, saveSitterProfile, leaveSitterProfile } from '@/features/sitters/sitterApi';

const DEMO_ID = 'demo-asoc';

beforeEach(() => { useSitterStore.setState({ byAsociatie: { [DEMO_ID]: [] }, fetchError: null }); });

describe('sitterApi — offline path', () => {
  it('hydrateSitters is a no-op when unconfigured', async () => {
    await hydrateSitters(DEMO_ID);
    expect(useSitterStore.getState().fetchError).toBeNull();
  });

  it('hydrateSitters is a no-op when id is empty', async () => {
    await hydrateSitters('');
    expect(useSitterStore.getState().byAsociatie[DEMO_ID]).toEqual([]);
  });

  it('saveSitterProfile upserts synchronously', () => {
    const profile = { id: 'st-t1', asociatie_id: DEMO_ID, user_id: 'u1', user_name: 'Ana', kind: 'babysitting', availability: 'Seri', rate: '40 lei/h' };
    saveSitterProfile(DEMO_ID, profile);
    expect(useSitterStore.getState().byAsociatie[DEMO_ID][0]).toMatchObject({ kind: 'babysitting' });
  });

  it('leaveSitterProfile removes the profile synchronously', () => {
    const profile = { id: 'st-t1', asociatie_id: DEMO_ID, user_id: 'u1', user_name: 'Ana', kind: 'babysitting', availability: 'Seri', rate: '' };
    useSitterStore.setState({ byAsociatie: { [DEMO_ID]: [profile] }, fetchError: null });
    leaveSitterProfile(DEMO_ID, 'u1');
    expect(useSitterStore.getState().byAsociatie[DEMO_ID]).toHaveLength(0);
  });
});
