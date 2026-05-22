import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck, FileText, Cookie, ScrollText } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Switch } from '@/shared/components/Switch';
import { useConsentStore } from '@/shared/store/consentStore';
import { formatDateTime } from '@/shared/lib/format';
import {
  type ConsentCategory,
  type ConsentChoices,
  ALL_CATEGORIES,
  OPTIONAL_CATEGORIES,
  defaultChoices,
} from './consentLogic';

/** In-app consent management: review, change and audit privacy choices. */
export default function PrivacySettingsPage() {
  const { t } = useTranslation();
  const record = useConsentStore((s) => s.record);
  const history = useConsentStore((s) => s.history);
  const decide = useConsentStore((s) => s.decide);
  const reset = useConsentStore((s) => s.reset);
  const [draft, setDraft] = useState<ConsentChoices>(record?.choices ?? defaultChoices());

  const setCat = (cat: ConsentCategory, value: boolean) => setDraft((d) => ({ ...d, [cat]: value }));
  const save = () => {
    decide(draft);
    toast.success(t('consent.saved'));
  };
  const withdraw = () => {
    reset();
    setDraft(defaultChoices());
    toast.success(t('consent.withdrawn'));
  };

  return (
    <div>
      <PageHeader title={t('consent.settingsTitle')} subtitle={t('consent.settingsSubtitle')} />

      <Card title={t('consent.choicesTitle')}>
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
              <Switch checked={draft[cat]} onChange={(v) => setCat(cat, v)} label={t(`consent.${cat}`)} />
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <Button onClick={save}>{t('consent.save')}</Button>
          <Button variant="secondary" onClick={withdraw} disabled={!record}>
            {t('consent.withdraw')}
          </Button>
        </div>
      </Card>

      <Card title={t('consent.documentsTitle')} className="mt-4">
        <div className="consent-links">
          <Link className="consent-link" to="/confidentialitate">
            <ShieldCheck size={16} />
            <span>{t('consent.privacyLink')}</span>
          </Link>
          <Link className="consent-link" to="/cookies">
            <Cookie size={16} />
            <span>{t('consent.cookieLink')}</span>
          </Link>
          <Link className="consent-link" to="/termeni">
            <ScrollText size={16} />
            <span>{t('consent.termsLink')}</span>
          </Link>
        </div>
      </Card>

      <Card title={t('consent.historyTitle')} className="mt-4">
        {history.length === 0 ? (
          <p className="text-sm text-muted">{t('consent.historyEmpty')}</p>
        ) : (
          <ul className="consent-history">
            {[...history].reverse().map((r, i) => (
              <li key={`${r.decidedAt}-${i}`} className="consent-history__row">
                <FileText size={14} className="consent-history__icon" />
                <span className="consent-history__when">{formatDateTime(r.decidedAt)}</span>
                <span className="consent-history__cats">
                  {ALL_CATEGORIES.filter((c) => r.choices[c])
                    .map((c) => t(`consent.${c}`))
                    .join(', ')}
                </span>
                <span className="consent-history__ver">v{r.version}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
