import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, RefreshCw, Users } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { formatDate } from '@/shared/lib/format';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  computeRollup,
  usePlatformUsageStore,
  type HealthStatus,
} from './platformUsageStore';
import { hydrateUsageMetrics } from './platformApi';

function healthTone(status: HealthStatus): 'success' | 'warning' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'moderate') return 'warning';
  return 'danger';
}

export default function PlatformUsagePage() {
  const { t } = useTranslation();
  const metrics = usePlatformUsageStore((s) => s.metrics);
  const fetchError = usePlatformUsageStore((s) => s.fetchError);
  const [isHydrating, setIsHydrating] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setIsHydrating(true);
    void hydrateUsageMetrics().finally(() => setIsHydrating(false));
  }, []);

  const retry = () => {
    setIsHydrating(true);
    void hydrateUsageMetrics().finally(() => setIsHydrating(false));
  };

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return metrics;
    return metrics.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.city.toLowerCase().includes(q),
    );
  }, [metrics, search]);

  const rollup = useMemo(() => computeRollup(metrics), [metrics]);

  return (
    <div>
      <PageHeader
        title={t('platform.usage.title')}
        subtitle={t('platform.usage.subtitle')}
      />

      {fetchError ? (
        <ErrorState
          body={t('platform.usage.fetchError')}
          action={
            <Button onClick={retry} variant="secondary" size="sm">
              <RefreshCw size={14} /> {t('platform.usage.retry')}
            </Button>
          }
        />
      ) : null}

      {/* Summary bar */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="success">
            <Activity size={13} />
            {t('platform.usage.activeCount', { count: rollup.active })}
          </Badge>
          {rollup.moderate > 0 && (
            <Badge tone="warning">
              {t('platform.usage.moderateCount', { count: rollup.moderate })}
            </Badge>
          )}
          {rollup.dormant > 0 && (
            <Badge tone="danger">
              {t('platform.usage.dormantCount', { count: rollup.dormant })}
            </Badge>
          )}
          <Badge tone="neutral">
            <Users size={13} />
            {t('platform.usage.totalMembers', { count: rollup.totalMembers })}
          </Badge>
          {isHydrating && (
            <span className="text-sm text-muted">{t('platform.usage.loading')}</span>
          )}
        </div>
      </Card>

      {/* Filter */}
      <Card className="mb-6">
        <Input
          label={t('platform.usage.filterSearch')}
          placeholder={t('platform.usage.filterSearchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
              {t('audit.clear')}
            </Button>
          </div>
        )}
      </Card>

      {/* Per-asociatie list */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Activity size={22} />} body={t('platform.usage.empty')} />
      ) : (
        <ul className="audit-list">
          {filtered.map((m) => (
            <li key={m.asociatie_id} className="audit-row">
              <div className="audit-row__head">
                <span className="font-medium">{m.name}</span>
                {m.city && (
                  <span className="text-sm text-muted">{m.city}</span>
                )}
                <Badge tone={healthTone(m.healthStatus)}>
                  {t(`platform.usage.status.${m.healthStatus}`)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                <span className="text-sm text-muted">
                  {t('platform.usage.membersCount', { count: m.members })}
                </span>
                <span className="text-sm text-muted">
                  {t('platform.usage.apartmentsCount', { count: m.apartments })}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-1">
                <span className="text-sm text-muted">
                  {t('platform.usage.announcements30d', { count: m.recentAnnouncements })}
                </span>
                <span className="text-sm text-muted">
                  {t('platform.usage.tickets30d', { count: m.recentTickets })}
                </span>
                <span className="text-sm text-muted">
                  {t('platform.usage.votes30d', { count: m.recentVotes })}
                </span>
              </div>
              {m.lastAdminSignInAt ? (
                <p className="text-sm text-muted mt-1">
                  {t('platform.usage.lastSignIn', {
                    date: formatDate(m.lastAdminSignInAt),
                  })}
                </p>
              ) : (
                <p className="text-sm text-muted mt-1">
                  {t('platform.usage.neverSignedIn')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
