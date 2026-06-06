import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, TriangleAlert } from 'lucide-react';
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
import { useAuthStore } from '@/shared/store/authStore';
import { type ResolvedFrame } from '@/shared/lib/sourcemapUtils';
import { groupReports, usePlatformErrorStore } from './platformErrorStore';
import { hydrateErrorReports } from './platformApi';

interface SymbolicationState {
  loading: boolean;
  frames: ResolvedFrame[] | null;
  error: string | null;
}

async function callSymbolicate(
  stack: string,
  release: string,
  token: string,
): Promise<{ ok: boolean; frames?: ResolvedFrame[]; error?: string }> {
  try {
    const resp = await fetch('/.netlify/functions/symbolicate-stack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stack, release }),
    });
    const data = (await resp.json()) as Record<string, unknown>;
    if (!resp.ok) return { ok: false, error: String(data.error ?? 'failed') };
    return { ok: true, frames: data.frames as ResolvedFrame[] };
  } catch {
    return { ok: false, error: 'network' };
  }
}

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
  const [expandedStack, setExpandedStack] = useState<string | null>(null);
  const [symbolication, setSymbolication] = useState<Record<string, SymbolicationState>>({});
  const symbolicatingRef = useRef<Set<string>>(new Set());

  const clearFilters = () => {
    setSearch('');
    setFrom('');
    setTo('');
  };

  const handleSymbolicate = async (groupKey: string, stack: string, release: string) => {
    if (symbolicatingRef.current.has(groupKey)) return;
    symbolicatingRef.current.add(groupKey);
    setSymbolication((prev) => ({
      ...prev,
      [groupKey]: { loading: true, frames: null, error: null },
    }));
    const token = useAuthStore.getState().session?.access_token ?? '';
    const result = await callSymbolicate(stack, release, token);
    symbolicatingRef.current.delete(groupKey);
    setSymbolication((prev) => ({
      ...prev,
      [groupKey]: {
        loading: false,
        frames: result.ok ? (result.frames ?? null) : null,
        error: result.ok ? null : (result.error ?? 'failed'),
      },
    }));
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

              {/* Stack trace section */}
              {g.stack && (
                <div style={{ marginTop: 6 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedStack(expandedStack === g.key ? null : g.key)
                    }
                  >
                    {expandedStack === g.key ? (
                      <><ChevronUp size={13} /> {t('platform.errors.hideStack')}</>
                    ) : (
                      <><ChevronDown size={13} /> {t('platform.errors.showStack')}</>
                    )}
                  </Button>

                  {expandedStack === g.key && (
                    <div style={{ marginTop: 6 }}>
                      {/* Symbolication controls */}
                      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                        {isSupabaseConfigured && g.latestRelease ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={symbolication[g.key]?.loading}
                            onClick={() =>
                              void handleSymbolicate(g.key, g.stack!, g.latestRelease!)
                            }
                          >
                            {symbolication[g.key]?.loading
                              ? t('platform.errors.symbolicating')
                              : t('platform.errors.symbolicate')}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted">
                            {t('platform.errors.mapsUnavailable')}
                          </span>
                        )}
                        {symbolication[g.key]?.error && (
                          <span className="text-xs text-error">
                            {t('platform.errors.symbolicateError')}
                          </span>
                        )}
                      </div>

                      {/* Resolved frames */}
                      {symbolication[g.key]?.frames && (
                        <div style={{ marginBottom: 8 }}>
                          <p className="text-xs text-muted" style={{ marginBottom: 4 }}>
                            {t('platform.errors.symbolicated')}
                          </p>
                          <pre
                            className="iv-mono text-xs"
                            style={{
                              background: 'var(--color-surface-2, rgba(0,0,0,.15))',
                              borderRadius: 6,
                              padding: '8px 10px',
                              overflowX: 'auto',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                            }}
                          >
                            {symbolication[g.key]!.frames!
                              .map((f) =>
                                f.source
                                  ? `${f.name ?? ''} (${f.source}:${f.line ?? '?'}:${f.col ?? '?'})`.trim()
                                  : f.raw,
                              )
                              .join('\n')}
                          </pre>
                        </div>
                      )}

                      {/* Raw stack */}
                      <p className="text-xs text-muted" style={{ marginBottom: 4 }}>
                        {t('platform.errors.rawStack')}
                      </p>
                      <pre
                        className="iv-mono text-xs"
                        style={{
                          background: 'var(--color-surface-2, rgba(0,0,0,.15))',
                          borderRadius: 6,
                          padding: '8px 10px',
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {g.stack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
