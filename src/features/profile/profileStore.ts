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
    carPlate: 'B 12 ABC',
  };
}

const DEMO_PROFILE_FALLBACKS: Record<string, () => ProfileData> = {
  'u-res2': () => ({
    ...emptyProfile('u-res2', 'elena.g@example.ro'),
    fullName: 'Georgescu Elena',
    displayName: 'Elena',
    phone: '+40 722 333 444',
    scara: 'B',
    etaj: '2',
    carPlate: 'B 99 XYZ',
    customFields: [
      { id: 'cf-e1', label: 'Ocupație', type: 'text', value: 'Profesoară', options: [], visibility: 'neighbours', sortOrder: 0 },
      { id: 'cf-e2', label: 'Limbi vorbite', type: 'text', value: 'Română, franceză', options: [], visibility: 'neighbours', sortOrder: 1 },
    ],
  }),
  'u-res3': () => ({
    ...emptyProfile('u-res3', 'gabriela.stan@example.ro'),
    fullName: 'Stan Gabriela',
    displayName: 'Gabriela',
    phone: '+40 723 555 666',
    scara: 'C',
    etaj: '4',
    customFields: [
      { id: 'cf-g1', label: 'Hobby', type: 'text', value: 'Grădinărit', options: [], visibility: 'neighbours', sortOrder: 0 },
    ],
  }),
};

interface ProfileState {
  /** Profiles keyed by user id. */
  byUser: Record<string, ProfileData>;
  /** The stored profile for a user, or a fresh empty one (non-mutating). */
  get: (userId: string, email: string) => ProfileData;
  /** Persist a full profile, keyed by its `userId`. */
  save: (profile: ProfileData) => void;
}

/**
 * F66 profiles persisted per user (`vecini.profile`), seeded with the demo
 * resident so the offline editor is populated. The demo store is the offline
 * source of truth; live read/write against the extended `users` row +
 * `profile_custom_fields` under RLS is a documented follow-up (see BACKLOG.md).
 */
export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      byUser: { [DEMO_CURRENT_USER_ID]: demoProfile() },
      get: (userId, email) =>
        get().byUser[userId] ??
        DEMO_PROFILE_FALLBACKS[userId]?.() ??
        emptyProfile(userId, email),
      save: (profile) =>
        set((s) => ({ byUser: { ...s.byUser, [profile.userId]: profile } })),
    }),
    { name: 'vecini.profile' },
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
