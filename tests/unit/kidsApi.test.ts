import { describe, it, expect, beforeEach } from 'vitest';
import { useKidsStore } from '@/features/kids/kidsStore';
import { hydrateKids, addKidsEventLive } from '@/features/kids/kidsApi';

const DEMO_ID = 'demo-asoc';
const EMPTY_CAT = { ranges: [], events: [] };

beforeEach(() => {
  useKidsStore.setState({ byAsociatie: { [DEMO_ID]: EMPTY_CAT }, joinedIds: [], fetchError: null });
});

describe('kidsApi — offline path', () => {
  it('hydrateKids is a no-op when unconfigured', async () => {
    await hydrateKids(DEMO_ID);
    expect(useKidsStore.getState().fetchError).toBeNull();
  });

  it('hydrateKids is a no-op when id is empty', async () => {
    await hydrateKids('');
    expect(useKidsStore.getState().byAsociatie[DEMO_ID]).toEqual(EMPTY_CAT);
  });

  it('addKidsEventLive appends event synchronously', () => {
    const event = {
      id: 'ke-t1', asociatie_id: DEMO_ID, title: 'Joacă', date: '2026-06-10', time: '17:00',
      location: 'Curte', bucket: 'all' as const, note: '', interested: 0,
      organizer_user_id: 'u1', organizer_name: 'Ion', created_at: '2026-06-01T00:00:00Z',
    };
    addKidsEventLive(DEMO_ID, event);
    const events = useKidsStore.getState().byAsociatie[DEMO_ID].events;
    expect(events[0]).toMatchObject({ title: 'Joacă' });
  });
});
