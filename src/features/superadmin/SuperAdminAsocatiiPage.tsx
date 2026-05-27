import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Building2,
  Copy,
  Home as HomeIcon,
  KeyRound,
  Link2,
  Plus,
  QrCode as QrCodeIcon,
  UserCog,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { Badge } from '@/shared/components/Badge';
import { Card } from '@/shared/components/Card';
import { EmptyState } from '@/shared/components/EmptyState';
import { QrCode } from '@/shared/components/QrCode';
import { formatDate } from '@/shared/lib/format';
import { buildOnboardingLink } from '@/shared/lib/inviteCode';
import { env } from '@/shared/lib/env';
import {
  usePlatformAsociatiiStore,
  type PendingAdminInvite,
} from '@/platform/platformAsociatiiStore';
import {
  blankAdminInvite,
  isDormant,
  validateAdminInvite,
  type AdminInviteDraft,
} from '@/platform/platformProvisioningLogic';

/**
 * In-app superadmin console: two sections -- active associations and pending
 * admin invitations. Active associations show the normal card with members,
 * apartments and last sign-in. Pending invitations (PendingAdminInvite rows
 * from the platform store) show the admin name + email, invite status badge,
 * time-to-expiry, and a "View link & QR" button that opens a modal with the
 * setup link and a scannable QR code.
 */

type InviteDisplayStatus = 'pending' | 'sent' | 'expired';

function inviteDisplayStatus(invite: PendingAdminInvite, now = Date.now()): InviteDisplayStatus {
  if (invite.expiresAt < now) return 'expired';
  if (invite.emailSentAt !== null) return 'sent';
  return 'pending';
}

const STATUS_TONE: Record<InviteDisplayStatus, 'warning' | 'primary' | 'danger'> = {
  pending: 'warning',
  sent: 'primary',
  expired: 'danger',
};

export default function SuperAdminAsocatiiPage() {
  const { t } = useTranslation();
  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);
  const provisions = usePlatformAsociatiiStore((s) => s.provisions);
  const pendingInvites = usePlatformAsociatiiStore((s) => s.pendingInvites);
  const inviteAdmin = usePlatformAsociatiiStore((s) => s.inviteAdmin);

  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<AdminInviteDraft>(blankAdminInvite());
  const [touched, setTouched] = useState(false);
  const [linkModalInvite, setLinkModalInvite] = useState<PendingAdminInvite | null>(null);

  const { errors, value } = useMemo(() => validateAdminInvite(draft), [draft]);

  const statusLabels: Record<InviteDisplayStatus, string> = {
    pending: t('platform.asociatii.inviteStatusPending'),
    sent: t('platform.asociatii.inviteStatusSent'),
    expired: t('platform.asociatii.inviteStatusExpired'),
  };

  const getExpiryLabel = (inv: PendingAdminInvite): string => {
    const ms = inv.expiresAt - Date.now();
    if (ms <= 0) return t('platform.asociatii.expiredLabel');
    const hours = Math.floor(ms / 3_600_000);
    if (hours < 24) return t('platform.asociatii.expiresInHours', { count: Math.max(1, hours) });
    return t('platform.asociatii.expiresInDays', { count: Math.floor(ms / 86_400_000) });
  };

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

  const set = (key: keyof AdminInviteDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const fieldError = (key: keyof AdminInviteDraft) =>
    touched && errors[key] ? t(`platform.addAsociatie.err.${errors[key]}`) : undefined;

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t('platform.asociatii.linkCopied'));
    } catch {
      toast.error(t('platform.asociatii.copyFailed'));
    }
  };

  const linkModalLink = linkModalInvite
    ? buildOnboardingLink(env.residentAppUrl, linkModalInvite.setupToken)
    : '';

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('platform.asociatii.title')}
        subtitle={t('platform.asociatii.subtitle')}
        action={
          <Button onClick={openForm}>
            <Plus className="h-4 w-4" /> {t('platform.asociatii.provisionCta')}
          </Button>
        }
      />

      {/* ── Active associations ── */}
      <section aria-labelledby="active-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="active-heading" className="text-lg font-semibold">
            {t('platform.asociatii.activeTitle')}
          </h2>
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
      </section>

      {/* ── Pending invitations (not joined yet) ── */}
      <section aria-labelledby="pending-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="pending-heading" className="text-lg font-semibold">
            {t('platform.asociatii.pendingInvitesTitle')}
          </h2>
          <span className="text-sm text-muted">
            {t('platform.asociatii.count', { count: pendingInvites.length })}
          </span>
        </div>

        {pendingInvites.length === 0 ? (
          <EmptyState
            icon={<UserCog className="h-6 w-6" />}
            body={t('platform.asociatii.pendingInvitesEmpty')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pendingInvites.map((inv) => {
              const status = inviteDisplayStatus(inv);
              return (
                <Card key={inv.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-primary">
                      <UserCog className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold leading-snug">{inv.adminName}</h3>
                      <p className="mt-0.5 break-all text-xs text-muted">{inv.adminEmail}</p>
                    </div>
                    <Badge tone={STATUS_TONE[status]}>{statusLabels[status]}</Badge>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">{getExpiryLabel(inv)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLinkModalInvite(inv)}
                    >
                      <QrCodeIcon className="h-3.5 w-3.5" />
                      {t('platform.asociatii.viewLinkQr')}
                    </Button>
                  </div>

                  <p className="text-[10px] text-muted">
                    {t('platform.asociatii.invitedOn', { date: formatDate(inv.invitedAt) })}
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Link & QR modal ── */}
      <Modal
        open={Boolean(linkModalInvite)}
        onClose={() => setLinkModalInvite(null)}
        title={t('platform.asociatii.linkModalTitle')}
        footer={
          <Button variant="ghost" onClick={() => setLinkModalInvite(null)}>
            {t('platform.asociatii.cancel')}
          </Button>
        }
      >
        {linkModalInvite && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {linkModalInvite.adminName}{' '}
              <span className="break-all">({linkModalInvite.adminEmail})</span>
            </p>

            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                {t('platform.asociatii.setupLinkLabel')}
              </p>
              <div className="flex items-start gap-2 rounded-lg bg-surface-2 p-3">
                <Link2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted" />
                <code className="min-w-0 flex-1 break-all text-xs leading-relaxed">
                  {linkModalLink}
                </code>
                <button
                  type="button"
                  className="iconbtn mt-0.5 flex-shrink-0"
                  onClick={() => void copyLink(linkModalLink)}
                  aria-label={t('platform.asociatii.copyLink')}
                  title={t('platform.asociatii.copyLink')}
                >
                  <Copy size={15} />
                </button>
              </div>
            </div>

            <div className="flex justify-center pt-1">
              <QrCode value={linkModalLink} label={linkModalInvite.adminName} size={220} />
            </div>
          </div>
        )}
      </Modal>

      {/* ── New invite form modal ── */}
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
