import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BuildingEvent } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type EventsByAsociatie,
  eventsForAsociatie,
  migrateEventsState,
  seedAttendees,
  seedEvents,
  toggleRsvp,
} from './eventsLogic';

interface EventsState {
  /** Events per asociație, keyed by asociație id. */
  byAsociatie: EventsByAsociatie;
  /** The current resident's RSVPs, keyed by (globally unique) event id. */
  rsvps: Record<string, boolean>;
  /** Seeded attendee base counts (other residents), keyed by event id. */
  attendees: Record<string, number>;
  /** Non-null when the last live fetch failed; null in demo/offline mode or after a successful fetch. */
  fetchError: string | null;
  /** Replace the full list for one asociație (used by live hydration). */
  replaceForAsociatie: (asociatieId: string, items: BuildingEvent[]) => void;
  /** Replace the RSVP map (used by live hydration of `event_rsvps`). */
  replaceRsvps: (rsvps: Record<string, boolean>) => void;
  /** Toggle the current resident's RSVP for one event. */
  toggleRsvp: (eventId: string) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  /** The events for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => BuildingEvent[];
}

/**
 * Events calendar (F08, T185) scoped per asociație: the demo asociație is seeded
 * so the offline app is populated. Persisted so RSVPs and any hydrated events
 * survive reload; version bumps reseed the demo asociație so stale demo content
 * is refreshed. Live read of `events` / `event_rsvps` under RLS is in
 * `eventsApi.ts`.
 */
export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedEvents(),
      rsvps: {},
      attendees: seedAttendees(),
      fetchError: null,
      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),
      replaceRsvps: (rsvps) => set({ rsvps }),
      toggleRsvp: (eventId) => set((s) => ({ rsvps: toggleRsvp(s.rsvps, eventId) })),
      setFetchError: (msg) => set({ fetchError: msg }),
      forAsociatie: (asociatieId) => eventsForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.events',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie, rsvps: s.rsvps }),
      migrate: (persisted) => ({
        byAsociatie: migrateEventsState(persisted),
        rsvps: (persisted as { rsvps?: Record<string, boolean> } | null)?.rsvps ?? {},
      }),
    },
  ),
);

/** Hook: the events for the currently active asociație. */
export function useAsociatieEvents(): BuildingEvent[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useEventsStore((s) => eventsForAsociatie(s.byAsociatie, asociatieId));
}
