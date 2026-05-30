import { create } from 'zustand';
import type { Ticket } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type NewTicketInput,
  type TicketsByAsociatie,
  addTicketIn,
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
 * active asociație's list. The demo store is the offline source of truth; live
 * read/write against `tickets` under RLS is T57.
 */
export const useTicketsStore = create<TicketsState>((set, get) => ({
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
}));

/** Hook: the tickets for the currently active asociație. */
export function useAsociatieTickets(): Ticket[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useTicketsStore((s) => ticketsForAsociatie(s.byAsociatie, asociatieId));
}
