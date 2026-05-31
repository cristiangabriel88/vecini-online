import { useTranslation } from 'react-i18next';
import { isDev, isDemo } from '@/shared/lib/env';

export function StageBanner() {
  const { t } = useTranslation();

  if (isDev()) {
    return (
      <div className="stage-banner stage-banner--dev" aria-label={t('chrome.stageBannerDev')}>
        {t('chrome.stageBannerDev')}
      </div>
    );
  }

  if (isDemo()) {
    return (
      <div className="stage-banner stage-banner--demo" aria-label={t('chrome.stageBannerDemo')}>
        {t('chrome.stageBannerDemo')}
      </div>
    );
  }

  return null;
}
