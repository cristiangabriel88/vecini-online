import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { useMfaStore } from '@/shared/store/mfaStore';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { mfaEnforcementRedirect } from '@/features/auth/mfaLogic';

/**
 * Enforce 2FA for privileged roles on the live (backed) path: a signed-in
 * admin/comitet/cenzor/president/super_admin without a verified second factor is
 * steered to the security page until they enrol, and cannot reach any other
 * in-app route in the meantime. Demo mode has no real backend role, so it is
 * never gated and stays fully inspectable offline.
 *
 * The decision itself lives in the pure, unit-tested `mfaEnforcementRedirect`
 * (T02/T30); this hook only wires the live store/router state into it and
 * performs the redirect.
 */
export function useMfaEnforcement(): void {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = useAuthStore((s) => s.memberships[0]?.role ?? null);
  const loaded = useMfaStore((s) => s.loaded);
  const enrolled = useMfaStore((s) => s.enrolled);
  const load = useMfaStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const target = mfaEnforcementRedirect({
      supabaseConfigured: isSupabaseConfigured,
      loaded,
      role,
      enrolled,
      pathname,
    });
    if (target) navigate(target, { replace: true });
  }, [loaded, enrolled, role, pathname, navigate]);
}
