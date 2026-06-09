import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  History,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { DatePicker } from '@/shared/components/DatePicker';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { formatDateTime } from '@/shared/lib/format';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
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
} from '@/features/audit/auditLogic';
import { usePlatformAsociatiiStore } from './platformAsociatiiStore';
import { usePlatformAuditStore } from './platformAuditStore';
import { DEMO_PLATFORM_ASOCIATII } from './demoPlatform';
import { hydrateAllAuditLogs } from './platformApi';

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
  'breach.authority_notified': 'success',
  'breach.residents_notified': 'success',
  'breach.closed': 'neutral',
  'announcement.published': 'success',
  'apartment.created': 'success',
  'apartment.updated': 'neutral',
  'apartment.deleted': 'danger',
  'building.updated': 'neutral',
  'asociatie.provisioned': 'success',
  'asociatie.suspended': 'warning',
  'asociatie.reactivated': 'success',
  'asociatie.archived': 'neutral',
  'admin.provisioned': 'success',
  'admin.invite_revoked': 'danger',
  'admin.access_revoked': 'danger',
  'document.uploaded': 'success',
  'document.deleted': 'danger',
  'ticket.submitted': 'success',
  'ticket.advanced': 'neutral',
  'aga.scheduled': 'success',
  'aga.opened': 'success',
  'aga.closed': 'neutral',
  'budget.proposed': 'success',
  'petition.created': 'success',
  'petition.forwarded': 'success',
  'impersonation.started': 'warning',
  'impersonation.ended': 'neutral',
  'platform.admin_invited': 'success',
  'platform.admin_revoked': 'danger',
  'broadcast.published': 'success',
  'broadcast.expired': 'neutral',
  'feature.override_enabled': 'success',
  'feature.override_disabled': 'warning',
  'auth.rate_limited': 'warning',
  'auth.locked_out': 'danger',
  'platform.mfa_reset': 'warning',
};

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
 * Platform superadmin audit viewer (T95): aggregate every asociație's
 * hash-chained audit log platform-wide, show per-asociație chain-integrity
 * badges, and provide the same T09 filters plus an asociație filter.
 * Read-only; cross-tenant access is granted via the super_admin RLS policy.
 */
export default function PlatformAuditPage() {
  const { t } = useTranslation();
  const chains = usePlatformAuditStore((s) => s.chains);
  const fetchError = usePlatformAuditStore((s) => s.fetchError);
  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);
  const [isHydrating, setIsHydrating] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setIsHydrating(true);
    void hydrateAllAuditLogs().finally(() => setIsHydrating(false));
  }, []);

  const retry = () => {
    setIsHydrating(true);
    void hydrateAllAuditLogs().finally(() => setIsHydrating(false));
  };

  const [selectedAsocId, setSelectedAsocId] = useState<string>('all');
  const [action, setAction] = useState<AuditAction | 'all'>('all');
  const [entity, setEntity] = useState<AuditEntity | 'all'>('all');
  const [actor, setActor] = useState('');
  const [text, setText] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const clearFilters = () => {
    setSelectedAsocId('all');
    setAction('all');
    setEntity('all');
    setActor('');
    setText('');
    setFrom('');
    setTo('');
  };

  const allEntries = useMemo(() => {
    const entries = selectedAsocId === 'all'
      ? Object.values(chains).flat()
      : (chains[selectedAsocId] ?? []);
    return sortBySeqDesc(filterEntries(entries, { action, entity, actor, text, from, to }));
  }, [chains, selectedAsocId, action, entity, actor, text, from, to]);

  const chainIds = useMemo(() => Object.keys(chains), [chains]);

  const integrityByAsoc = useMemo(() => {
    const result: Record<string, ReturnType<typeof verifyChain>> = {};
    for (const id of chainIds) {
      result[id] = verifyChain(chains[id] ?? []);
    }
    return result;
  }, [chains, chainIds]);

  const allOk = useMemo(() => chainIds.every((id) => integrityByAsoc[id]?.ok), [chainIds, integrityByAsoc]);

  const knownAsociatii = asociatii.length > 0 ? asociatii : DEMO_PLATFORM_ASOCIATII;

  function asocName(id: string): string {
    return knownAsociatii.find((a) => a.id === id)?.name ?? id;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const exportJson = () =>
    downloadText(`audit-platform-${stamp}.json`, auditToJson(allEntries), 'application/json');
  const exportCsv = () =>
    downloadText(`audit-platform-${stamp}.csv`, auditToCsv(allEntries), 'text/csv;charset=utf-8');

  return (
    <div>
      <PageHeader
        title={t('platform.audit.title')}
        subtitle={t('platform.audit.subtitle')}
      />

      {fetchError ? (
        <ErrorState
          body={t('platform.audit.fetchError')}
          action={
            <Button onClick={retry} variant="secondary" size="sm">
              <RefreshCw size={14} /> {t('platform.audit.retry')}
            </Button>
          }
        />
      ) : null}

      {/* Per-asociatie integrity badges */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {allOk ? (
            <Badge tone="success">
              <ShieldCheck size={14} /> {t('platform.audit.chainSummaryOk')}
            </Badge>
          ) : (
            <Badge tone="danger">
              <ShieldX size={14} /> {t('platform.audit.chainSummaryBroken')}
            </Badge>
          )}
          {chainIds.map((id) => {
            const check = integrityByAsoc[id];
            if (!check) return null;
            return (
              <span key={id} className="text-sm text-muted flex items-center gap-1">
                {check.ok
                  ? <ShieldCheck size={13} className="text-success" />
                  : <ShieldX size={13} className="text-danger" />}
                {asocName(id)}
                {!check.ok && (
                  <span className="text-danger">
                    {' '}({t('audit.integrityBroken', { seq: check.brokenAt })})
                  </span>
                )}
              </span>
            );
          })}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportJson} disabled={!allEntries.length}>
              <Download size={15} /> JSON
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!allEntries.length}>
              <Download size={15} /> CSV
            </Button>
          </div>
        </div>
        {isHydrating && (
          <p className="mt-2 text-sm text-muted">{t('platform.audit.loading')}</p>
        )}
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label={t('platform.audit.filterAsociatie')}
            value={selectedAsocId}
            onChange={(e) => setSelectedAsocId(e.target.value)}
          >
            <option value="all">{t('platform.audit.allAsociatii')}</option>
            {chainIds.map((id) => (
              <option key={id} value={id}>{asocName(id)}</option>
            ))}
          </Select>
          <Select
            label={t('audit.filterAction')}
            value={action}
            onChange={(e) => setAction(e.target.value as AuditAction | 'all')}
          >
            <option value="all">{t('audit.allActions')}</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>{t(`audit.action.${a}`)}</option>
            ))}
          </Select>
          <Select
            label={t('audit.filterEntity')}
            value={entity}
            onChange={(e) => setEntity(e.target.value as AuditEntity | 'all')}
          >
            <option value="all">{t('audit.allEntities')}</option>
            {AUDIT_ENTITIES.map((en) => (
              <option key={en} value={en}>{t(`audit.entity.${en}`)}</option>
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
          <DatePicker label={t('audit.from')} value={from} onChange={(v) => setFrom(v)} />
          <DatePicker label={t('audit.to')} value={to} onChange={(v) => setTo(v)} />
        </div>
        <div className="mt-3">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            {t('audit.clear')}
          </Button>
        </div>
      </Card>

      {/* Entries */}
      {allEntries.length === 0 ? (
        <EmptyState icon={<History size={22} />} body={t('audit.empty')} />
      ) : (
        <ul className="audit-list">
          {allEntries.map((e) => (
            <li key={`${e.asociatie_id}-${e.id}`} className="audit-row">
              <div className="audit-row__head">
                <Badge tone={ACTION_TONE[e.action]}>{t(`audit.action.${e.action}`)}</Badge>
                <span className="audit-row__entity">
                  <ScrollText size={14} /> {t(`audit.entity.${e.entity}`)}: {e.entity_label}
                </span>
                <span className="text-sm text-muted audit-row__when">{formatDateTime(e.at)}</span>
              </div>
              <p className="text-sm text-muted audit-row__meta">
                <span className="audit-row__actor">{e.actor_name}</span>
                {selectedAsocId === 'all' && (
                  <span className="audit-row__asoc"> · {asocName(e.asociatie_id)}</span>
                )}
                {(e.before !== null || e.after !== null) && (
                  <span className="audit-row__change">
                    {' · '}
                    {e.before !== null ? e.before : '∅'} {'→'} {e.after !== null ? e.after : '∅'}
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
