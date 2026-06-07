import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GetStartedStoreState {
  /** Dismissed state keyed by `${userId}_${asociatieId}`. */
  dismissed: Record<string, boolean>;
  /** Whether this admin has dismissed the checklist for this building. */
  isDismissed: (userId: string, asociatieId: string) => boolean;
  /** Persist the dismiss action for this admin + building. */
  dismiss: (userId: string, asociatieId: string) => void;
}

export const useGetStartedStore = create<GetStartedStoreState>()(
  persist(
    (set, get) => ({
      dismissed: {},
      isDismissed: (userId, asociatieId) =>
        Boolean(get().dismissed[`${userId}_${asociatieId}`]),
      dismiss: (userId, asociatieId) =>
        set((s) => ({
          dismissed: { ...s.dismissed, [`${userId}_${asociatieId}`]: true },
        })),
    }),
    { name: 'vecini.getStarted' },
  ),
);
