import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/shared/store/authStore';
import { Button } from '@/shared/components/Button';
import { usePlatformAuthStore } from './platformAuthStore';
import { resolvePlatformAccess } from './platformAuthLogic';

/**
 * Gate for the platform (superadmin) app shell (T93). It composes the shared
 * session signals with the server-verified `is_super_admin()` result and renders
 * the matching state: a loading hold while the session / check resolve, a
 * redirect to the platform login when unauthenticated, a clear denial when the
 * account is not a platform operator, and the console otherwise.
 */
export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const loading = useAuthStore((s) => s.loading);
  const session = useAuthStore((s) => s.session);
  const demo = usePlatformAuthStore((s) => s.demo);
  const verifying = usePlatformAuthStore((s) => s.verifying);
  const isSuperAdmin = usePlatformAuthStore((s) => s.isSuperAdmin);
  const verify = usePlatformAuthStore((s) => s.verify);
  const signOut = usePlatformAuthStore((s) => s.signOut);

  const access = resolvePlatformAccess({
    loading,
    demo,
    hasSession: Boolean(session),
    verifying,
    isSuperAdmin,
  });

  // Once a live session exists and has not been checked yet, ask the backend.
  useEffect(() => {
    if (!demo && session && isSuperAdmin === null && !verifying) void verify();
  }, [demo, session, isSuperAdmin, verifying, verify]);

  if (access === 'loading' || access === 'verifying') {
    return (
      <div className="platform-center text-muted">
        {t(access === 'verifying' ? 'platform.access.verifying' : 'common.loading')}
      </div>
    );
  }

  if (access === 'unauthenticated') return <Navigate to="/" replace />;

  if (access === 'denied') {
    return (
      <div className="platform-center">
        <div className="platform-denied">
          <span className="platform-denied__icon" aria-hidden="true">
            <ShieldAlert size={26} />
          </span>
          <h1 className="platform-denied__title">{t('platform.access.deniedTitle')}</h1>
          <p className="platform-denied__body">{t('platform.access.deniedBody')}</p>
          <Button variant="secondary" onClick={() => void signOut()}>
            {t('platform.access.signOut')}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
