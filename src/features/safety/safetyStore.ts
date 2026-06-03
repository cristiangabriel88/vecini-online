import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SafetyProfile } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type SafetyByUser,
  safetyForUser,
  seedSafetyByUser,
  setSafetyProfileIn,
  migrateSafetyState,
} from './safetyLogic';

interface SafetyState {
  byUser: SafetyByUser;
  fetchError: string | null;
  setProfile: (userId: string, profile: SafetyProfile) => void;
  replaceForUser: (userId: string, profile: SafetyProfile) => void;
  setFetchError: (msg: string | null) => void;
}

export const useSafetyStore = create<SafetyState>()(
  persist(
    (set) => ({
      byUser: seedSafetyByUser(),
      fetchError: null,

      setProfile: (userId, profile) =>
        set((s) => ({ byUser: setSafetyProfileIn(s.byUser, userId, profile) })),

      replaceForUser: (userId, profile) =>
        set((s) => ({ byUser: setSafetyProfileIn(s.byUser, userId, profile) })),

      setFetchError: (msg) => set({ fetchError: msg }),
    }),
    {
      name: 'vecini.safety',
      version: 1,
      partialize: (s) => ({ byUser: s.byUser }),
      migrate: (persisted) => ({ byUser: migrateSafetyState(persisted) }),
    },
  ),
);

export function useCurrentSafetyProfile(): SafetyProfile | null {
  const userId = useAuthStore((s) => s.session?.user?.id ?? 'u-res');
  return useSafetyStore((s) => safetyForUser(s.byUser, userId));
}
