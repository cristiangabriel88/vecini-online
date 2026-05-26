import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Copy, KeyRound, Link2, Ticket, Trash2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Switch } from '@/shared/components/Switch';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate } from '@/shared/lib/format';
import { env } from '@/shared/lib/env';
import { useAuthStore } from '@/shared/store/authStore';
import { useInviteStore } from '@/shared/store/inviteStore';
import { recordAudit } from '@/shared/store/auditStore';
import { useAsociatieApartments } from '@/features/admin/apartmentsStore';
import {
  type ExpiryPreset,
  type InviteStatus,
  INVITABLE_ROLES,
  buildInviteLink,
  expiryFromPreset,
  validateInvite,
} from '@/features/invites/inviteLogic';
import type { Role } from '@/shared/types/domain';

/** Prefill carried in router state when the apartment surface jumps here to
 *  invite a specific occupant (optionally auto-issuing the code). */
interface InvitePrefill {
  apartmentId?: string;
  role?: Role;
  inviteeName?: string;
  inviteeEmail?: string;
  autoIssue?: boolean;
}

const EXPIRY_PRESETS: ExpiryPreset[] = ['24h', '7d', '30d', '90d', 'never'];

const STATUS_TONE: Record<InviteStatus, 'success' | 'warning' | 'neutral' | 'danger'> = {
  ok: 'success',
  expired: 'warning',
  used: 'neutral',
  revoked: 'danger',
  unknown: 'neutral',
};

export default function InvitesAdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const invites = useInviteStore((s) => s.invites);
  const issue = useInviteStore((s) => s.issue);
  const revoke = useInviteStore((s) => s.revoke);

  const [role, setRole] = useState<Role>('proprietar');
  const [apartmentId, setApartmentId] = useState('');
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [expiry, setExpiry] = useState<ExpiryPreset>('30d');
  const [singleUse, setSingleUse] = useState(true);

  const apartments = useAsociatieApartments();

  // Apply a prefill handed over from the apartment surface exactly once, and
  // auto-issue the code when asked so the change is "saved" without an extra
  // click. The router state is then cleared so a refresh does not re-mint.
  const prefillApplied = useRef(false);
  useEffect(() => {
    if (prefillApplied.current) return;
    const prefill = (location.state as { prefill?: InvitePrefill } | null)?.prefill;
    if (!prefill || !asociatieId) return;
    prefillApplied.current = true;
    if (prefill.role) setRole(prefill.role);
    setApartmentId(prefill.apartmentId ?? '');
    setInviteeName(prefill.inviteeName ?? '');
    setInviteeEmail(prefill.inviteeEmail ?? '');
    if (prefill.autoIssue) {
      const invite = issue({
        asociatieId,
        role: prefill.role ?? 'proprietar',
        apartmentId: prefill.apartmentId || null,
        expiresAt: expiryFromPreset('30d'),
        singleUse: true,
        createdBy: userId,
        inviteeName: prefill.inviteeName ?? null,
        inviteeEmail: prefill.inviteeEmail ?? null,
      });
      recordAudit({
        action: 'invite.issued',
        entity: 'invite',
        entity_label: invite.code,
        before: null,
        after: invite.role,
      });
      toast.success(t('invites.autoIssued', { code: invite.code }));
    }
    navigate('.', { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, asociatieId]);

  // Re-derive (and re-sort, newest first) from the full store on every change.
  const list = useMemo(
    () =>
      invites
        .filter((invite) => invite.asociatieId === asociatieId)
        .sort((a, b) => b.createdAt - a.createdAt),
    [invites, asociatieId],
  );

  if (!asociatieId) {
    return (
      <div>
        <PageHeader title={t('invites.title')} subtitle={t('invites.subtitle')} />
        <EmptyState body={t('invites.noAsociatie')} />
      </div>
    );
  }

  const onIssue = () => {
    const invite = issue({
      asociatieId,
      role,
      apartmentId: apartmentId || null,
      expiresAt: expiryFromPreset(expiry),
      singleUse,
      createdBy: userId,
      inviteeName: inviteeName.trim() || null,
      inviteeEmail: inviteeEmail.trim() || null,
    });
    recordAudit({
      action: 'invite.issued',
      entity: 'invite',
      entity_label: invite.code,
      before: null,
      after: invite.role,
    });
    toast.success(t('invites.issued', { code: invite.code }));
  };

  const onRevoke = (id: string, code: string) => {
    revoke(id);
    recordAudit({
      action: 'invite.revoked',
      entity: 'invite',
      entity_label: code,
      before: 'ok',
      after: 'revoked',
    });
  };

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error(t('invites.copyFailed'));
    }
  };

  const apartmentLabel = (id: string | null) => {
    if (!id) return null;
    const apt = apartments.find((a) => a.id === id);
    return apt ? t('invites.aptShort', { number: apt.numar_apartament, scara: apt.scara }) : id;
  };

  return (
    <div>
      <PageHeader title={t('invites.title')} subtitle={t('invites.subtitle')} />

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">{t('invites.issueTitle')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('invites.role')}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`invites.role_${r}`)}
              </option>
            ))}
          </Select>
          <Select
            label={t('invites.apartment')}
            value={apartmentId}
            onChange={(e) => setApartmentId(e.target.value)}
          >
            <option value="">{t('invites.anyApartment')}</option>
            {apartments.map((a) => (
              <option key={a.id} value={a.id}>
                {t('invites.aptShort', { number: a.numar_apartament, scara: a.scara })}
              </option>
            ))}
          </Select>
          <Input
            label={t('invites.inviteeName')}
            value={inviteeName}
            onChange={(e) => setInviteeName(e.target.value)}
          />
          <Input
            type="email"
            label={t('invites.inviteeEmail')}
            value={inviteeEmail}
            onChange={(e) => setInviteeEmail(e.target.value)}
          />
          <Select
            label={t('invites.expiry')}
            value={expiry}
            onChange={(e) => setExpiry(e.target.value as ExpiryPreset)}
          >
            {EXPIRY_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {t(`invites.expiry_${preset}`)}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-3 self-end pb-1">
            <Switch
              label={t('invites.singleUse')}
              checked={singleUse}
              onChange={setSingleUse}
            />
            <span className="text-sm">
              {singleUse ? t('invites.singleUse') : t('invites.reusable')}
            </span>
          </label>
        </div>
        <div className="mt-4">
          <Button onClick={onIssue}>
            <KeyRound className="h-4 w-4" /> {t('invites.issue')}
          </Button>
        </div>
      </Card>

      <h2 className="mb-2 text-lg font-semibold">{t('invites.listTitle')}</h2>
      {list.length === 0 ? (
        <EmptyState icon={<Ticket className="h-6 w-6" />} body={t('invites.empty')} />
      ) : (
        <div className="space-y-3">
          {list.map((invite) => {
            const status = validateInvite(invite);
            const link = buildInviteLink(invite, env.appUrl);
            return (
              <Card key={invite.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <code className="rounded bg-surface-2 px-2 py-1 font-mono text-base font-semibold tracking-widest">
                    {invite.code}
                  </code>
                  <Badge tone={STATUS_TONE[status]}>{t(`invites.status_${status}`)}</Badge>
                  <Badge tone="primary">{t(`invites.role_${invite.role}`)}</Badge>
                  {invite.apartmentId && (
                    <Badge tone="neutral">{apartmentLabel(invite.apartmentId)}</Badge>
                  )}
                  {!invite.singleUse && (
                    <Badge tone="neutral">{t('invites.reusable')}</Badge>
                  )}
                  <div className="ml-auto flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(invite.code, t('invites.copied'))}
                    >
                      <Copy className="h-4 w-4" /> {t('invites.copy')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(link, t('invites.linkCopied'))}
                    >
                      <Link2 className="h-4 w-4" /> {t('invites.copyLink')}
                    </Button>
                    {status === 'ok' && (
                      <Button variant="danger" size="sm" onClick={() => onRevoke(invite.id, invite.code)}>
                        <Trash2 className="h-4 w-4" /> {t('invites.revoke')}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-2 break-all font-mono text-xs text-muted">{link}</p>
                <p className="mt-2 text-sm text-muted">
                  {t('invites.createdOn', { date: formatDate(invite.createdAt) })}
                  {' · '}
                  {invite.expiresAt === null
                    ? t('invites.neverExpires')
                    : t('invites.expiresOn', { date: formatDate(invite.expiresAt) })}
                  {invite.consumedAt !== null &&
                    ` · ${t('invites.consumedOn', { date: formatDate(invite.consumedAt) })}`}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
