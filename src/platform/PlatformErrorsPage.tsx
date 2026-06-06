import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { DatePicker } from '@/shared/components/DatePicker';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { formatDateTime } from '@/shared/lib/format';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { groupReports, usePlatformErrorStore } from './platformErrorStore';
import { hydrateErrorReports } from './platformApi';

/**
 * Platform superadmin error feed (T96): aggregated scrubbed error reports
 * forwarded by the T82 sink, grouped by error class + source and filterable
 * by search text and date range. Read-only; super_admin RLS restricts access.
 */
export default function PlatformErrorsPage() {
  const { t } = useTranslation();
  const reports = usePlatformErrorStore((s) => s.reports);
  const fetchError = usePlatformErrorStore((s) => s.fetchError);
  const [isHydrating, setIsHydrating] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setIsHydrating(true);
    void hydrateErrorReports().finally(() => setIsHydrating(false));
  }, []);

  const retry = () => {
    setIsHydrating(true);
    void hydrateErrorReports().finally(() => setIsHydrating(false));
  };

  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const clearFilters = () => {
    setSearch('');
    setFrom('');
    setTo('');
  };

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = from ? new Date(from).getTime() : 0;
    const toMs = to ? new Date(to + 'T23:59:59Z').getTime() : Infinity;
    return reports.filter((r) => {
      if (r.at < fromMs || r.at > toMs) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.message.toLowerCase().includes(q) ||
        (r.source ?? '').toLowerCase().includes(q)
      );
    });
  }, [reports, search, from, to]);

  const groups = useMemo(() => groupReports(filteredReports), [filteredReports]);

  const totalCount = reports.length;

  return (
    <div>
      <PageHeader
        title={t('platform.errors.title')}
        subtitle={t('platform.errors.subtitle')}
      />

      {fetchError ? (
        <ErrorState
          body={t('platform.errors.fetchError')}
          action={
            <Button onClick={retry} variant="secondary" size="sm">
              <RefreshCw size={14} /> {t('platform.errors.retry')}
            </Button>
          }
        />
      ) : null}

      {/* Summary bar */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={totalCount === 0 ? 'success' : 'warning'}>
            <TriangleAlert size={13} />
            {totalCount === 0
              ? t('platform.errors.noErrors')
              : t('platform.errors.reportCount', { count: totalCount })}
          </Badge>
          <Badge tone="neutral">
            {t('platform.errors.groupCount', { count: groups.length })}
          </Badge>
          {isHydrating && (
            <span className="text-sm text-muted">{t('platform.errors.loading')}</span>
          )}
        </div>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label={t('platform.errors.filterSearch')}
            placeholder={t('platform.errors.filterSearchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <DatePicker
            label={t('audit.from')}
            value={from}
            onChange={(v) => setFrom(v)}
          />
          <DatePicker
            label={t('audit.to')}
            value={to}
            onChange={(v) => setTo(v)}
          />
        </div>
        <div className="mt-3">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            {t('audit.clear')}
          </Button>
        </div>
      </Card>

      {/* Group list */}
      {groups.length === 0 ? (
        <EmptyState icon={<AlertCircle size={22} />} body={t('platform.errors.empty')} />
      ) : (
        <ul className="audit-list">
          {groups.map((g) => (
            <li key={g.key} className="audit-row">
              <div className="audit-row__head">
                <Badge tone="warning">{g.name}</Badge>
                {g.count > 1 && (
                  <Badge tone="neutral">
                    {t('platform.errors.occurrences', { count: g.count })}
                  </Badge>
                )}
                {g.source && (
                  <span className="audit-row__entity text-sm text-muted">{g.source}</span>
                )}
              </div>
              <p className="text-sm audit-row__meta" style={{ marginTop: 4 }}>
                {g.message}
              </p>
              <p className="text-sm text-muted audit-row__meta" style={{ marginTop: 4 }}>
                {t('platform.errors.firstSeen')}: {formatDateTime(new Date(g.firstAt).toISOString())}
                {' · '}
                {t('platform.errors.lastSeen')}: {formatDateTime(new Date(g.lastAt).toISOString())}
              </p>
              <p className="text-sm text-muted iv-mono" style={{ marginTop: 2 }}>
                {g.refs.slice(0, 5).join(' · ')}
                {g.refs.length > 5 && ` (+${g.refs.length - 5})`}
              </p>
              {(g.releases.length > 0 || g.stages.length > 0) && (
                <p className="text-xs text-muted iv-mono" style={{ marginTop: 2 }}>
                  {g.releases.length > 0 && (
                    <span>{t('platform.errors.release')}: {g.releases.join(', ')}</span>
                  )}
                  {g.releases.length > 0 && g.stages.length > 0 && <span>{' · '}</span>}
                  {g.stages.length > 0 && (
                    <span>{t('platform.errors.stage')}: {g.stages.join(', ')}</span>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
