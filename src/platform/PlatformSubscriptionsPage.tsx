import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, CreditCard } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate } from '@/shared/lib/format';
import { statusTone, findPlanById, BILLING_PLANS } from '@/features/billing/billingLogic';
import type { SubscriptionStatus } from '@/shared/types/domain';
import {
  usePlatformSubscriptionsStore,
  useSubscriptionSummary,
} from './platformSubscriptionsStore';

const STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due', 'unpaid', 'canceled'];

export default function PlatformSubscriptionsPage() {
  const { t } = useTranslation();
  const rows = usePlatformSubscriptionsStore((s) => s.rows);
  const markPaid = usePlatformSubscriptionsStore((s) => s.markPaid);
  const summary = useSubscriptionSummary();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchSearch =
        !q || r.asociatie_name.toLowerCase().includes(q) || r.city.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === 'all' || r.subscription.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [rows, search, statusFilter]);

  return (
    <div>
      <PageHeader
        title={t('platform.subscriptions.title')}
        subtitle={t('platform.subscriptions.subtitle')}
      />

      {/* Summary bar */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="success">
            <CheckCircle2 size={13} />
            {t('platform.subscriptions.activeCount', { count: summary.active })}
          </Badge>
          <Badge tone="primary">
            {t('platform.subscriptions.trialingCount', { count: summary.trialing })}
          </Badge>
          <Badge tone="warning">
            {t('platform.subscriptions.pastDueCount', { count: summary.past_due })}
          </Badge>
          <Badge tone="danger">
            {t('platform.subscriptions.unpaidCount', { count: summary.unpaid })}
          </Badge>
          <Badge tone="neutral">
            {t('platform.subscriptions.canceledCount', { count: summary.canceled })}
          </Badge>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          placeholder={t('platform.subscriptions.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
          aria-label={t('platform.subscriptions.searchPlaceholder')}
        />
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | 'all')}
          aria-label={t('platform.subscriptions.filterStatus')}
        >
          <option value="all">{t('platform.subscriptions.allStatuses')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`billing.status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Subscription list */}
      {filtered.length === 0 ? (
        <EmptyState
          title={t('platform.subscriptions.empty')}
          body=""
          icon={<CreditCard size={32} />}
        />
      ) : (
        <Card>
          <table className="billing-invoices-table">
            <thead>
              <tr>
                <th>{t('platform.subscriptions.colAsociatie')}</th>
                <th>{t('platform.subscriptions.colPlan')}</th>
                <th>{t('platform.subscriptions.colStatus')}</th>
                <th>{t('platform.subscriptions.colPeriod')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sub = r.subscription;
                const plan = findPlanById(BILLING_PLANS, sub.plan_id);
                return (
                  <tr key={sub.id}>
                    <td>
                      <div className="font-medium">{r.asociatie_name}</div>
                      <div className="text-muted text-sm">{r.city}</div>
                    </td>
                    <td>{plan ? plan.name_ro : sub.plan_id}</td>
                    <td>
                      <Badge tone={statusTone(sub.status)}>
                        {t(`billing.status.${sub.status}`)}
                      </Badge>
                    </td>
                    <td>
                      {formatDate(sub.current_period_start)} -{' '}
                      {formatDate(sub.current_period_end)}
                    </td>
                    <td>
                      {sub.status === 'past_due' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => markPaid(sub.id)}
                        >
                          {t('platform.subscriptions.markPaid')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
