import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { formatLei } from '@/shared/lib/format';
import { isValidFundInputs, recommend, type FundInputs } from './repairFundLogic';

export default function RepairFundPage() {
  const { t } = useTranslation();

  const [area, setArea] = useState('2400');
  const [yearBuilt, setYearBuilt] = useState('1985');
  const [lastWorks, setLastWorks] = useState('');
  const [currentMonthly, setCurrentMonthly] = useState('600');

  const inputs: FundInputs = {
    areaSqm: Number(area),
    yearBuilt: Number(yearBuilt),
    lastMajorWorksYear: lastWorks.trim() === '' ? null : Number(lastWorks),
    currentMonthly: Number(currentMonthly),
  };
  const valid = isValidFundInputs(inputs);
  const result = valid ? recommend(inputs) : null;

  return (
    <div>
      <PageHeader title={t('repairfund.title')} subtitle={t('repairfund.subtitle')} />

      <Card className="mb-4 space-y-4 p-4">
        <Input label={t('repairfund.area')} type="number" min={0} value={area} onChange={(e) => setArea(e.target.value)} />
        <Input label={t('repairfund.yearBuilt')} type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />
        <Input
          label={t('repairfund.lastWorks')}
          type="number"
          value={lastWorks}
          placeholder={t('repairfund.lastWorksHint')}
          onChange={(e) => setLastWorks(e.target.value)}
        />
        <Input label={t('repairfund.currentMonthly')} type="number" min={0} value={currentMonthly} onChange={(e) => setCurrentMonthly(e.target.value)} />
      </Card>

      {!result ? (
        <Card className="flex items-center gap-3 p-4 text-muted">
          <Calculator className="h-5 w-5" /> {t('repairfund.invalid')}
        </Card>
      ) : (
        <Card className="space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted">{t('repairfund.recommended')}</span>
            <span className="text-2xl font-semibold text-text">{formatLei(result.recommendedMonthly)}</span>
          </div>
          <p className="text-sm text-muted">{t('repairfund.ratePerSqm', { rate: result.ratePerSqm.toFixed(2) })}</p>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-sm text-muted">{t('repairfund.current')}</span>
            <span className="text-text">{formatLei(Math.round(inputs.currentMonthly))}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">{t('repairfund.gap')}</span>
            {result.gap > 0 ? (
              <Badge tone="warning">{t('repairfund.under', { amount: formatLei(result.gap) })}</Badge>
            ) : (
              <Badge tone="success">{t('repairfund.ok')}</Badge>
            )}
          </div>

          <p className="border-t border-border pt-3 text-xs text-muted">
            {t('repairfund.rationale', {
              base: result.base.toFixed(2),
              age: result.ageComponent.toFixed(2),
              works: result.worksComponent.toFixed(2),
            })}
          </p>
        </Card>
      )}
    </div>
  );
}
