import { describe, it, expect, beforeEach } from 'vitest';
import { useWelcomeKitStore } from '@/features/welcomekit/welcomeKitStore';
import { hydrateWelcomeKit, addWelcomeKitItemLive } from '@/features/welcomekit/welcomeKitApi';

const DEMO_ID = 'demo-asoc';

beforeEach(() => {
  useWelcomeKitStore.setState({ byAsociatie: { [DEMO_ID]: [] }, doneIds: [], fetchError: null });
});

describe('welcomeKitApi — offline path', () => {
  it('hydrateWelcomeKit is a no-op when unconfigured', async () => {
    await hydrateWelcomeKit(DEMO_ID);
    expect(useWelcomeKitStore.getState().fetchError).toBeNull();
  });

  it('hydrateWelcomeKit is a no-op when id is empty', async () => {
    await hydrateWelcomeKit('');
    expect(useWelcomeKitStore.getState().byAsociatie[DEMO_ID]).toEqual([]);
  });

  it('addWelcomeKitItemLive appends to the store synchronously', () => {
    const item = { id: 'wk-t1', asociatie_id: DEMO_ID, order: 1, title: 'Citește regulamentul', body: 'Detalicat în secțiunea Documente.' };
    addWelcomeKitItemLive(DEMO_ID, item);
    const items = useWelcomeKitStore.getState().byAsociatie[DEMO_ID];
    expect(items[0]).toEqual(item);
  });
});
