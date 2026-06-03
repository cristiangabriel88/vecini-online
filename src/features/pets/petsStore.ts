import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Pet } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type PetsByAsociatie,
  seedPets,
  petsForAsociatie,
  addPetIn,
  toggleLostIn,
  migratePetsState,
} from './petLogic';

interface PetsState {
  byAsociatie: PetsByAsociatie;
  fetchError: string | null;
  addPet: (asociatieId: string, pet: Pet) => void;
  toggleLost: (asociatieId: string, petId: string) => void;
  replaceForAsociatie: (asociatieId: string, pets: Pet[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const usePetsStore = create<PetsState>()(
  persist(
    (set) => ({
      byAsociatie: seedPets(),
      fetchError: null,

      addPet: (asociatieId, pet) =>
        set((s) => ({ byAsociatie: addPetIn(s.byAsociatie, asociatieId, pet) })),

      toggleLost: (asociatieId, petId) =>
        set((s) => ({ byAsociatie: toggleLostIn(s.byAsociatie, asociatieId, petId) })),

      replaceForAsociatie: (asociatieId, pets) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: pets } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.pets',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migratePetsState(persisted) }),
    },
  ),
);

export function useAsociatiePets(): Pet[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return usePetsStore((s) => petsForAsociatie(s.byAsociatie, asociatieId));
}
