import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/shared/store/authStore';
import { IDLE_TIMEOUT_MS, isRemembered } from '@/features/auth/sessionPersistence';

const ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
  'visibilitychange',
] as const;

/** Re-arm the timer at most this often so frequent events (mousemove) don't churn. */
const REARM_THROTTLE_MS = 1_000;

/**
 * Sign out an inactive resident after `IDLE_TIMEOUT_MS`, but only for a
 * non-remembered session. A device that chose "remember me" stays signed in
 * (bounded instead by the 30-day absolute cap in `authStore.init`), so this hook
 * is a no-op there. Demo mode is included so the behaviour is observable offline.
 *
 * Mounted once from `AppLayout`, alongside `useMfaEnforcement`. On timeout it
 * calls `signOut`, which clears the auth state and lets the route gate redirect
 * back to the login screen.
 */
export function useIdleTimeout(): void {
  const { t } = useTranslation();
  const signOut = useAuthStore((s) => s.signOut);
  const active = useAuthStore((s) => Boolean(s.session) || s.demo);

  useEffect(() => {
    if (!active || isRemembered()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastRearm = 0;

    const expire = () => {
      void signOut();
      toast(t('auth.idleSignedOut'));
    };

    const rearm = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(expire, IDLE_TIMEOUT_MS);
    };

    const onActivity = (e: Event) => {
      // A tab regaining focus counts as activity; losing it does not.
      if (e.type === 'visibilitychange' && document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRearm < REARM_THROTTLE_MS) return;
      lastRearm = now;
      rearm();
    };

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    rearm();

    return () => {
      if (timer) clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
    };
  }, [active, signOut, t]);
}
