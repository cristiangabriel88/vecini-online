import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from '@/shared/store/auditStore';
import { useAuthStore } from '@/shared/store/authStore';
import {
  DEMO_PLATFORM_ADMIN,
  DEMO_PLATFORM_TEAM,
  type PlatformTeamAdmin,
  type PlatformTeamInvite,
} from './demoPlatform';

/**
 * Platform operator team management store (T251).
 *
 * Maintains the roster of platform superadmins and tracks pending invitations.
 * Demo mode seeds two fictional operators so the console runs fully offline.
 * Live reads are hydrated by `platformApi.hydrateTeam()`. Privileged writes
 * (invite / revoke) run through service-role Netlify functions that re-verify
 * `is_super_admin()` server-side; this store is the offline source of truth
 * and is updated optimistically after a successful function response.
 *
 * Persisted so roster changes survive a reload during a local dev session.
 */

function actingOperator(): { id: string; name: string } {
  const auth = useAuthStore.getState();
  return {
    id: auth.session?.user?.id ?? DEMO_PLATFORM_ADMIN.id,
    name: auth.profile?.full_name ?? DEMO_PLATFORM_ADMIN.name,
  };
}

interface PlatformTeamState {
  /** Current platform operator roster. */
  admins: PlatformTeamAdmin[];
  /** Pending invitations created this session (not yet redeemed). */
  pendingInvites: PlatformTeamInvite[];
  /** Set by the live hydration path when a fetch fails; null when healthy. */
  fetchError: string | null;
  /** Replace the admin roster with live data from the DB. */
  replaceAdmins: (admins: PlatformTeamAdmin[]) => void;
  /** Set or clear the fetch error. */
  setFetchError: (err: string | null) => void;
  /**
   * Record a new pending invitation in the local store (demo / optimistic
   * update path). Audits `platform.admin_invited`.
   */
  inviteAdmin: (name: string, email: string) => PlatformTeamInvite;
  /**
   * Remove an operator from the roster (demo / optimistic update path).
   * Guards against removing the last operator. Audits `platform.admin_revoked`.
   */
  revokeAdmin: (userId: string) => void;
  /** Remove a pending invite from the local list. */
  cancelInvite: (id: string) => void;
}

export const usePlatformTeamStore = create<PlatformTeamState>()(
  persist(
    (set, get) => ({
      admins: DEMO_PLATFORM_TEAM,
      pendingInvites: [],
      fetchError: null,

      replaceAdmins: (admins) => {
        set(() => ({ admins }));
      },

      setFetchError: (err) => {
        set(() => ({ fetchError: err }));
      },

      inviteAdmin: (name, email) => {
        const invite: PlatformTeamInvite = {
          id: crypto.randomUUID(),
          name,
          email,
          invitedAt: new Date().toISOString(),
        };
        set((s) => ({ pendingInvites: [...s.pendingInvites, invite] }));
        const operator = actingOperator();
        useAuditStore.getState().record({
          asociatie_id: 'platform',
          actor_user_id: operator.id,
          actor_name: operator.name,
          action: 'platform.admin_invited',
          entity: 'admin',
          entity_label: email,
          before: null,
          after: 'invited',
        });
        return invite;
      },

      revokeAdmin: (userId) => {
        const admin = get().admins.find((a) => a.userId === userId);
        if (!admin) return;
        if (get().admins.length <= 1) return;
        set((s) => ({ admins: s.admins.filter((a) => a.userId !== userId) }));
        const operator = actingOperator();
        useAuditStore.getState().record({
          asociatie_id: 'platform',
          actor_user_id: operator.id,
          actor_name: operator.name,
          action: 'platform.admin_revoked',
          entity: 'admin',
          entity_label: admin.email,
          before: 'platform_admin',
          after: 'revoked',
        });
      },

      cancelInvite: (id) => {
        set((s) => ({ pendingInvites: s.pendingInvites.filter((inv) => inv.id !== id) }));
      },
    }),
    {
      name: 'vecini.platform.team',
      version: 1,
      migrate: (persisted) => persisted as PlatformTeamState,
    },
  ),
);
