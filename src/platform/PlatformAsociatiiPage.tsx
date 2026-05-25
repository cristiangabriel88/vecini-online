import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Building2, Copy, Home as HomeIcon, KeyRound, Plus, UserCog, Users } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate } from '@/shared/lib/format';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { usePlatformAsociatiiStore } from './platformAsociatiiStore';
import {
  blankProvisionInput,
  isDormant,
  validateProvisionInput,
  type ProvisionInputDraft,
  type ProvisionResult,
} from './platformProvisioningLogic';

/**
 * Superadmin console: asociații + admin provisioning (T94). The first console
 * page — list every asociație on the platform and provision a new one with its
 * first administrator. The operator provisions admins; the admin then onboards
 * their own residents through the invite lifecycle (T41/T42). Offline this drives
 * the local platform store; the live privileged write is the T92 server function.
 */
export default function PlatformAsociatiiPage() {
  const { t } = useTranslation();
  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);
  const provisions = usePlatformAsociatiiStore((s) => s.provisions);
  const provision = usePlatformAsociatiiStore((s) => s.provision);

  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<ProvisionInputDraft>(blankProvisionInput());
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);

  const { errors, value } = useMemo(() => validateProvisionInput(draft), [draft]);

  const openForm = () => {
    setDraft(blankProvisionInput());
    setTouched(false);
    setFormOpen(true);
  };

  const submit = () => {
    setTouched(true);
    if (!value) return;
    const provisioned = provision(value);
    setFormOpen(false);
    setResult(provisioned);
    toast.success(t('platform.asociatii.success', { name: provisioned.asociatie.name }));
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t('platform.asociatii.copied'));
    } catch {
      toast.error(t('platform.asociatii.copyFailed'));
    }
  };

  const set = (key: keyof ProvisionInputDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const fieldError = (key: keyof ProvisionInputDraft) =>
    touched && errors[key] ? t(`platform.asociatii.err.${errors[key]}`) : undefined;

  return (
    <div>
      <PageHeader
        title={t('platform.asociatii.title')}
        subtitle={t('platform.asociatii.subtitle')}
        action={
          <Button onClick={openForm}>
            <Plus className="h-4 w-4" /> {t('platform.asociatii.provisionCta')}
          </Button>
        }
      />

      <div className="platform-asoc-listhead">
        <h2 className="platform-overview__sectionhead">{t('platform.asociatii.listTitle')}</h2>
        <span className="platform-asoc-count">
          {t('platform.asociatii.count', { count: asociatii.length })}
        </span>
      </div>

      {asociatii.length === 0 ? (
        <EmptyState
          icon={<Building2 size={22} />}
          body={t('platform.asociatii.empty')}
          action={
            <Button onClick={openForm}>
              <Plus className="h-4 w-4" /> {t('platform.asociatii.provisionCta')}
            </Button>
          }
        />
      ) : (
        <div className="platform-asoc-grid">
          {asociatii.map((a) => {
            const dormant = isDormant(a.lastAdminSignInAt);
            const prov = provisions[a.id];
            return (
              <article key={a.id} className="platform-asoc-card">
                <header className="platform-asoc-card__head">
                  <span className="platform-asoc-card__icon" aria-hidden="true">
                    <Building2 size={18} />
                  </span>
                  <div className="platform-asoc-card__title-wrap">
                    <h3 className="platform-asoc-card__title">{a.name}</h3>
                    <p className="platform-asoc-card__city">{a.city}</p>
                  </div>
                  <Badge tone={dormant ? 'warning' : 'success'}>
                    {dormant ? t('platform.asociatii.dormant') : t('platform.asociatii.active')}
                  </Badge>
                </header>

                <div className="platform-asoc-card__stats">
                  <span className="platform-asoc-stat">
                    <Users size={14} aria-hidden="true" />
                    {t('platform.asociatii.members', { count: a.members })}
                  </span>
                  <span className="platform-asoc-stat">
                    <HomeIcon size={14} aria-hidden="true" />
                    {t('platform.asociatii.apartments', { count: a.apartments })}
                  </span>
                </div>

                <p className="platform-asoc-card__signin">
                  {a.lastAdminSignInAt
                    ? t('platform.asociatii.lastSignIn', { date: formatDate(a.lastAdminSignInAt) })
                    : t('platform.asociatii.neverSignedIn')}
                </p>

                {prov && (
                  <div className="platform-asoc-card__admin">
                    <div className="platform-asoc-card__admin-head">
                      <span className="platform-asoc-card__admin-icon" aria-hidden="true">
                        <UserCog size={14} />
                      </span>
                      <div className="platform-asoc-card__admin-meta">
                        <span className="platform-asoc-card__admin-label">
                          {t('platform.asociatii.adminLabel')}
                        </span>
                        <span className="platform-asoc-card__admin-name">{prov.name}</span>
                        <span className="platform-asoc-card__admin-email">{prov.email}</span>
                      </div>
                      <Badge tone="warning">{t('platform.asociatii.pendingSetup')}</Badge>
                    </div>
                    <div className="platform-asoc-card__code">
                      <span className="platform-asoc-card__code-label">
                        <KeyRound size={13} aria-hidden="true" />
                        {t('platform.asociatii.setupCodeLabel')}
                      </span>
                      <code className="platform-asoc-card__code-value">{prov.setupCode}</code>
                      <button
                        type="button"
                        className="iconbtn"
                        onClick={() => void copyCode(prov.setupCode)}
                        aria-label={t('platform.asociatii.copyCode')}
                        title={t('platform.asociatii.copyCode')}
                      >
                        <Copy size={15} />
                      </button>
                    </div>
                    <p className="platform-asoc-card__provisioned">
                      {t('platform.asociatii.provisionedOn', { date: formatDate(prov.provisionedAt) })}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={t('platform.asociatii.provisionTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              {t('platform.asociatii.cancel')}
            </Button>
            <Button onClick={submit} disabled={touched && !value}>
              <UserCog className="h-4 w-4" /> {t('platform.asociatii.submit')}
            </Button>
          </>
        }
      >
        <p className="platform-asoc-form__lead">{t('platform.asociatii.provisionLead')}</p>
        <div className="platform-asoc-form">
          <Input
            label={t('platform.asociatii.fields.asociatieName')}
            placeholder={t('platform.asociatii.fields.asociatieNamePlaceholder')}
            value={draft.asociatieName}
            onChange={set('asociatieName')}
            error={fieldError('asociatieName')}
          />
          <Input
            label={t('platform.asociatii.fields.city')}
            placeholder={t('platform.asociatii.fields.cityPlaceholder')}
            value={draft.city}
            onChange={set('city')}
            error={fieldError('city')}
          />
          <Input
            label={t('platform.asociatii.fields.adminName')}
            placeholder={t('platform.asociatii.fields.adminNamePlaceholder')}
            value={draft.adminName}
            onChange={set('adminName')}
            error={fieldError('adminName')}
          />
          <Input
            label={t('platform.asociatii.fields.adminEmail')}
            type="email"
            autoComplete="off"
            placeholder={t('platform.asociatii.fields.adminEmailPlaceholder')}
            value={draft.adminEmail}
            onChange={set('adminEmail')}
            error={fieldError('adminEmail')}
          />
        </div>
        <p className="platform-asoc-form__note">
          {isSupabaseConfigured
            ? t('platform.asociatii.liveNote')
            : t('platform.asociatii.demoNote')}
        </p>
      </Modal>

      <Modal
        open={result !== null}
        onClose={() => setResult(null)}
        title={t('platform.asociatii.resultTitle')}
        footer={
          <Button onClick={() => setResult(null)}>{t('platform.asociatii.done')}</Button>
        }
      >
        {result && (
          <div className="platform-asoc-result">
            <p className="platform-asoc-result__name">{result.asociatie.name}</p>
            <p className="platform-asoc-result__body">
              {t('platform.asociatii.resultBody', { name: result.admin.name })}
            </p>
            <div className="platform-asoc-card__code">
              <span className="platform-asoc-card__code-label">
                <KeyRound size={13} aria-hidden="true" />
                {t('platform.asociatii.setupCodeLabel')}
              </span>
              <code className="platform-asoc-card__code-value">{result.admin.setupCode}</code>
            </div>
            <Button variant="ghost" onClick={() => void copyCode(result.admin.setupCode)}>
              <Copy className="h-4 w-4" /> {t('platform.asociatii.copyCode')}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
