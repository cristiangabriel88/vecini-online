import { describe, it, expect, beforeEach } from 'vitest';
import { useBarterStore } from '@/features/barter/barterStore';
import { hydrateBarter, saveOffering, leaveOffering } from '@/features/barter/barterApi';

const DEMO_ID = 'demo-asoc';

beforeEach(() => { useBarterStore.setState({ byAsociatie: { [DEMO_ID]: [] }, fetchError: null }); });

describe('barterApi — offline path', () => {
  it('hydrateBarter is a no-op when unconfigured', async () => {
    await hydrateBarter(DEMO_ID);
    expect(useBarterStore.getState().fetchError).toBeNull();
  });

  it('hydrateBarter is a no-op when id is empty', async () => {
    await hydrateBarter('');
    expect(useBarterStore.getState().byAsociatie[DEMO_ID]).toEqual([]);
  });

  it('saveOffering upserts synchronously', () => {
    const offering = { id: 'sk-t1', asociatie_id: DEMO_ID, user_id: 'u1', user_name: 'Ion', offers: 'Reparații bike', needs: 'Excel' };
    saveOffering(DEMO_ID, offering);
    expect(useBarterStore.getState().byAsociatie[DEMO_ID][0]).toMatchObject({ offers: 'Reparații bike' });
  });

  it('leaveOffering removes offering synchronously', () => {
    const offering = { id: 'sk-t1', asociatie_id: DEMO_ID, user_id: 'u1', user_name: 'Ion', offers: 'Bike', needs: '' };
    useBarterStore.setState({ byAsociatie: { [DEMO_ID]: [offering] }, fetchError: null });
    leaveOffering(DEMO_ID, 'u1');
    expect(useBarterStore.getState().byAsociatie[DEMO_ID]).toHaveLength(0);
  });
});
