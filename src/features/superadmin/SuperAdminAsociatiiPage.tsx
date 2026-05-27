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
import { usePlatformAsociatiiStore } from '@/platform/platformAsociatiiStore';
import {
  blankAdminInvite,
  isDormant,
  validateAdminInvite,
  type AdminInviteDraft,
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
  const inviteAdmin = usePlatformAsociatiiStore((s) => s.inviteAdmin);

  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<AdminInviteDraft>(blankAdminInvite());
  const [touched, setTouched] = useState(false);

  const { errors, value } = useMemo(() => validateAdminInvite(draft), [draft]);

  const openForm = () => {
    setDraft(blankAdminInvite());
    setTouched(false);
    setFormOpen(true);
  };

  const submit = () => {
    setTouched(true);
    if (!value) return;
    inviteAdmin(value.adminName, value.adminEmail);
    setFormOpen(false);
    toast.success(t('platform.addAsociatie.sent', { email: value.adminEmail }));
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t('platform.asociatii.copied'));
    } catch {
      toast.error(t('platform.asociatii.copyFailed'));
    }
  };

  const set = (key: keyof AdminInviteDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const fieldError = (key: keyof AdminInviteDraft) =>
    touched && errors[key] ? t(`platform.addAsociatie.err.${errors[key]}`) : undefined;

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
        <div className="space-y-3">
          <Input
            label={t('platform.addAsociatie.adminName')}
            placeholder={t('platform.addAsociatie.adminNamePlaceholder')}
            value={draft.adminName}
            onChange={set('adminName')}
            error={fieldError('adminName')}
            autoComplete="name"
          />
          <Input
            label={t('platform.addAsociatie.adminEmail')}
            type="email"
            autoComplete="off"
            placeholder={t('platform.addAsociatie.adminEmailPlaceholder')}
            value={draft.adminEmail}
            onChange={set('adminEmail')}
            error={fieldError('adminEmail')}
          />
        </div>
      </Modal>
    </div>
  );
}
