import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wrench } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate, formatLei } from '@/shared/lib/format';
import type { RepairRecord, RepairSystem } from '@/shared/types/domain';
import { DEMO_REPAIRS } from '@/shared/demo/demoData';
import { searchRepairs, warrantyStatus, type WarrantyStatus } from './repairLogic';

const SYSTEMS: RepairSystem[] = ['apa', 'electric', 'lift', 'incalzire', 'structura', 'altele'];
const warrantyTone: Record<WarrantyStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
  none: 'neutral',
};

export default function RepairsPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [system, setSystem] = useState<RepairSystem | 'all'>('all');
  const results = searchRepairs(DEMO_REPAIRS, query, system).sort(
    (a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime(),
  );

  return (
    <div>
      <PageHeader title={t('repairs.title')} subtitle={t('repairs.subtitle')} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          aria-label={t('common.search')}
          placeholder={t('repairs.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          aria-label={t('repairs.system')}
          value={system}
          onChange={(e) => setSystem(e.target.value as RepairSystem | 'all')}
        >
          <option value="all">{t('common.all')}</option>
          {SYSTEMS.map((s) => (
            <option key={s} value={s}>
              {t(`repairs.system_${s}`)}
            </option>
          ))}
        </Select>
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('repairs.empty')} icon={<Wrench className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((r: RepairRecord) => {
            const w = warrantyStatus(r.warranty_until);
            return (
              <Card key={r.id}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{r.title}</h2>
                  <Badge tone="primary">{t(`repairs.system_${r.system}`)}</Badge>
                </div>
                <p className="mb-2 whitespace-pre-line text-text">{r.description}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted sm:grid-cols-4">
                  <div>
                    <dt className="font-medium text-text">{t('repairs.performedAt')}</dt>
                    <dd>{formatDate(r.performed_at)}</dd>
                  </div>
                  {r.contractor && (
                    <div>
                      <dt className="font-medium text-text">{t('repairs.contractor')}</dt>
                      <dd>{r.contractor}</dd>
                    </div>
                  )}
                  {r.cost != null && (
                    <div>
                      <dt className="font-medium text-text">{t('repairs.cost')}</dt>
                      <dd>{formatLei(r.cost)}</dd>
                    </div>
                  )}
                  {r.warranty_until && (
                    <div>
                      <dt className="font-medium text-text">{t('repairs.warranty')}</dt>
                      <dd>
                        <Badge tone={warrantyTone[w]}>
                          {formatDate(r.warranty_until)} · {t(`repairs.warranty_${w}`)}
                        </Badge>
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
