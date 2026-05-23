import { useTranslation } from 'react-i18next';
import { ErrorState } from './ErrorState';

/**
 * The default localized fallback for `ErrorBoundary` (T07): friendly bilingual
 * copy, the support reference code, and retry / go-home actions. Lives in its
 * own file so the boundary module exports only the boundary component.
 */
export function DefaultErrorFallback({
  reference,
  reset,
}: {
  reference: string;
  reset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ErrorState
      title={t('common.errorTitle')}
      body={t('common.errorBody')}
      reference={reference || undefined}
      refLabel={t('common.errorRef')}
      action={
        <>
          <button type="button" className="btn btn--primary" onClick={reset}>
            {t('common.retry')}
          </button>
          <a className="btn btn--ghost" href="/app">
            {t('chrome.home')}
          </a>
        </>
      }
    />
  );
}
