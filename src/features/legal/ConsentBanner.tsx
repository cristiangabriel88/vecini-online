import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { Switch } from '@/shared/components/Switch';
import { useConsentStore } from '@/shared/store/consentStore';
import {
  type ConsentCategory,
  type ConsentChoices,
  OPTIONAL_CATEGORIES,
  defaultChoices,
  needsDecision,
} from './consentLogic';

/**
 * GDPR / ePrivacy consent banner. Shows until the resident decides (or after the
 * policy version advances). Mounted globally so it covers every route, public or
 * authenticated. Uses plain anchors for the policy links so it needs no router
 * context.
 */
export function ConsentBanner() {
  const { t } = useTranslation();
  const record = useConsentStore((s) => s.record);
  const acceptAll = useConsentStore((s) => s.acceptAll);
  const rejectNonEssential = useConsentStore((s) => s.rejectNonEssential);
  const decide = useConsentStore((s) => s.decide);
  const [customize, setCustomize] = useState(false);
  const [draft, setDraft] = useState<ConsentChoices>(defaultChoices);

  if (!needsDecision(record)) return null;

  const setCat = (cat: ConsentCategory, value: boolean) =>
    setDraft((d) => ({ ...d, [cat]: value }));

  return (
    <div className="consent-banner" role="dialog" aria-modal="false" aria-label={t('consent.title')}>
      <div className="consent-banner__inner">
        <div className="consent-banner__head">
          <span className="consent-banner__icon" aria-hidden="true">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h2 className="consent-banner__title">{t('consent.title')}</h2>
            <p className="consent-banner__body">
              {t('consent.body')}{' '}
              <a href="/confidentialitate">{t('consent.privacyLink')}</a>
              {' · '}
              <a href="/cookies">{t('consent.cookieLink')}</a>
            </p>
          </div>
        </div>

        {customize && (
          <ul className="consent-cats">
            <li className="consent-cat">
              <div className="consent-cat__text">
                <span className="consent-cat__name">{t('consent.necessary')}</span>
                <span className="consent-cat__desc">{t('consent.necessaryDesc')}</span>
              </div>
              <span className="consent-cat__required">{t('consent.required')}</span>
            </li>
            {OPTIONAL_CATEGORIES.map((cat) => (
              <li key={cat} className="consent-cat">
                <div className="consent-cat__text">
                  <span className="consent-cat__name">{t(`consent.${cat}`)}</span>
                  <span className="consent-cat__desc">{t(`consent.${cat}Desc`)}</span>
                </div>
                <Switch
                  checked={draft[cat]}
                  onChange={(v) => setCat(cat, v)}
                  label={t(`consent.${cat}`)}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="consent-banner__actions">
          {customize ? (
            <button type="button" className="btn btn--primary" onClick={() => decide(draft)}>
              {t('consent.save')}
            </button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={() => setCustomize(true)}>
              {t('consent.customize')}
            </button>
          )}
          <button type="button" className="btn btn--secondary" onClick={() => rejectNonEssential()}>
            {t('consent.rejectNonEssential')}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => acceptAll()}>
            {t('consent.acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
