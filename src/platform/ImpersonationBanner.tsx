import { useTranslation } from 'react-i18next';
import { Eye, LogOut } from 'lucide-react';
import { usePlatformImpersonationStore } from './platformImpersonationStore';

/**
 * Persistent amber banner shown whenever a superadmin has an active
 * impersonation session (T98). The banner makes the read-only diagnostic
 * mode unmistakably clear and provides the single exit action.
 */
export function ImpersonationBanner() {
  const { t } = useTranslation();
  const session = usePlatformImpersonationStore((s) => s.session);
  const endSession = usePlatformImpersonationStore((s) => s.endSession);
  const loading = usePlatformImpersonationStore((s) => s.loading);

  if (!session) return null;

  return (
    <div className="impersonation-banner" role="alert" aria-live="polite">
      <span className="impersonation-banner__icon" aria-hidden="true">
        <Eye size={15} />
      </span>
      <span className="impersonation-banner__text">
        {t('platform.impersonation.banner', { name: session.asociatie_name })}
      </span>
      <span className="impersonation-banner__note">
        {t('platform.impersonation.bannerNote')}
      </span>
      <button
        className="impersonation-banner__exit"
        onClick={() => void endSession()}
        disabled={loading}
        aria-label={t('platform.impersonation.exitBtn')}
      >
        <LogOut size={13} />
        <span>{t('platform.impersonation.exitBtn')}</span>
      </button>
    </div>
  );
}
