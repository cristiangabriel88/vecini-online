import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Alert } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type AlertsByAsociatie,
  type NewAlertInput,
  addAlertIn,
  alertsForAsociatie,
  migrateAlertsState,
  newAlert,
  seedAlerts,
} from './alertsLogic';

interface AlertsState {
  /** Alerts per asociație, keyed by asociație id. */
  byAsociatie: AlertsByAsociatie;
  /** Non-null when the last live fetch failed; null in demo/offline mode or after a successful fetch. */
  fetchError: string | null;
  /** Record a sent alert into one asociație, authored by the given user. */
  add: (
    asociatieId: string,
    senderUserId: string,
    input: NewAlertInput,
    recipients: number,
  ) => void;
  /** Replace the full list for one asociație (used by live hydration). */
  replaceForAsociatie: (asociatieId: string, items: Alert[]) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  /** The alerts for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => Alert[];
}

/**
 * Emergency alerts (F03) scoped per asociație (T184): the demo asociație is
 * seeded so the offline app is populated, and a sent alert lands only in the
 * active asociație's list. Persisted so sent alerts survive reload; version
 * bumps reseed the demo asociație so stale demo content is refreshed. Live
 * read/write against `alerts` under RLS is in `alertsApi.ts`.
 */
export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedAlerts(),
      fetchError: null,
      add: (asociatieId, senderUserId, input, recipients) =>
        set((s) => ({
          byAsociatie: addAlertIn(
            s.byAsociatie,
            asociatieId,
            newAlert(input, asociatieId, senderUserId, recipients),
          ),
        })),
      replaceForAsociatie: (asociatieId, items) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),
      setFetchError: (msg) => set({ fetchError: msg }),
      forAsociatie: (asociatieId) => alertsForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.alerts',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateAlertsState(persisted) }),
    },
  ),
);

/** Hook: the alerts for the currently active asociație. */
export function useAsociatieAlerts(): Alert[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useAlertsStore((s) => alertsForAsociatie(s.byAsociatie, asociatieId));
}
