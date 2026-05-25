import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { useAuthStore } from '@/shared/store/authStore';

/**
 * Platform-app access state (T93), layered on top of the shared `authStore`
 * session. The session itself (sign in / out, restore) is reused from the main
 * app's store; this store only owns the platform-specific question: is the
 * signed-in account a platform superadmin?
 *
 * That answer is server-authoritative — `is_super_admin()` reads the
 * `platform_admins` roster under SECURITY DEFINER (T91) — so the client never
 * asserts the role itself; it asks the backend. Offline, only the explicit demo
 * path grants access, so the showcase runs without a backend.
 */
interface PlatformAuthState {
  /** True for the offline demo superadmin session (no backend configured). */
  demo: boolean;
  /** True while the `is_super_admin()` check is in flight. */
  verifying: boolean;
  /** Server-side check result: null until it has run for the current session. */
  isSuperAdmin: boolean | null;
  /** Enter the offline demo console as a platform superadmin. */
  enterDemo: () => void;
  /** Re-verify super_admin status against the backend for the live session. */
  verify: () => Promise<void>;
  /** Sign out of both the platform access state and the shared session. */
  signOut: () => Promise<void>;
}

// Monotonic token so a slow verify cannot overwrite the result of a newer one
// (e.g. a sign-out that started while the rpc was still in flight).
let verifySeq = 0;

export const usePlatformAuthStore = create<PlatformAuthState>((set) => ({
  demo: false,
  verifying: false,
  isSuperAdmin: null,

  enterDemo: () => set({ demo: true, isSuperAdmin: true, verifying: false }),

  verify: async () => {
    // Offline: there is no roster to consult, so only the demo path grants
    // access. Leave the result unknown for a live-less session.
    if (!isSupabaseConfigured) return;
    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) {
      set({ isSuperAdmin: null, verifying: false });
      return;
    }
    const seq = ++verifySeq;
    set({ verifying: true });
    try {
      // Server-authoritative: is_super_admin() resolves the caller against the
      // platform_admins roster (T91). Any error is treated as "not a superadmin"
      // so a failed check never grants access.
      const { data, error } = await supabase.rpc('is_super_admin');
      if (seq !== verifySeq) return; // a newer verify / sign-out superseded this
      set({ isSuperAdmin: error ? false : Boolean(data) });
    } finally {
      if (seq === verifySeq) set({ verifying: false });
    }
  },

  signOut: async () => {
    verifySeq++; // invalidate any in-flight verify for the old session
    await useAuthStore.getState().signOut();
    set({ demo: false, isSuperAdmin: null, verifying: false });
  },
}));
