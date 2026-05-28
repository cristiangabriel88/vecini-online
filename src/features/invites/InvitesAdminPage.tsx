import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Link2, Mail, QrCode as QrCodeIcon, Ticket, Trash2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { QrCode } from '@/shared/components/QrCode';
import { formatDate } from '@/shared/lib/format';
import { env, isProd } from '@/shared/lib/env';
import { useAuthStore } from '@/shared/store/authStore';
import { useInviteStore } from '@/shared/store/inviteStore';
import { recordAudit } from '@/shared/store/auditStore';
import { useAsociatieApartments } from '@/features/admin/apartmentsStore';
import {
  type InviteStatus,
  buildInviteLink,
  canEmailInvite,
  expiryFromPreset,
  validateInvite,
} from '@/features/invites/inviteLogic';
import { sendInviteEmail } from '@/features/invites/inviteEmailApi';
import { hydrateInviteDelivery } from '@/features/invites/inviteWriteApi';
import { isSupabaseConfigured, supabase } from '@/shared/lib/supabase';
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

const STATUS_TONE: Record<InviteStatus, 'success' | 'warning' | 'neutral' | 'danger'> = {
  ok: 'success',
  expired: 'warning',
  used: 'neutral',
  revoked: 'danger',
  unknown: 'neutral',
};

export default function InvitesAdminPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const invites = useInviteStore((s) => s.invites);
  const issue = useInviteStore((s) => s.issue);
  const revoke = useInviteStore((s) => s.revoke);
  const markEmailSent = useInviteStore((s) => s.markEmailSent);

  /** Set of invite IDs whose QR panel is currently open. */
  const [openQrs, setOpenQrs] = useState<Set<string>>(() => new Set());

  // DEV/DEMO: email outbox panel (MAIL_MODE=log)
  const [outboxOpen, setOutboxOpen] = useState(false);
  const [outboxRows, setOutboxRows] = useState<
    { id: string; to_email: string; subject: string; created_at: string }[]
  >([]);
  const fetchOutbox = useCallback(async () => {
    if (!asociatieId || !isSupabaseConfigured) return;
    const { data } = await supabase
      .from('email_outbox')
      .select('id, to_email, subject, created_at')
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setOutboxRows(data as typeof outboxRows);
  }, [asociatieId]);

  const apartments = useAsociatieApartments();

  // Apply a prefill handed over from the apartment surface exactly once, and
  // auto-issue the code when asked so the change is "saved" without an extra
  // click. The router state is then cleared so a refresh does not re-mint.
  // Hydrate delivery timestamps from the live DB on mount (T149).
  useEffect(() => {
    if (asociatieId && isSupabaseConfigured) {
      void hydrateInviteDelivery(asociatieId);
    }
  }, [asociatieId]);

  const prefillApplied = useRef(false);
  useEffect(() => {
    if (prefillApplied.current) return;
    const prefill = (location.state as { prefill?: InvitePrefill } | null)?.prefill;
    if (!prefill || !asociatieId) return;
    prefillApplied.current = true;
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
      toast.success(t('invites.autoIssued'));
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

  const onSendEmail = async (invite: (typeof list)[number]) => {
    const result = await sendInviteEmail({
      invite,
      locale: i18n.language,
    });
    if (!result.ok) {
      toast.error(t('invites.emailFailed'));
      return;
    }
    markEmailSent(invite.id);
    recordAudit({
      action: 'invite.email_sent',
      entity: 'invite',
      entity_label: invite.code,
      before: null,
      after: null,
    });
    toast.success(t('invites.emailSent', { email: invite.inviteeEmail ?? '' }));
  };

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error(t('invites.copyFailed'));
    }
  };

  const toggleQr = (id: string) => {
    setOpenQrs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const apartmentLabel = (id: string | null) => {
    if (!id) return null;
    const apt = apartments.find((a) => a.id === id);
    return apt ? t('invites.aptShort', { number: apt.numar_apartament, scara: apt.scara }) : id;
  };

  return (
    <div>
      <PageHeader title={t('invites.title')} subtitle={t('invites.subtitle')} />

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
                      onClick={() => copy(link, t('invites.linkCopied'))}
                    >
                      <Link2 className="h-4 w-4" /> {t('invites.copyLink')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleQr(invite.id)}
                      aria-expanded={openQrs.has(invite.id)}
                    >
                      <QrCodeIcon className="h-4 w-4" />
                      {openQrs.has(invite.id) ? t('invites.hideQr') : t('invites.showQr')}
                    </Button>
                    {status === 'ok' && canEmailInvite(invite) && (
                      <Button variant="ghost" size="sm" onClick={() => onSendEmail(invite)}>
                        <Mail className="h-4 w-4" />{' '}
                        {invite.emailSentAt ? t('invites.resendEmail') : t('invites.sendEmail')}
                      </Button>
                    )}
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
                  {invite.emailSentAt !== null &&
                    ` · ${t('invites.emailSentOn', { date: formatDate(invite.emailSentAt) })}`}
                  {invite.consumedAt !== null &&
                    ` · ${t('invites.consumedOn', { date: formatDate(invite.consumedAt) })}`}
                  {invite.emailDeliveredAt !== null &&
                    ` · ${t('invites.emailDeliveredOn', { date: formatDate(invite.emailDeliveredAt) })}`}
                </p>
                {openQrs.has(invite.id) && (
                  <div className="mt-3">
                    <QrCode value={link} label={invite.code} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {!isProd() && (
        <div className="mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!outboxOpen) void fetchOutbox();
              setOutboxOpen((o) => !o);
            }}
          >
            {t('invites.outboxToggle')}
          </Button>
          {outboxOpen && (
            <Card className="mt-2">
              <h3 className="mb-3 text-sm font-semibold text-muted">
                {t('invites.outboxTitle')}
              </h3>
              {outboxRows.length === 0 ? (
                <p className="text-sm text-muted">{t('invites.outboxEmpty')}</p>
              ) : (
                <ul className="space-y-2">
                  {outboxRows.map((row) => (
                    <li key={row.id} className="text-sm">
                      <span className="font-mono text-xs text-muted">
                        {new Date(row.created_at).toLocaleString()}
                      </span>{' '}
                      <span className="text-muted">{row.to_email}</span>
                      {' — '}
                      {row.subject}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
