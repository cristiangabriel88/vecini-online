import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '@/shared/store/authStore';
import {
  DEMO_CURRENT_APARTMENT_ID,
  DEMO_CURRENT_USER_ID,
  DEMO_CURRENT_USER_NAME,
} from '@/shared/demo/demoData';
import { type ProfileData, emptyProfile } from './profileLogic';

/** A plausible offline identity so the demo profile is populated, not empty. */
const DEMO_EMAIL = 'andrei.popescu@vecini.online';

function demoProfile(): ProfileData {
  return {
    ...emptyProfile(DEMO_CURRENT_USER_ID, DEMO_EMAIL),
    fullName: DEMO_CURRENT_USER_NAME,
    displayName: 'Andrei',
    phone: '+40 721 234 567',
    apartmentId: DEMO_CURRENT_APARTMENT_ID,
    scara: 'A',
    etaj: '1',
  };
}

interface ProfileState {
  /** Profiles keyed by user id. */
  byUser: Record<string, ProfileData>;
  /** The stored profile for a user, or a fresh empty one (non-mutating). */
  get: (userId: string, email: string) => ProfileData;
  /** Persist a full profile, keyed by its `userId`. */
  save: (profile: ProfileData) => void;
}

/**
 * F66 profiles persisted per user (`intrevecini.profile`), seeded with the demo
 * resident so the offline editor is populated. The demo store is the offline
 * source of truth; live read/write against the extended `users` row +
 * `profile_custom_fields` under RLS is a documented follow-up (see BACKLOG.md).
 */
export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      byUser: { [DEMO_CURRENT_USER_ID]: demoProfile() },
      get: (userId, email) => get().byUser[userId] ?? emptyProfile(userId, email),
      save: (profile) =>
        set((s) => ({ byUser: { ...s.byUser, [profile.userId]: profile } })),
    }),
    { name: 'intrevecini.profile' },
  ),
);

/** The active user's identity: the live session/profile, or the demo resident. */
export function useMyIdentity(): { userId: string; email: string } {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const userId = profile?.id ?? session?.user?.id ?? DEMO_CURRENT_USER_ID;
  const email = profile?.email ?? session?.user?.email ?? DEMO_EMAIL;
  return { userId, email };
}
