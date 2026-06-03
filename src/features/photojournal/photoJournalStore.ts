import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectPhoto } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type PhotosByAsociatie,
  seedPhotos,
  photosForAsociatie,
  addPhotoIn,
  migratePhotosState,
} from './photoJournalLogic';

/** Demo identity of the signed-in resident (the journal author). */
export const DEMO_USER = { id: 'u-res', name: 'Popescu Andrei' };

interface PhotoJournalState {
  byAsociatie: PhotosByAsociatie;
  fetchError: string | null;
  addPhoto: (asociatieId: string, photo: ProjectPhoto) => void;
  replaceForAsociatie: (asociatieId: string, photos: ProjectPhoto[]) => void;
  setFetchError: (msg: string | null) => void;
}

export const usePhotoJournalStore = create<PhotoJournalState>()(
  persist(
    (set) => ({
      byAsociatie: seedPhotos(),
      fetchError: null,

      addPhoto: (asociatieId, photo) =>
        set((s) => ({ byAsociatie: addPhotoIn(s.byAsociatie, asociatieId, photo) })),

      replaceForAsociatie: (asociatieId, photos) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: photos } })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.photojournal',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migratePhotosState(persisted) }),
    },
  ),
);

export function useAsociatiePhotos(): ProjectPhoto[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return usePhotoJournalStore((s) => photosForAsociatie(s.byAsociatie, asociatieId));
}
