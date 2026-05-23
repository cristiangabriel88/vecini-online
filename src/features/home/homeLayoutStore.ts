import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '@/shared/store/authStore';
import { useMyIdentity } from '@/features/profile/profileStore';
import {
  type HomeCard,
  type LayoutByKey,
  layoutForKey,
  layoutStorageKey,
} from './homeLayoutLogic';

interface HomeLayoutState {
  /** Saved layouts keyed by `${residentId}::${asociatieId}`. */
  byKey: LayoutByKey;
  /** Persist a resident's layout for one asociație. */
  save: (residentId: string, asociatieId: string, layout: HomeCard[]) => void;
  /** Drop a resident's saved layout so the home falls back to the default. */
  reset: (residentId: string, asociatieId: string) => void;
  /** The stored layout for a key (stable reference), or empty if none. */
  forKey: (key: string | null) => HomeCard[];
  /** Whether a resident has a saved (customized) layout for one asociație. */
  hasLayout: (key: string | null) => boolean;
}

/**
 * F67 home layouts persisted per resident + asociație (`intrevecini.home`), so a
 * personalized home survives a refresh and follows the resident across devices
 * once the live `home_layouts` table is wired (owner RLS). The demo store is the
 * offline source of truth; live read/write is a documented follow-up.
 */
export const useHomeLayoutStore = create<HomeLayoutState>()(
  persist(
    (set, get) => ({
      byKey: {},
      save: (residentId, asociatieId, layout) =>
        set((s) => ({
          byKey: { ...s.byKey, [layoutStorageKey(residentId, asociatieId)]: layout },
        })),
      reset: (residentId, asociatieId) =>
        set((s) => {
          const next = { ...s.byKey };
          delete next[layoutStorageKey(residentId, asociatieId)];
          return { byKey: next };
        }),
      forKey: (key) => layoutForKey(get().byKey, key),
      hasLayout: (key) => Boolean(key && get().byKey[key]),
    }),
    { name: 'intrevecini.home' },
  ),
);

/** The resolved storage key for the active resident + asociație, or null. */
export function useHomeLayoutKey(): string | null {
  const { userId } = useMyIdentity();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return asociatieId ? layoutStorageKey(userId, asociatieId) : null;
}
