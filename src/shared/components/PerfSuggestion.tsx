import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { usePerfStore } from '@/shared/store/perfStore';

export function PerfSuggestion() {
  const { t } = useTranslation();
  const pref = usePerfStore((s) => s.pref);
  const autoSuggested = usePerfStore((s) => s.autoSuggested);
  const lowEndDetected = usePerfStore((s) => s.lowEndDetected);
  const setPref = usePerfStore((s) => s.setPref);
  const markSuggested = usePerfStore((s) => s.markSuggested);

  if (!lowEndDetected || pref !== null || autoSuggested) return null;

  function handleSwitch() {
    setPref('full');
    markSuggested();
  }

  return (
    <div className="perf-suggestion" role="status" aria-live="polite">
      <span className="perf-suggestion__icon" aria-hidden="true">
        <Zap size={14} />
      </span>
      <span className="perf-suggestion__message">
        <strong>{t('chrome.userMenu.perfSuggestTitle')}</strong>
        {' '}
        {t('chrome.userMenu.perfSuggestBody')}
      </span>
      <button type="button" className="perf-suggestion__action" onClick={handleSwitch}>
        {t('chrome.userMenu.perfSuggestSwitch')}
      </button>
      <button
        type="button"
        className="perf-suggestion__dismiss"
        aria-label={t('chrome.userMenu.perfSuggestDismiss')}
        onClick={markSuggested}
      >
        &times;
      </button>
    </div>
  );
}
