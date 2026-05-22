import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Repeat, Wrench, Building2, CalendarClock, Check, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { useAsociatieTickets } from '@/features/tickets/ticketsStore';
import { useRecurringStore } from './recurringStore';
import {
  detectRecurring,
  RECURRING_WINDOW_DAYS,
  type RecurringIssue,
} from './recurringLogic';

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function RecurringPage() {
  const { t } = useTranslation();
  const items = useAsociatieTickets();
  const acknowledged = useRecurringStore((s) => s.acknowledged);
  const toggleAck = useRecurringStore((s) => s.toggleAck);

  const issues = useMemo(() => detectRecurring(items), [items]);

  // Active issues float above acknowledged ("known") ones; detection order is
  // preserved within each group.
  const ordered = useMemo(() => {
    const known = (k: string) => acknowledged.includes(k);
    return [...issues].sort((a, b) => Number(known(a.key)) - Number(known(b.key)));
  }, [issues, acknowledged]);

  const activeCount = issues.filter((i) => !acknowledged.includes(i.key)).length;

  const Issue = ({ issue }: { issue: RecurringIssue }) => {
    const known = acknowledged.includes(issue.key);
    const structural = issue.suggestion === 'structural';
    return (
      <Card className={cn('space-y-3 p-4', known && 'opacity-60')}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              {capitalize(issue.category)} · {issue.location}
            </h2>
            <p className="text-sm text-muted">
              {t(`tickets.severity_${issue.maxSeverity}`)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {known && <Badge tone="neutral">{t('recurring.known')}</Badge>}
            <Badge tone={structural ? 'danger' : 'warning'}>
              {t('recurring.timesInWindow', { count: issue.count, days: RECURRING_WINDOW_DAYS })}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span className="flex items-center gap-1">
            <CalendarClock className="h-4 w-4" />
            {t('recurring.dateRange', {
              first: formatDate(issue.firstAt),
              last: formatDate(issue.lastAt),
            })}
          </span>
        </div>

        <div
          className={cn(
            'flex items-start gap-2 rounded-lg p-3 text-sm',
            structural ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning',
          )}
        >
          {structural ? (
            <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Wrench className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>
            <span className="font-medium">{t('recurring.suggestionLabel')}: </span>
            {t(`recurring.suggestion_${issue.suggestion}`)}
          </span>
        </div>

        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => toggleAck(issue.key)}>
            {known ? (
              <>
                <RotateCcw className="h-4 w-4" /> {t('recurring.reactivate')}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> {t('recurring.markKnown')}
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <PageHeader title={t('recurring.title')} subtitle={t('recurring.subtitle')} />

      {issues.length === 0 ? (
        <EmptyState body={t('recurring.empty')} icon={<Repeat className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {activeCount > 0 && (
            <Card className="flex items-center gap-3 bg-warning/10 p-3 text-sm text-warning">
              <Repeat className="h-4 w-4 shrink-0" />
              <span>{t('recurring.banner', { count: activeCount })}</span>
            </Card>
          )}
          {ordered.map((issue) => (
            <Issue key={issue.key} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
