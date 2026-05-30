import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Ticket } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type NewTicketInput,
  type TicketsByAsociatie,
  addTicketIn,
  migrateTicketsState,
  newTicket,
  seedTickets,
  ticketsForAsociatie,
} from './ticketLogic';

interface TicketsState {
  /** Tickets per asociație, keyed by asociație id. */
  byAsociatie: TicketsByAsociatie;
  /** Non-null when the last live fetch failed; null in demo/offline mode or after a successful fetch. */
  fetchError: string | null;
  /** Submit a sesizare into one asociație, reported by the given user. */
  add: (asociatieId: string, reporterUserId: string, input: NewTicketInput) => void;
  /** Replace the full list for one asociație (used by live hydration). */
  replaceForAsociatie: (asociatieId: string, items: Ticket[]) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  /** The tickets for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => Ticket[];
}

/**
 * Sesizări / reclamații scoped per asociație (T49): the demo asociație is seeded
 * so the offline app is populated, and a submitted sesizare lands only in the
 * active asociație's list. Persisted so submitted tickets survive reload (T65);
 * version bumps reseed the demo asociație so stale demo content is refreshed.
 * Live read/write against `tickets` under RLS is T57.
 */
export const useTicketsStore = create<TicketsState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedTickets(),
      fetchError: null,
      add: (asociatieId, reporterUserId, input) =>
        set((s) => ({
          byAsociatie: addTicketIn(
            s.byAsociatie,
            asociatieId,
            newTicket(input, asociatieId, reporterUserId),
          ),
        })),
      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),
      setFetchError: (msg) => set({ fetchError: msg }),
      forAsociatie: (asociatieId) => ticketsForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.tickets',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateTicketsState(persisted) }),
    },
  ),
);

/** Hook: the tickets for the currently active asociație. */
export function useAsociatieTickets(): Ticket[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useTicketsStore((s) => ticketsForAsociatie(s.byAsociatie, asociatieId));
}
