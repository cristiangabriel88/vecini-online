import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';

export function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="update-prompt" role="status" aria-live="polite">
      <span className="update-prompt__icon" aria-hidden="true">
        <RefreshCw size={15} />
      </span>
      <span className="update-prompt__message">{t('pwa.updateAvailable')}</span>
      <button
        type="button"
        className="update-prompt__action"
        onClick={() => void updateServiceWorker(true)}
      >
        {t('pwa.updateNow')}
      </button>
      <button
        type="button"
        className="update-prompt__dismiss"
        aria-label={t('pwa.updateLater')}
        onClick={() => setNeedRefresh(false)}
      >
        &times;
      </button>
    </div>
  );
}
