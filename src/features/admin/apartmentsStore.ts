import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Apartment } from '@/shared/types/domain';
import { DEMO_APARTMENTS } from '@/shared/demo/demoData';
import { useAuthStore } from '@/shared/store/authStore';
import { sortApartments } from './apartmentsLogic';

export type ApartmentsByAsociatie = Record<string, Apartment[]>;

/** Shared frozen empty list so selectors keep a stable reference (no churn). */
const EMPTY: Apartment[] = Object.freeze([] as Apartment[]) as Apartment[];

/** Seed the demo asociație so the offline registry is populated and explorable. */
function seedApartments(): ApartmentsByAsociatie {
  const byAsociatie: ApartmentsByAsociatie = {};
  for (const apt of DEMO_APARTMENTS) {
    (byAsociatie[apt.asociatie_id] ??= []).push(apt);
  }
  return byAsociatie;
}

function listFor(byAsociatie: ApartmentsByAsociatie, asociatieId: string | null): Apartment[] {
  if (!asociatieId) return EMPTY;
  return byAsociatie[asociatieId] ?? EMPTY;
}

interface ApartmentsState {
  /** Apartments per asociație, keyed by asociație id. */
  byAsociatie: ApartmentsByAsociatie;
  /** Add one apartment to an asociație's registry. */
  add: (asociatieId: string, apartment: Apartment) => void;
  /** Add several apartments at once (the first-setup bulk grid). */
  addMany: (asociatieId: string, apartments: Apartment[]) => void;
  /** Replace an apartment by id within its asociație. */
  update: (asociatieId: string, apartment: Apartment) => void;
  /** Remove an apartment by id from its asociație. */
  remove: (asociatieId: string, apartmentId: string) => void;
  /** Replace the whole list for an asociație (used to hydrate from the backend). */
  replaceAll: (asociatieId: string, apartments: Apartment[]) => void;
  forAsociatie: (asociatieId: string | null) => Apartment[];
}

/**
 * Apartment registry store (admin-managed building configuration). The demo
 * asociație is seeded so the offline app is populated; an admin's edits land in
 * the active asociație's list. Persisted so a building configured in demo mode
 * survives a reload. With a backend present, the dual-mode repository in
 * `apartmentsApi.ts` mirrors writes to the `apartments` table and hydrates reads
 * back into this store, which stays the synchronous source of truth for the UI.
 */
export const useApartmentsStore = create<ApartmentsState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedApartments(),
      add: (asociatieId, apartment) =>
        set((s) => ({
          byAsociatie: {
            ...s.byAsociatie,
            [asociatieId]: sortApartments([...(s.byAsociatie[asociatieId] ?? []), apartment]),
          },
        })),
      addMany: (asociatieId, apartments) =>
        set((s) => ({
          byAsociatie: {
            ...s.byAsociatie,
            [asociatieId]: sortApartments([...(s.byAsociatie[asociatieId] ?? []), ...apartments]),
          },
        })),
      update: (asociatieId, apartment) =>
        set((s) => ({
          byAsociatie: {
            ...s.byAsociatie,
            [asociatieId]: sortApartments(
              (s.byAsociatie[asociatieId] ?? []).map((a) =>
                a.id === apartment.id ? apartment : a,
              ),
            ),
          },
        })),
      remove: (asociatieId, apartmentId) =>
        set((s) => ({
          byAsociatie: {
            ...s.byAsociatie,
            [asociatieId]: (s.byAsociatie[asociatieId] ?? []).filter((a) => a.id !== apartmentId),
          },
        })),
      replaceAll: (asociatieId, apartments) =>
        set((s) => ({
          byAsociatie: { ...s.byAsociatie, [asociatieId]: sortApartments(apartments) },
        })),
      forAsociatie: (asociatieId) => listFor(get().byAsociatie, asociatieId),
    }),
    { name: 'vecini.apartments', version: 1 },
  ),
);

/** Hook: the apartments for the currently active asociație (sorted, stable). */
export function useAsociatieApartments(): Apartment[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useApartmentsStore((s) => listFor(s.byAsociatie, asociatieId));
}

/** Hook: a single apartment by id within the active asociație, or undefined. */
export function useApartment(apartmentId: string | undefined): Apartment | undefined {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useApartmentsStore((s) =>
    apartmentId ? listFor(s.byAsociatie, asociatieId).find((a) => a.id === apartmentId) : undefined,
  );
}
