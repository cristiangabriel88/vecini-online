import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle, Info, Megaphone, Plus, X, ShieldAlert } from 'lucide-react';
import { usePlatformBroadcastStore, type BroadcastDraft } from './platformBroadcastStore';
import { usePlatformAuthStore } from './platformAuthStore';
import { DEMO_PLATFORM_ADMIN } from './demoPlatform';
import type { PlatformBroadcast } from './demoPlatform';

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: ShieldAlert,
};

function BroadcastCard({ broadcast, onExpire }: { broadcast: PlatformBroadcast; onExpire: (id: string) => void }) {
  const { t } = useTranslation();
  const Icon = SEVERITY_ICONS[broadcast.severity];
  const isActive = !broadcast.expiredAt;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <article className={`platform-broadcast-card platform-broadcast-card--${broadcast.severity}${!isActive ? ' platform-broadcast-card--expired' : ''}`}>
      <div className="platform-broadcast-card__header">
        <span className={`platform-broadcast-card__severity platform-broadcast-card__severity--${broadcast.severity}`}>
          <Icon size={14} aria-hidden="true" />
          {t(`platform.broadcasts.severity.${broadcast.severity}`)}
        </span>
        <span className="platform-broadcast-card__target">
          {t(`platform.broadcasts.target.${broadcast.target}`)}
        </span>
        {isActive ? (
          <span className="platform-broadcast-card__status platform-broadcast-card__status--active">
            <CheckCircle size={12} aria-hidden="true" />
            {t('platform.broadcasts.statusActive')}
          </span>
        ) : (
          <span className="platform-broadcast-card__status platform-broadcast-card__status--expired">
            {t('platform.broadcasts.statusExpired')}
          </span>
        )}
      </div>
      <h3 className="platform-broadcast-card__title">{broadcast.title}</h3>
      <p className="platform-broadcast-card__body">{broadcast.body}</p>
      <div className="platform-broadcast-card__meta">
        <span>{t('platform.broadcasts.publishedOn', { date: fmtDate(broadcast.createdAt) })}</span>
        {broadcast.endsAt && (
          <span>{t('platform.broadcasts.expiresOn', { date: fmtDate(broadcast.endsAt) })}</span>
        )}
        {broadcast.expiredAt && (
          <span>{t('platform.broadcasts.expiredOn', { date: fmtDate(broadcast.expiredAt) })}</span>
        )}
      </div>
      {isActive && (
        <div className="platform-broadcast-card__actions">
          <button
            type="button"
            className="platform-btn platform-btn--ghost platform-btn--sm"
            onClick={() => onExpire(broadcast.id)}
          >
            <X size={14} aria-hidden="true" />
            {t('platform.broadcasts.expireCta')}
          </button>
        </div>
      )}
    </article>
  );
}

const BLANK_DRAFT: BroadcastDraft = {
  title: '',
  body: '',
  severity: 'info',
  target: 'all',
  endsAt: null,
};

function ComposeForm({ onPublished, onCancel }: { onPublished: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const demo = usePlatformAuthStore((s) => s.demo);
  const publish = usePlatformBroadcastStore((s) => s.publish);
  const [draft, setDraft] = useState<BroadcastDraft>(BLANK_DRAFT);
  const [errors, setErrors] = useState<Partial<Record<keyof BroadcastDraft, string>>>({});

  const validate = (): boolean => {
    const errs: Partial<Record<keyof BroadcastDraft, string>> = {};
    if (!draft.title.trim()) errs.title = t('platform.broadcasts.err.required');
    else if (draft.title.trim().length < 4) errs.title = t('platform.broadcasts.err.tooShort');
    if (!draft.body.trim()) errs.body = t('platform.broadcasts.err.required');
    else if (draft.body.trim().length < 10) errs.body = t('platform.broadcasts.err.tooShort');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const operatorId = demo ? DEMO_PLATFORM_ADMIN.id : 'live-operator';
    publish(draft, operatorId);
    setDraft(BLANK_DRAFT);
    setErrors({});
    onPublished();
  };

  return (
    <form className="platform-broadcast-compose" onSubmit={handleSubmit} noValidate>
      <h2 className="platform-broadcast-compose__title">
        <Megaphone size={16} aria-hidden="true" />
        {t('platform.broadcasts.composeTitle')}
      </h2>

      <div className="platform-form-row">
        <label className="platform-form-label" htmlFor="bc-title">
          {t('platform.broadcasts.fields.title')}
        </label>
        <input
          id="bc-title"
          className={`platform-input${errors.title ? ' platform-input--error' : ''}`}
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder={t('platform.broadcasts.fields.titlePlaceholder')}
          maxLength={200}
        />
        {errors.title && <span className="platform-form-err">{errors.title}</span>}
      </div>

      <div className="platform-form-row">
        <label className="platform-form-label" htmlFor="bc-body">
          {t('platform.broadcasts.fields.body')}
        </label>
        <textarea
          id="bc-body"
          className={`platform-input platform-textarea${errors.body ? ' platform-input--error' : ''}`}
          value={draft.body}
          rows={4}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          placeholder={t('platform.broadcasts.fields.bodyPlaceholder')}
          maxLength={1000}
        />
        {errors.body && <span className="platform-form-err">{errors.body}</span>}
      </div>

      <div className="platform-form-grid-2">
        <div className="platform-form-row">
          <label className="platform-form-label" htmlFor="bc-severity">
            {t('platform.broadcasts.fields.severity')}
          </label>
          <select
            id="bc-severity"
            className="platform-input"
            value={draft.severity}
            onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value as BroadcastDraft['severity'] }))}
          >
            <option value="info">{t('platform.broadcasts.severity.info')}</option>
            <option value="warning">{t('platform.broadcasts.severity.warning')}</option>
            <option value="critical">{t('platform.broadcasts.severity.critical')}</option>
          </select>
        </div>

        <div className="platform-form-row">
          <label className="platform-form-label" htmlFor="bc-target">
            {t('platform.broadcasts.fields.target')}
          </label>
          <select
            id="bc-target"
            className="platform-input"
            value={draft.target}
            onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value as BroadcastDraft['target'] }))}
          >
            <option value="all">{t('platform.broadcasts.target.all')}</option>
            <option value="admin">{t('platform.broadcasts.target.admin')}</option>
          </select>
        </div>
      </div>

      <div className="platform-form-row">
        <label className="platform-form-label" htmlFor="bc-ends-at">
          {t('platform.broadcasts.fields.endsAt')}
          <span className="platform-form-optional">{t('platform.broadcasts.fields.optional')}</span>
        </label>
        <input
          id="bc-ends-at"
          type="datetime-local"
          className="platform-input"
          value={draft.endsAt ? draft.endsAt.slice(0, 16) : ''}
          onChange={(e) =>
            setDraft((d) => ({ ...d, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))
          }
        />
        <span className="platform-form-hint">{t('platform.broadcasts.fields.endsAtHint')}</span>
      </div>

      <div className="platform-broadcast-compose__actions">
        <button type="submit" className="platform-btn platform-btn--primary">
          <Megaphone size={15} aria-hidden="true" />
          {t('platform.broadcasts.publishCta')}
        </button>
        <button type="button" className="platform-btn platform-btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

export default function PlatformBroadcastsPage() {
  const { t } = useTranslation();
  const broadcasts = usePlatformBroadcastStore((s) => s.broadcasts);
  const active = usePlatformBroadcastStore((s) => s.active());
  const past = usePlatformBroadcastStore((s) => s.past());
  const expire = usePlatformBroadcastStore((s) => s.expire);
  const [composing, setComposing] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  void broadcasts;

  const handlePublished = () => {
    setComposing(false);
    setSuccessId(`ok-${Date.now()}`);
    setTimeout(() => setSuccessId(null), 4000);
  };

  return (
    <div className="platform-page">
      <header className="platform-page__head">
        <h1 className="platform-page__title">{t('platform.broadcasts.title')}</h1>
        <p className="platform-page__subtitle">{t('platform.broadcasts.subtitle')}</p>
      </header>

      <div className="platform-page__toolbar">
        {!composing && (
          <button
            type="button"
            className="platform-btn platform-btn--primary"
            onClick={() => setComposing(true)}
          >
            <Plus size={15} aria-hidden="true" />
            {t('platform.broadcasts.newCta')}
          </button>
        )}
        {successId && (
          <span role="status" className="platform-broadcast-success">
            <CheckCircle size={15} aria-hidden="true" />
            {t('platform.broadcasts.publishedSuccess')}
          </span>
        )}
      </div>

      {composing && (
        <ComposeForm
          onPublished={handlePublished}
          onCancel={() => setComposing(false)}
        />
      )}

      <section aria-labelledby="bc-active-title">
        <h2 id="bc-active-title" className="platform-section-title">
          {t('platform.broadcasts.activeTitle')}
          {active.length > 0 && (
            <span className="platform-section-title__count">{active.length}</span>
          )}
        </h2>
        {active.length === 0 ? (
          <p className="platform-empty">{t('platform.broadcasts.emptyActive')}</p>
        ) : (
          <div className="platform-broadcast-list">
            {active.map((b) => (
              <BroadcastCard key={b.id} broadcast={b} onExpire={expire} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="bc-past-title">
          <h2 id="bc-past-title" className="platform-section-title">
            {t('platform.broadcasts.pastTitle')}
          </h2>
          <div className="platform-broadcast-list platform-broadcast-list--muted">
            {past.map((b) => (
              <BroadcastCard key={b.id} broadcast={b} onExpire={expire} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
