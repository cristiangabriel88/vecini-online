import { describe, it, expect, beforeEach } from 'vitest';
import { useCarpoolStore } from '@/features/carpool/carpoolStore';
import { hydrateCarpool, saveCarpoolProfile, leaveCarpoolProfile } from '@/features/carpool/carpoolApi';

const DEMO_ID = 'demo-asoc';
const BASE = { byAsociatie: { [DEMO_ID]: [] }, fetchError: null };

beforeEach(() => { useCarpoolStore.setState(BASE); });

describe('carpoolApi — offline path', () => {
  it('hydrateCarpool is a no-op when unconfigured', async () => {
    await hydrateCarpool(DEMO_ID);
    expect(useCarpoolStore.getState().fetchError).toBeNull();
  });

  it('hydrateCarpool is a no-op when id is empty', async () => {
    await hydrateCarpool('');
    expect(useCarpoolStore.getState().byAsociatie[DEMO_ID]).toEqual([]);
  });

  it('saveCarpoolProfile upserts synchronously', () => {
    const profile = { id: 'cp-t1', asociatie_id: DEMO_ID, user_id: 'u1', user_name: 'Ion', destination: 'Pipera', schedule: 'L-V' };
    saveCarpoolProfile(DEMO_ID, profile);
    expect(useCarpoolStore.getState().byAsociatie[DEMO_ID][0]).toMatchObject({ destination: 'Pipera' });
  });

  it('leaveCarpoolProfile removes the profile synchronously', () => {
    const profile = { id: 'cp-t1', asociatie_id: DEMO_ID, user_id: 'u1', user_name: 'Ion', destination: 'Pipera', schedule: '' };
    useCarpoolStore.setState({ byAsociatie: { [DEMO_ID]: [profile] }, fetchError: null });
    leaveCarpoolProfile(DEMO_ID, 'u1');
    expect(useCarpoolStore.getState().byAsociatie[DEMO_ID]).toHaveLength(0);
  });
});
