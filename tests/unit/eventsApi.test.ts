import { beforeEach, describe, expect, it } from 'vitest';
import type { BuildingEvent } from '@/shared/types/domain';
import { useEventsStore } from '@/features/events/eventsStore';
import { hydrateEvents, rsvpEvent } from '@/features/events/eventsApi';

// eventsApi offline-path tests (T185).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Key contracts:
//   - hydrateEvents: no-op when not configured (store untouched)
//   - rsvpEvent: toggles the store and returns the new attending state

const ASOC = 'asoc-test';

const SEED: BuildingEvent[] = [
  {
    id: 'ev-a',
    asociatie_id: ASOC,
    title: 'Adunare',
    description: null,
    location: null,
    starts_at: '2026-06-05T18:00:00Z',
    ends_at: null,
    category: null,
    created_by: 'u-admin',
    created_at: '2026-05-01T09:00:00Z',
  },
];

beforeEach(() => {
  useEventsStore.setState({ byAsociatie: { [ASOC]: [...SEED] }, rsvps: {}, fetchError: null });
});

describe('hydrateEvents', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useEventsStore.getState().byAsociatie[ASOC];
    await hydrateEvents(ASOC, 'u-1');
    expect(useEventsStore.getState().byAsociatie[ASOC]).toBe(before);
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useEventsStore.getState().byAsociatie[ASOC];
    await hydrateEvents('', 'u-1');
    expect(useEventsStore.getState().byAsociatie[ASOC]).toBe(before);
  });
});

describe('rsvpEvent', () => {
  it('toggles the RSVP on then off and returns the new state', () => {
    expect(rsvpEvent('ev-a', 'u-1')).toBe(true);
    expect(useEventsStore.getState().rsvps['ev-a']).toBe(true);
    expect(rsvpEvent('ev-a', 'u-1')).toBe(false);
    expect(useEventsStore.getState().rsvps['ev-a']).toBeUndefined();
  });

  it('keeps RSVPs for other events independent', () => {
    rsvpEvent('ev-a', 'u-1');
    rsvpEvent('ev-b', 'u-1');
    expect(useEventsStore.getState().rsvps).toEqual({ 'ev-a': true, 'ev-b': true });
  });
});
