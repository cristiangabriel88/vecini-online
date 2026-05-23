import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Check, Download, History, ShieldAlert, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { useAuthStore } from '@/shared/store/authStore';
import { useGdprStore } from '@/shared/store/gdprStore';
import { formatDateTime } from '@/shared/lib/format';
import { DEMO_ASOCIATIE, DEMO_CURRENT_USER_NAME } from '@/shared/demo/demoData';
import { isPending, pendingCount, sortRequests, type DsrStatus } from './gdprLogic';

const STATUS_TONE: Record<DsrStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  completed: 'success',
  rejected: 'danger',
};

/** Roles allowed to manage data-subject requests (mirrors the table RLS). */
const DSR_ADMIN_ROLES = ['admin', 'presedinte'] as const;

/**
 * Admin queue for the GDPR data-subject requests (T06): the association — the
 * data controller — reviews and actions residents' export and erasure requests,
 * with the actor + time recorded as an accountability trail. Erasure requests
 * arrive here because they are irreversible and may need a manual check before
 * the account is anonymized.
 */
export default function DsrAdminPage() {
  const { t } = useTranslation();

  const profile = useAuthStore((s) => s.profile);
  const activeRole = useAuthStore((s) => s.activeRole);
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId);
  const localAsociatii = useAuthStore((s) => s.localAsociatii);

  const requests = useGdprStore((s) => s.requests);
  const actionRequest = useGdprStore((s) => s.action);

  const asociatieId = currentAsociatieId ?? DEMO_ASOCIATIE.id;
  const actorName = profile?.full_name ?? DEMO_CURRENT_USER_NAME;
  const role = activeRole();
  const canManage = role !== null && (DSR_ADMIN_ROLES as readonly string[]).includes(role);

  const [notes, setNotes] = useState<Record<string, string>>({});

  const queue = useMemo(
    () => sortRequests(requests.filter((r) => r.asociatie_id === asociatieId)),
    [requests, asociatieId],
  );
  const pending = useMemo(() => pendingCount(queue), [queue]);

  if (!canManage) {
    return (
      <div>
        <PageHeader title={t('gdpr.adminTitle')} subtitle={t('gdpr.adminSubtitle')} />
        <Card>
          <EmptyState
            icon={<ShieldAlert size={22} />}
            title={t('gdpr.noAccessTitle')}
            body={t('gdpr.noAccessBody')}
          />
        </Card>
      </div>
    );
  }

  const decide = (id: string, status: Extract<DsrStatus, 'completed' | 'rejected'>) => {
    const note = notes[id]?.trim() || null;
    actionRequest(id, status, actorName, note);
    setNotes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    toast.success(t(`gdpr.status.${status}`));
  };

  const asociatieName =
    localAsociatii.find((a) => a.id === currentAsociatieId)?.name ?? DEMO_ASOCIATIE.name;

  return (
    <div>
      <PageHeader
        title={t('gdpr.adminTitle')}
        subtitle={`${asociatieName} · ${t('gdpr.adminSubtitle')}`}
      />

      <Card>
        {pending > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Badge tone="warning">{t('gdpr.pendingBadge', { count: pending })}</Badge>
          </div>
        )}
        {queue.length === 0 ? (
          <EmptyState icon={<History size={22} />} body={t('gdpr.adminEmpty')} />
        ) : (
          <ul className="gdpr-queue">
            {queue.map((r) => (
              <li key={r.id} className="gdpr-queue__row" data-pending={isPending(r)}>
                <div className="gdpr-queue__head">
                  <span className="gdpr-queue__type">
                    {r.type === 'export' ? <Download size={15} /> : <Trash2 size={15} />}
                    {t(`gdpr.type.${r.type}`)}
                  </span>
                  <span className="gdpr-queue__subject">{r.subject_name}</span>
                  <span className="text-muted gdpr-queue__when">
                    {formatDateTime(r.requested_at)}
                  </span>
                  <Badge tone={STATUS_TONE[r.status]}>{t(`gdpr.status.${r.status}`)}</Badge>
                </div>

                {isPending(r) ? (
                  <div className="gdpr-queue__action">
                    <Input
                      label={t('gdpr.noteLabel')}
                      placeholder={t('gdpr.notePlaceholder')}
                      value={notes[r.id] ?? ''}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                    />
                    <div className="gdpr-queue__buttons">
                      <Button onClick={() => decide(r.id, 'completed')}>
                        <Check size={15} /> {t('gdpr.complete')}
                      </Button>
                      <Button variant="secondary" onClick={() => decide(r.id, 'rejected')}>
                        <X size={15} /> {t('gdpr.reject')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted gdpr-queue__trail">
                    {t('gdpr.colActioned')}: {formatDateTime(r.actioned_at ?? r.requested_at)}{' '}
                    {r.actioned_by && t('gdpr.actionedBy', { name: r.actioned_by })}
                    {r.note ? ` · ${r.note}` : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
