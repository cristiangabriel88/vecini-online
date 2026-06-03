import { describe, it, expect, beforeEach } from 'vitest';
import { useGroupBuyStore } from '@/features/groupbuys/groupBuyStore';
import { hydrateGroupBuys, addGroupBuyLive, joinGroupBuyLive } from '@/features/groupbuys/groupBuyApi';

const DEMO_ID = 'demo-asoc';
const BASE = { byAsociatie: { [DEMO_ID]: [] }, joinedIds: [], fetchError: null };

beforeEach(() => { useGroupBuyStore.setState(BASE); });

describe('groupBuyApi — offline path', () => {
  it('hydrateGroupBuys is a no-op when unconfigured', async () => {
    await hydrateGroupBuys(DEMO_ID);
    expect(useGroupBuyStore.getState().fetchError).toBeNull();
  });

  it('hydrateGroupBuys is a no-op when id is empty', async () => {
    await hydrateGroupBuys('');
    expect(useGroupBuyStore.getState().byAsociatie[DEMO_ID]).toEqual([]);
  });

  it('addGroupBuyLive prepends synchronously', () => {
    const buy = { id: 'gb-t1', asociatie_id: DEMO_ID, organizer_user_id: 'u1', organizer_name: 'Ion', title: 'Cartofi', description: '', deadline: '2099-12-31T23:59:59', created_at: '2026-06-01T00:00:00Z', signups: 0 };
    addGroupBuyLive(DEMO_ID, buy);
    expect(useGroupBuyStore.getState().byAsociatie[DEMO_ID][0]).toMatchObject({ title: 'Cartofi' });
  });

  it('joinGroupBuyLive increments signups and tracks joined id', () => {
    const buy = { id: 'gb-t1', asociatie_id: DEMO_ID, organizer_user_id: 'u2', organizer_name: 'Ana', title: 'Cartofi', description: '', deadline: '2099-12-31T23:59:59', created_at: '2026-06-01T00:00:00Z', signups: 2 };
    useGroupBuyStore.setState({ byAsociatie: { [DEMO_ID]: [buy] }, joinedIds: [], fetchError: null });
    joinGroupBuyLive(DEMO_ID, 'gb-t1', 'u3');
    const s = useGroupBuyStore.getState();
    expect(s.joinedIds).toContain('gb-t1');
    expect(s.byAsociatie[DEMO_ID][0].signups).toBe(3);
  });

  it('joinGroupBuyLive is idempotent (no double-increment)', () => {
    const buy = { id: 'gb-t1', asociatie_id: DEMO_ID, organizer_user_id: 'u2', organizer_name: 'Ana', title: 'Cartofi', description: '', deadline: '2099-12-31T23:59:59', created_at: '2026-06-01T00:00:00Z', signups: 2 };
    useGroupBuyStore.setState({ byAsociatie: { [DEMO_ID]: [buy] }, joinedIds: ['gb-t1'], fetchError: null });
    joinGroupBuyLive(DEMO_ID, 'gb-t1', 'u3');
    expect(useGroupBuyStore.getState().byAsociatie[DEMO_ID][0].signups).toBe(2);
  });
});
