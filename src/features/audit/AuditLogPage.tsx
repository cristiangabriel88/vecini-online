import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, History, ScrollText, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { useAuthStore } from '@/shared/store/authStore';
import { useAsociatieAudit } from '@/shared/store/auditStore';
import { formatDateTime } from '@/shared/lib/format';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import {
  type AuditAction,
  type AuditEntity,
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  auditToCsv,
  auditToJson,
  filterEntries,
  sortBySeqDesc,
  verifyChain,
} from './auditLogic';

/** Roles allowed to read the audit trail (mirrors the table RLS). */
const AUDIT_ADMIN_ROLES = ['admin', 'presedinte'] as const;

const ACTION_TONE: Record<AuditAction, 'success' | 'danger' | 'warning' | 'neutral'> = {
  'feature.enabled': 'success',
  'feature.disabled': 'neutral',
  'feature.request_dismissed': 'neutral',
  'invite.issued': 'success',
  'invite.revoked': 'danger',
  'invite.email_sent': 'success',
  'invite.redeemed': 'success',
  'dsr.completed': 'success',
  'dsr.rejected': 'danger',
  'breach.recorded': 'warning',
  'breach.advanced': 'warning',
  'announcement.published': 'success',
  'apartment.created': 'success',
  'apartment.updated': 'neutral',
  'apartment.deleted': 'danger',
  'building.updated': 'neutral',
  'asociatie.provisioned': 'success',
  'admin.provisioned': 'success',
  'document.uploaded': 'success',
  'document.deleted': 'danger',
  'ticket.submitted': 'success',
  'ticket.advanced': 'neutral',
  'aga.scheduled': 'success',
  'aga.opened': 'success',
  'aga.closed': 'neutral',
  'budget.proposed': 'success',
  'petition.created': 'success',
};

/** Trigger a client-side download of a text document. */
function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Admin-viewable, filterable audit trail (T09): an append-only, tamper-evident
 * record of state changes across the app (feature toggles, invites, GDPR
 * decisions, breaches, announcements). The chain integrity is re-verified on
 * every view so a reordered or edited entry is surfaced, and the trail exports
 * to JSON or CSV. Read-only and gated to admin / president, mirroring the RLS.
 */
export default function AuditLogPage() {
  const { t } = useTranslation();

  const activeRole = useAuthStore((s) => s.activeRole);
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId);
  const localAsociatii = useAuthStore((s) => s.localAsociatii);

  const entries = useAsociatieAudit();

  const role = activeRole();
  const canView = role !== null && (AUDIT_ADMIN_ROLES as readonly string[]).includes(role);

  const [action, setAction] = useState<AuditAction | 'all'>('all');
  const [entity, setEntity] = useState<AuditEntity | 'all'>('all');
  const [actor, setActor] = useState('');
  const [text, setText] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(
    () => sortBySeqDesc(filterEntries(entries, { action, entity, actor, text, from, to })),
    [entries, action, entity, actor, text, from, to],
  );

  // Integrity is checked over the full chain in stored order, not the filtered view.
  const integrity = useMemo(() => verifyChain(entries), [entries]);

  if (!canView) {
    return (
      <div>
        <PageHeader title={t('audit.title')} subtitle={t('audit.subtitle')} />
        <Card>
          <EmptyState
            icon={<ShieldAlert size={22} />}
            title={t('audit.noAccessTitle')}
            body={t('audit.noAccessBody')}
          />
        </Card>
      </div>
    );
  }

  const asociatieName =
    localAsociatii.find((a) => a.id === currentAsociatieId)?.name ?? DEMO_ASOCIATIE.name;

  const clearFilters = () => {
    setAction('all');
    setEntity('all');
    setActor('');
    setText('');
    setFrom('');
    setTo('');
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const exportJson = () =>
    downloadText(`audit-${stamp}.json`, auditToJson(filtered), 'application/json');
  const exportCsv = () =>
    downloadText(`audit-${stamp}.csv`, auditToCsv(filtered), 'text/csv;charset=utf-8');

  return (
    <div>
      <PageHeader
        title={t('audit.title')}
        subtitle={`${asociatieName} · ${t('audit.subtitle')}`}
      />

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {integrity.ok ? (
            <Badge tone="success">
              <ShieldCheck size={14} /> {t('audit.integrityOk')}
            </Badge>
          ) : (
            <Badge tone="danger">
              <ShieldX size={14} /> {t('audit.integrityBroken', { seq: integrity.brokenAt })}
            </Badge>
          )}
          <span className="text-sm text-muted">
            {t('audit.count', { count: entries.length })}
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportJson} disabled={!filtered.length}>
              <Download size={15} /> JSON
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download size={15} /> CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select label={t('audit.filterAction')} value={action} onChange={(e) => setAction(e.target.value as AuditAction | 'all')}>
            <option value="all">{t('audit.allActions')}</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`audit.action.${a}`)}
              </option>
            ))}
          </Select>
          <Select label={t('audit.filterEntity')} value={entity} onChange={(e) => setEntity(e.target.value as AuditEntity | 'all')}>
            <option value="all">{t('audit.allEntities')}</option>
            {AUDIT_ENTITIES.map((en) => (
              <option key={en} value={en}>
                {t(`audit.entity.${en}`)}
              </option>
            ))}
          </Select>
          <Input
            label={t('audit.filterActor')}
            placeholder={t('audit.filterActorPlaceholder')}
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          />
          <Input
            label={t('audit.filterText')}
            placeholder={t('audit.filterTextPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Input label={t('audit.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label={t('audit.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="mt-3">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            {t('audit.clear')}
          </Button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={<History size={22} />} body={t('audit.empty')} />
      ) : (
        <ul className="audit-list">
          {filtered.map((e) => (
            <li key={e.id} className="audit-row">
              <div className="audit-row__head">
                <Badge tone={ACTION_TONE[e.action]}>{t(`audit.action.${e.action}`)}</Badge>
                <span className="audit-row__entity">
                  <ScrollText size={14} /> {t(`audit.entity.${e.entity}`)}: {e.entity_label}
                </span>
                <span className="text-sm text-muted audit-row__when">{formatDateTime(e.at)}</span>
              </div>
              <p className="text-sm text-muted audit-row__meta">
                <span className="audit-row__actor">{e.actor_name}</span>
                {(e.before !== null || e.after !== null) && (
                  <span className="audit-row__change">
                    {' · '}
                    {e.before !== null ? e.before : '∅'} → {e.after !== null ? e.after : '∅'}
                  </span>
                )}
                <span className="audit-row__seq iv-mono"> · #{e.seq}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
