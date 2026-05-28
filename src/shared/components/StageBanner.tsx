import { useTranslation } from 'react-i18next';
import { getStage } from '@/shared/lib/env';

export function StageBanner() {
  const { t } = useTranslation();
  const stage = getStage();
  if (stage === 'prod') return null;
  return (
    <div className={`stage-banner stage-banner--${stage}`} aria-hidden="true">
      {t(`auth.stageBanner.${stage}`)}
    </div>
  );
}
