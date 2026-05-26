import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Tracks which users have completed (or skipped) the first-login welcome flow,
 * keyed by user id and persisted to `vecini.welcome`. This is client-side
 * first-run state, mirroring how `profileStore` keeps the offline profile: live
 * persistence of onboarding state on the `users` row is a documented follow-up.
 *
 * Storing the timestamp (rather than a bare boolean) keeps a record of when the
 * flow was finished, and an empty entry simply means "not yet seen".
 */
interface WelcomeState {
  /** ISO timestamps of when each user finished the welcome flow, by user id. */
  seenByUser: Record<string, string>;
  /** Whether the given user has already finished or skipped the welcome flow. */
  hasSeen: (userId: string) => boolean;
  /** Mark the welcome flow done for a user (idempotent; records the moment). */
  markSeen: (userId: string) => void;
}

export const useWelcomeStore = create<WelcomeState>()(
  persist(
    (set, get) => ({
      seenByUser: {},
      hasSeen: (userId) => Boolean(get().seenByUser[userId]),
      markSeen: (userId) =>
        set((s) =>
          s.seenByUser[userId]
            ? s
            : { seenByUser: { ...s.seenByUser, [userId]: new Date().toISOString() } },
        ),
    }),
    { name: 'vecini.welcome' },
  ),
);
