import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { useMfaStore } from '@/shared/store/mfaStore';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { env } from '@/shared/lib/env';
import { mfaEnforcementRedirect, requiresMfa } from '@/features/auth/mfaLogic';
import { hasAppElevation } from '@/features/auth/otpChannelApi';

/**
 * Enforce 2FA for privileged roles on the live (backed) path: a signed-in
 * admin/comitet/cenzor/president/super_admin is steered to the security page,
 * and cannot reach any other in-app route, until it has both enrolled a second
 * factor and satisfied the AAL2 challenge in this session (T02/T30/T102). Demo
 * mode has no real backend role, so it is never gated and stays fully
 * inspectable offline.
 *
 * The decision itself lives in the pure, unit-tested `mfaEnforcementRedirect`;
 * this hook only wires the live store/router state into it (resolving whether
 * the session has actually passed the second factor via `challengeRequired()`)
 * and performs the redirect. The AAL satisfaction is resolved fresh on every
 * navigation rather than cached, so when a re-gated session completes the in-app
 * step-up on the security page and returns into the shell, the gate re-checks
 * the now-elevated AAL and lets it through instead of bouncing it back (T112).
 */
export function useMfaEnforcement(): void {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const role = useAuthStore((s) => s.activeRole)();
  const loaded = useMfaStore((s) => s.loaded);
  const enrolled = useMfaStore((s) => s.enrolled);
  const load = useMfaStore((s) => s.load);
  const loadChannels = useMfaStore((s) => s.loadChannels);
  const liveEnabledChannels = useMfaStore((s) => s.liveEnabledChannels);
  const challengeRequired = useMfaStore((s) => s.challengeRequired);

  // An email-only second factor reports `enrolled = false` (that flag tracks the
  // native TOTP factor only), so the gate must also know about delivered
  // channels to avoid trapping an email-only privileged user (T295).
  const deliveredFactorEnrolled = Boolean(liveEnabledChannels['email']);

  useEffect(() => {
    void load();
    void loadChannels();
  }, [load, loadChannels]);

  useEffect(() => {
    let active = true;
    void (async () => {
      // Resolve whether this session has satisfied the AAL2 challenge, but only
      // for an enrolled live session in a privileged role (an un-enrolled
      // session is already gated by the enrolment check, a resident is never
      // gated, and demo mode has no real backend AAL). `undefined` leaves the
      // axis opt-out so the gate never steers on a flash of unknown AAL; only a
      // resolved `false` (enrolled but still at AAL1) re-gates the shell.
      const enforcement = env.securityEnforcement;
      let aalSatisfied: boolean | undefined;
      let app2faSatisfied: boolean | undefined;
      // The AAL probe only matters for strict enforcement; relaxed mode never
      // forces a redirect, so skip the network round-trip entirely.
      if (
        enforcement !== 'relaxed' &&
        isSupabaseConfigured &&
        loaded &&
        (enrolled || deliveredFactorEnrolled) &&
        requiresMfa(role)
      ) {
        // Decode the app_2fa_at claim for the app-managed elevation axis (T143).
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active) return;
        app2faSatisfied = hasAppElevation(session?.access_token) || undefined;
        // challengeRequired() checks both native AAL and app_2fa_at; use its
        // result for aalSatisfied so the gate correctly reflects either path.
        const needs = await challengeRequired();
        if (!active) return;
        aalSatisfied = !needs;
      }
      const target = mfaEnforcementRedirect({
        supabaseConfigured: isSupabaseConfigured,
        loaded,
        role,
        enrolled,
        deliveredFactorEnrolled,
        aalSatisfied,
        app2faSatisfied,
        pathname,
        enforcement,
      });
      if (active && target) navigate(target, { replace: true, state: { from: pathname + search } });
    })();
    return () => {
      active = false;
    };
  }, [loaded, enrolled, deliveredFactorEnrolled, role, pathname, search, challengeRequired, navigate]);
}
