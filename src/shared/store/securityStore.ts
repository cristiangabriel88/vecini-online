import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  type AuthAuditEvent,
  type AuthEventType,
  MAX_LOCAL_EVENTS,
  buildAuthEvent,
} from '@/features/auth/authAudit';
import {
  type ThrottleState,
  emptyThrottle,
  registerFailure as throttleFail,
  registerSuccess as throttleOk,
  remainingLockMs,
  throttleKey,
} from '@/features/auth/loginThrottle';
import { useAuthStore } from './authStore';

/**
 * Security store (T03): login-attempt throttling and the auth audit-event
 * stream, in one persisted slice because both are per-device security state.
 *
 * The throttle map and the recent-events log are persisted so a temporary
 * lockout survives a page reload (otherwise it would be trivially bypassed) and
 * a resident can review recent activity offline. With a backend present, each
 * event is also mirrored, best-effort, into `auth_audit_events`; the local log
 * remains the source for the in-app activity list so demo mode still works.
 */
interface SecurityState {
  throttle: Record<string, ThrottleState>;
  events: AuthAuditEvent[];

  /** Remaining lockout for this email in ms (0 when sign-in is allowed). */
  lockRemainingMs: (email: string) => number;
  /** Record a failed sign-in; returns remaining lockout ms (>0 once locked). */
  registerFailure: (email: string) => number;
  /** Clear failures/lock after a successful sign-in. */
  registerSuccess: (email: string) => void;
  /** Append a privacy-safe audit event (and mirror it live, best-effort). */
  log: (type: AuthEventType, email?: string | null) => void;
  /** Most-recent-first view of the local activity log. */
  recentEvents: () => AuthAuditEvent[];
}

/** Mirror an event into the backend audit table; never throws to the caller. */
function mirrorLive(event: AuthAuditEvent): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      const { profile, memberships } = useAuthStore.getState();
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? profile?.id;
      if (!userId) return;
      await supabase.from('auth_audit_events').insert({
        user_id: userId,
        asociatie_id: memberships[0]?.asociatie_id ?? null,
        event_type: event.type,
        email_mask: event.emailMask,
      });
    } catch {
      /* audit mirroring is best-effort; the local log is authoritative for the UI */
    }
  })();
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      throttle: {},
      events: [],

      lockRemainingMs: (email) => {
        const state = get().throttle[throttleKey(email)] ?? emptyThrottle();
        return remainingLockMs(state, Date.now());
      },

      registerFailure: (email) => {
        const key = throttleKey(email);
        const now = Date.now();
        const next = throttleFail(get().throttle[key] ?? emptyThrottle(), now);
        set({ throttle: { ...get().throttle, [key]: next } });
        return remainingLockMs(next, now);
      },

      registerSuccess: (email) => {
        const key = throttleKey(email);
        set({ throttle: { ...get().throttle, [key]: throttleOk() } });
      },

      log: (type, email) => {
        const event = buildAuthEvent(type, email);
        set({ events: [event, ...get().events].slice(0, MAX_LOCAL_EVENTS) });
        mirrorLive(event);
      },

      recentEvents: () => get().events,
    }),
    { name: 'vecini.security' },
  ),
);
