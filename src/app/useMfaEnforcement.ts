import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { useMfaStore } from '@/shared/store/mfaStore';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { mfaEnforcementRedirect } from '@/features/auth/mfaLogic';

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
 * and performs the redirect.
 */
export function useMfaEnforcement(): void {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = useAuthStore((s) => s.memberships[0]?.role ?? null);
  const loaded = useMfaStore((s) => s.loaded);
  const enrolled = useMfaStore((s) => s.enrolled);
  const load = useMfaStore((s) => s.load);
  const challengeRequired = useMfaStore((s) => s.challengeRequired);

  // Whether this session has satisfied the AAL2 challenge. `null` = not yet
  // resolved; the gate treats that as satisfied (no steer) so it never reacts to
  // a flash of unknown AAL. Only a resolved `false` (enrolled but still at AAL1)
  // re-gates the shell.
  const [aalSatisfied, setAalSatisfied] = useState<boolean | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  // Resolve AAL satisfaction once the enrolment status is known. Only relevant
  // for an enrolled live session (an un-enrolled session is already gated by the
  // enrolment check, and demo mode is never gated).
  useEffect(() => {
    if (!isSupabaseConfigured || !loaded || !enrolled) {
      setAalSatisfied(null);
      return;
    }
    let active = true;
    void challengeRequired().then((needs) => {
      if (active) setAalSatisfied(!needs);
    });
    return () => {
      active = false;
    };
  }, [loaded, enrolled, challengeRequired]);

  useEffect(() => {
    const target = mfaEnforcementRedirect({
      supabaseConfigured: isSupabaseConfigured,
      loaded,
      role,
      enrolled,
      aalSatisfied: aalSatisfied ?? true,
      pathname,
    });
    if (target) navigate(target, { replace: true });
  }, [loaded, enrolled, aalSatisfied, role, pathname, navigate]);
}
