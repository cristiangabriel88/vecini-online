import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { useMfaStore } from '@/shared/store/mfaStore';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { mfaEnforcementRedirect, requiresMfa } from '@/features/auth/mfaLogic';

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
  const { pathname } = useLocation();
  const role = useAuthStore((s) => s.memberships[0]?.role ?? null);
  const loaded = useMfaStore((s) => s.loaded);
  const enrolled = useMfaStore((s) => s.enrolled);
  const load = useMfaStore((s) => s.load);
  const challengeRequired = useMfaStore((s) => s.challengeRequired);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    void (async () => {
      // Resolve whether this session has satisfied the AAL2 challenge, but only
      // for an enrolled live session in a privileged role (an un-enrolled
      // session is already gated by the enrolment check, a resident is never
      // gated, and demo mode has no real backend AAL). `undefined` leaves the
      // axis opt-out so the gate never steers on a flash of unknown AAL; only a
      // resolved `false` (enrolled but still at AAL1) re-gates the shell.
      let aalSatisfied: boolean | undefined;
      if (isSupabaseConfigured && loaded && enrolled && requiresMfa(role)) {
        const needs = await challengeRequired();
        if (!active) return;
        aalSatisfied = !needs;
      }
      const target = mfaEnforcementRedirect({
        supabaseConfigured: isSupabaseConfigured,
        loaded,
        role,
        enrolled,
        aalSatisfied,
        pathname,
      });
      if (active && target) navigate(target, { replace: true });
    })();
    return () => {
      active = false;
    };
  }, [loaded, enrolled, role, pathname, challengeRequired, navigate]);
}
