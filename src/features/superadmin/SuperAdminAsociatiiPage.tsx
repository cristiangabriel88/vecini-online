import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Building2, Copy, Home as HomeIcon, KeyRound, Plus, UserCog, Users } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { Badge } from '@/shared/components/Badge';
import { Card } from '@/shared/components/Card';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate } from '@/shared/lib/format';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { usePlatformAsociatiiStore } from '@/platform/platformAsociatiiStore';
import {
  blankProvisionInput,
  isDormant,
  validateProvisionInput,
  type ProvisionInputDraft,
  type ProvisionResult,
} from '@/platform/platformProvisioningLogic';

/**
 * In-app superadmin console: asociații + admin provisioning. The role-aware demo
 * preview of the T94 console, rendered in the main app's chrome for the
 * `super_admin` persona. Lists every asociație and provisions a new one with its
 * first administrator (offline local store; the live privileged write is the T92
 * server function). Reuses the platform store + provisioning logic + the shared
 * `platform.asociatii.*` strings, so it stays in step with the separate-origin
 * console.
 */
export default function SuperAdminAsociatiiPage() {
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

      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('platform.asociatii.listTitle')}</h2>
        <span className="text-sm text-muted">
          {t('platform.asociatii.count', { count: asociatii.length })}
        </span>
      </div>

      {asociatii.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          body={t('platform.asociatii.empty')}
          action={
            <Button onClick={openForm}>
              <Plus className="h-4 w-4" /> {t('platform.asociatii.provisionCta')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {asociatii.map((a) => {
            const dormant = isDormant(a.lastAdminSignInAt);
            const prov = provisions[a.id];
            return (
              <Card key={a.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-primary">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold leading-snug">{a.name}</h3>
                    <p className="mt-0.5 text-xs text-muted">{a.city}</p>
                  </div>
                  <Badge tone={dormant ? 'warning' : 'success'}>
                    {dormant ? t('platform.asociatii.dormant') : t('platform.asociatii.active')}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {t('platform.asociatii.members', { count: a.members })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <HomeIcon className="h-3.5 w-3.5" />
                    {t('platform.asociatii.apartments', { count: a.apartments })}
                  </span>
                </div>

                <p className="text-xs text-muted">
                  {a.lastAdminSignInAt
                    ? t('platform.asociatii.lastSignIn', { date: formatDate(a.lastAdminSignInAt) })
                    : t('platform.asociatii.neverSignedIn')}
                </p>

                {prov && (
                  <div className="space-y-2 rounded-lg bg-surface-2 p-3">
                    <div className="flex items-start gap-2">
                      <UserCog className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-muted">
                          {t('platform.asociatii.adminLabel')}
                        </div>
                        <div className="text-sm font-medium">{prov.name}</div>
                        <div className="break-all text-xs text-muted">{prov.email}</div>
                      </div>
                      <Badge tone="warning">{t('platform.asociatii.pendingSetup')}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                        <KeyRound className="h-3 w-3" />
                        {t('platform.asociatii.setupCodeLabel')}
                      </span>
                      <code className="rounded bg-surface px-2 py-0.5 font-mono text-sm font-semibold tracking-widest">
                        {prov.setupCode}
                      </code>
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
                    <p className="text-[10px] text-muted">
                      {t('platform.asociatii.provisionedOn', { date: formatDate(prov.provisionedAt) })}
                    </p>
                  </div>
                )}
              </Card>
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
        <p className="mb-4 text-sm text-muted">{t('platform.asociatii.provisionLead')}</p>
        <div className="space-y-3">
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
        <p className="mt-4 text-xs text-muted">
          {isSupabaseConfigured
            ? t('platform.asociatii.liveNote')
            : t('platform.asociatii.demoNote')}
        </p>
      </Modal>

      <Modal
        open={result !== null}
        onClose={() => setResult(null)}
        title={t('platform.asociatii.resultTitle')}
        footer={<Button onClick={() => setResult(null)}>{t('platform.asociatii.done')}</Button>}
      >
        {result && (
          <div className="space-y-3">
            <p className="font-semibold">{result.asociatie.name}</p>
            <p className="text-sm text-muted">
              {t('platform.asociatii.resultBody', { name: result.admin.name })}
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                <KeyRound className="h-3 w-3" />
                {t('platform.asociatii.setupCodeLabel')}
              </span>
              <code className="rounded bg-surface-2 px-2 py-0.5 font-mono text-sm font-semibold tracking-widest">
                {result.admin.setupCode}
              </code>
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
